from uuid import uuid4
import json
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
import boto3
import os
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Form, Body
from fastapi.responses import JSONResponse
from mangum import Mangum
from PIL import Image
from io import BytesIO
import logging
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit
from sqlalchemy.orm import Session
from typing import Any
import models
from dependencies import get_current_user
from dateutil.relativedelta import relativedelta
from database import engine, get_db, init_db
from cryptography.fernet import Fernet
from bedrock_validator import BedrockValidator, ValidationResult
from base64 import b64decode

# Initialize the Bedrock validator
bedrock_validator = BedrockValidator()

# Initialize database tables
init_db()

app = FastAPI(
    title="Pupper API",
    description="API for uploading and managing dog images, breeds, and metadata.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure maximum file size for uploads
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class LimitUploadSizeMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_upload_size: int):
        super().__init__(app)
        self.max_upload_size = max_upload_size

    async def dispatch(self, request: Request, call_next):
        if request.method == "POST":
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > self.max_upload_size:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"File too large. Maximum size is {self.max_upload_size // (1024*1024)}MB"}
                )
        return await call_next(request)

app.add_middleware(LimitUploadSizeMiddleware, max_upload_size=50 * 1024 * 1024)  # 50MB
handler = Mangum(app, lifespan="off", api_gateway_base_path=None)

# Initialize Powertools
logger = Logger()
# Conditional tracer for local vs Lambda
try:
    from aws_lambda_powertools import Tracer

    tracer = Tracer()
except ImportError:
    # Mock tracer for local development
    class MockTracer:
        def capture_method(self, func):
            return func


    tracer = MockTracer()
metrics = Metrics()

# Initialize S3 client and bucket name
s3_client = boto3.client("s3")
BUCKET_NAME = os.environ.get("BUCKET_NAME", "ai-lm-east-1-683745069003")

# Initialize Fernet
FERNET_KEY = os.environ.get('FERNET_KEY')
fernet = Fernet(FERNET_KEY.encode()) if FERNET_KEY else None
print("FERNET_KEY loaded:", bool(FERNET_KEY))


def encrypt_name(name: str) -> str:
    if not fernet or not name:
        return name
    return fernet.encrypt(name.encode()).decode()


def decrypt_name(name: str) -> str:
    if not fernet or not name:
        return name
    try:
        return fernet.decrypt(name.encode()).decode()
    except Exception:
        return name


def publish_dog_event(event_type: str, data: dict):
    """Publish dog event to SNS topic"""
    try:
        topic_arn = os.environ.get("DOG_EVENTS_TOPIC_ARN")
        if topic_arn:
            sns_client = boto3.client("sns")
            message = {
                "event_type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat()
            }
            sns_client.publish(
                TopicArn=topic_arn,
                Message=json.dumps(message)
            )
            logger.info(f"Published event: {event_type}")
    except Exception as e:
        logger.error(f"Failed to publish event: {e}")


@app.get("/")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/test/validate_dog_data")
async def test_validate_dog_data(
        name: str = Form(None),
        shelter_name: str = Form(None),
        city: str = Form(None),
        state: str = Form(None),
        species: str = Form(None),
        shelter_entry_date: str = Form(None),
        description: str = Form(None),
        birthday: str = Form(None),
        weight: Any = Form(None),
        color: str = Form(None)
):
    """
    Test endpoint for Bedrock validation without authentication.
    This endpoint only validates data, doesn't create database records or upload images.
    """
    # Prepare data for validation
    dog_data = {
        'name': name,
        'shelter_name': shelter_name,
        'city': city,
        'state': state,
        'species': species,
        'description': description,
        'color': color,
        'weight': weight,
        'birthday': birthday,
        'shelter_entry_date': shelter_entry_date
    }

    # Validate and clean data using Bedrock
    logger.info("Testing Bedrock validation with sample data")
    validation_results = bedrock_validator.validate_dog_data_batch_with_bedrock(dog_data)

    # Get cleaned data
    cleaned_data = bedrock_validator.get_cleaned_data(validation_results)

    # Check if breed validation passed (must be Labrador Retriever)
    species_result = validation_results.get('species')
    if species_result and not species_result.is_valid:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid breed",
                "message": "Only Labrador Retrievers are accepted. Please ensure the dog is a Labrador Retriever.",
                "original_species": species_result.original_value,
                "validation_details": species_result.error_message
            }
        )

    # Prepare response with validation summary
    validation_summary = {
        "total_fields": len(validation_results),
        "valid_fields": len([r for r in validation_results.values() if r.is_valid]),
        "warnings": []
    }

    for field, result in validation_results.items():
        if result.warnings:
            validation_summary["warnings"].extend([f"{field}: {w}" for w in result.warnings])

    return {
        "message": "Data validation completed successfully",
        "validation_summary": validation_summary,
        "cleaned_data": {k: v for k, v in cleaned_data.items() if v is not None},
        "original_data": dog_data,
        "validation_details": {
            field: {
                "original": result.original_value,
                "cleaned": result.value,
                "valid": result.is_valid,
                "confidence": result.confidence,
                "warnings": result.warnings,
                "error": result.error_message
            } for field, result in validation_results.items()
        }
    }


@app.post("/test/simple_validation")
async def test_simple_validation(
        name: str = Form(None),
        shelter_name: str = Form(None),
        city: str = Form(None),
        state: str = Form(None),
        species: str = Form(None),
        shelter_entry_date: str = Form(None),
        description: str = Form(None),
        birthday: str = Form(None),
        weight: Any = Form(None),
        color: str = Form(None)
):
    """
    Simple validation endpoint that doesn't use Bedrock - for testing when Bedrock is not available.
    """
    # Prepare data for validation
    dog_data = {
        'name': name,
        'shelter_name': shelter_name,
        'city': city,
        'state': state,
        'species': species,
        'description': description,
        'color': color,
        'weight': weight,
        'birthday': birthday,
        'shelter_entry_date': shelter_entry_date
    }

    # Simple validation logic without Bedrock
    validation_results = {}

    # Validate species (must be Labrador Retriever)
    if species:
        is_labrador = species.lower().strip() in ['labrador retriever', 'labrador', 'lab']
        validation_results['species'] = {
            'original': species,
            'cleaned': species.strip() if is_labrador else None,
            'valid': is_labrador,
            'confidence': 1.0 if is_labrador else 0.0,
            'warnings': [],
            'error': None if is_labrador else "Only Labrador Retrievers are accepted"
        }
    else:
        validation_results['species'] = {
            'original': None,
            'cleaned': None,
            'valid': False,
            'confidence': 0.0,
            'warnings': [],
            'error': "Species is required"
        }

    # Simple weight parsing
    if weight:
        weight_str = str(weight).lower().strip()
        # Try to extract numbers
        import re
        numbers = re.findall(r'\d+\.?\d*', weight_str)
        if numbers:
            try:
                parsed_weight = float(numbers[0])
                validation_results['weight'] = {
                    'original': weight,
                    'cleaned': parsed_weight,
                    'valid': True,
                    'confidence': 0.8,
                    'warnings': ['Simple parsing used'],
                    'error': None
                }
            except:
                validation_results['weight'] = {
                    'original': weight,
                    'cleaned': None,
                    'valid': False,
                    'confidence': 0.0,
                    'warnings': [],
                    'error': "Could not parse weight"
                }
        else:
            validation_results['weight'] = {
                'original': weight,
                'cleaned': None,
                'valid': False,
                'confidence': 0.0,
                'warnings': [],
                'error': "No numbers found in weight"
            }
    else:
        validation_results['weight'] = {
            'original': None,
            'cleaned': None,
            'valid': True,
            'confidence': 1.0,
            'warnings': [],
            'error': None
        }

    # Simple state validation
    if state:
        state_cleaned = state.strip().title()
        valid_states = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
                        'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
                        'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
                        'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
                        'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
                        'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
                        'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
                        'Wisconsin', 'Wyoming']

        is_valid_state = state_cleaned in valid_states
        validation_results['state'] = {
            'original': state,
            'cleaned': state_cleaned if is_valid_state else None,
            'valid': is_valid_state,
            'confidence': 1.0 if is_valid_state else 0.0,
            'warnings': [],
            'error': None if is_valid_state else f"Invalid state: {state}"
        }
    else:
        validation_results['state'] = {
            'original': None,
            'cleaned': None,
            'valid': True,
            'confidence': 1.0,
            'warnings': [],
            'error': None
        }

    # Check if breed validation passed
    species_result = validation_results.get('species')
    if species_result and not species_result['valid']:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid breed",
                "message": "Only Labrador Retrievers are accepted. Please ensure the dog is a Labrador Retriever.",
                "original_species": species_result['original'],
                "validation_details": species_result['error']
            }
        )

    # Prepare response
    validation_summary = {
        "total_fields": len(validation_results),
        "valid_fields": len([r for r in validation_results.values() if r['valid']]),
        "warnings": []
    }

    for field, result in validation_results.items():
        if result['warnings']:
            validation_summary["warnings"].extend([f"{field}: {w}" for w in result['warnings']])

    return {
        "message": "Simple validation completed successfully (no Bedrock required)",
        "validation_summary": validation_summary,
        "cleaned_data": {k: v['cleaned'] for k, v in validation_results.items() if v['cleaned'] is not None},
        "original_data": dog_data,
        "validation_details": validation_results
    }

@app.post("/dogs/create_with_image")
@tracer.capture_method
async def create_dog_with_image(
        file: UploadFile = File(...),
        breed_id: int = Form(None),
        name: str = Form(None),
        shelter_name: str = Form(None),
        city: str = Form(None),
        state: str = Form(None),
        species: str = Form(None),
        shelter_entry_date: str = Form(None),
        description: str = Form(None),
        birthday: str = Form(None),
        weight: Any = Form(None),  # Changed to Any to handle various formats
        color: str = Form(None),
        db: Session = Depends(get_db),
        user=Depends(get_current_user)
):
    """
    Creates a new dog entry and uploads its image in a single API call.
    Uses Bedrock AI for intelligent data validation and cleaning.
    """
    # Generate UUID for dog_id
    dog_id = str(uuid4())

    # Prepare data for validation
    dog_data = {
        'name': name,
        'shelter_name': shelter_name,
        'city': city,
        'state': state,
        'species': species,
        'description': description,
        'color': color,
        'weight': weight,
        'birthday': birthday,
        'shelter_entry_date': shelter_entry_date
    }

    # Use simple validation for uploaded images
    cleaned_data = {k: v for k, v in dog_data.items() if v is not None and v != ''}

    # Simple species validation
    if species and species.lower().strip() not in ['labrador retriever', 'labrador', 'lab']:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid breed",
                "message": "Only Labrador Retrievers are accepted.",
                "original_species": species
            }
        )

    # Read image contents and process
    contents = await file.read()
    image = Image.open(BytesIO(contents))

    # Labrador check with Rekognition
    rekog_result = bedrock_validator.classify_image_with_rekognition(contents)
    if not rekog_result["is_labrador"]:
        logger.warning(f"Dog {dog_id}: Image rejected by Rekognition - not a Labrador Retriever")
        return JSONResponse(
            status_code=400,
            content={
                "error": "Image is not a Labrador Retriever",
                "message": "Only Labrador Retriever images are accepted. Please upload a valid image.",
                "rekognition_result": rekog_result
            }
        )

    resized_400 = image.copy().resize((400, 400))
    resized_50 = image.copy().resize((50, 50))

    buffer_400 = BytesIO()
    resized_400.save(buffer_400, format="PNG")
    buffer_400.seek(0)

    buffer_50 = BytesIO()
    resized_50.save(buffer_50, format="PNG")
    buffer_50.seek(0)

    original_key = f"{dog_id}/original.jpg"
    resized_400_key = f"{dog_id}/resized_400.png"
    thumbnail_50_key = f"{dog_id}/thumbnail_50.png"

    # Upload images to S3
    s3_client.upload_fileobj(BytesIO(contents), BUCKET_NAME, original_key)
    s3_client.upload_fileobj(buffer_400, BUCKET_NAME, resized_400_key)
    s3_client.upload_fileobj(buffer_50, BUCKET_NAME, thumbnail_50_key)

    # Analyze sentiment from dog image
    sentiment_tags = None
    logger.info(f"Analyzing sentiment from dog image")
    sentiment_result = bedrock_validator.analyze_image_sentiment(contents)
    logger.info(f"Image sentiment analysis result: {sentiment_result}")
    if sentiment_result['success']:
        sentiment_tags = ','.join(sentiment_result['tags'])
        logger.info(f"Generated image sentiment tags: {sentiment_tags}")
    else:
        logger.error(f"Image sentiment analysis failed: {sentiment_result.get('error', 'Unknown error')}")
        # Fallback to description if available
        if cleaned_data.get('description'):
            logger.info("Falling back to description sentiment analysis")
            desc_sentiment = bedrock_validator.analyze_sentiment(cleaned_data.get('description'))
            if desc_sentiment['success']:
                sentiment_tags = ','.join(desc_sentiment['tags'])

    # Create dog record in DB with cleaned data
    dog = models.Dog(
        dog_id=dog_id,
        breed_id=breed_id,
        name=encrypt_name(str(cleaned_data.get('name'))) if cleaned_data.get('name') else None,
        shelter_name=cleaned_data.get('shelter_name'),
        city=cleaned_data.get('city'),
        state=cleaned_data.get('state'),
        species=cleaned_data.get('species'),
        shelter_entry_date=cleaned_data.get('shelter_entry_date'),
        description=cleaned_data.get('description'),
        birthday=cleaned_data.get('birthday'),
        weight=cleaned_data.get('weight'),
        color=cleaned_data.get('color'),
        sentiment_tags=sentiment_tags,
        original_key=original_key,
        resized_400_key=resized_400_key,
        thumbnail_50_key=thumbnail_50_key
    )
    db.add(dog)
    db.commit()
    db.refresh(dog)

    # Add metrics
    metrics.add_metric(name="DogCreated", unit=MetricUnit.Count, value=1)
    metrics.add_metadata(key="dog_id", value=dog_id)

    # Publish event
    publish_dog_event("dog_created", {
        "dog_id": dog_id,
        "name": cleaned_data.get('name'),
        "species": cleaned_data.get('species')
    })

    return {
        "message": f"Dog '{cleaned_data.get('name', 'Unknown')}' created with image successfully.",
        "dog_id": dog_id,
        "image_keys": [original_key, resized_400_key, thumbnail_50_key],
        "cleaned_data": cleaned_data
    }


@app.post("/breeds")
def create_breed(name: str, description: str = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Creates a new breed entry."""
    breed = models.Breed(name=name, description=description)
    db.add(breed)
    db.commit()
    db.refresh(breed)
    return {"message": "Breed created", "breed": {"id": breed.id, "name": breed.name}}


@app.get("/breeds")
def list_breeds(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Lists all breeds."""
    breeds = db.query(models.Breed).all()
    return {"breeds": [{"id": b.id, "name": b.name} for b in breeds]}


# Update a breed by ID
@app.put("/breeds/{breed_id}")
def update_breed(breed_id: int, name: str = None, description: str = None, db: Session = Depends(get_db),
                 user=Depends(get_current_user)):
    """Updates a breed by ID."""
    breed = db.query(models.Breed).filter(models.Breed.id == breed_id).first()
    if not breed:
        raise HTTPException(status_code=404, detail="Breed not found")
    if name:
        breed.name = name
    if description:
        breed.description = description
    db.commit()
    db.refresh(breed)
    return {"message": "Breed updated", "breed": {"id": breed.id, "name": breed.name, "description": breed.description}}


# Delete a breed by ID
@app.delete("/breeds/{breed_id}")
def delete_breed(breed_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Deletes a breed by ID."""
    breed = db.query(models.Breed).filter(models.Breed.id == breed_id).first()
    if not breed:
        raise HTTPException(status_code=404, detail="Breed not found")
    db.delete(breed)
    db.commit()
    return {"message": f"Breed {breed_id} deleted successfully"}


@app.post("/dogs/{dog_id}/upload")
async def upload_image(
        dog_id: str,
        file: UploadFile = File(...),
        breed_id: int = None,
        name: str = None,
        shelter_name: str = None,
        city: str = None,
        state: str = None,
        species: str = None,
        shelter_entry_date: str = None,
        description: str = None,
        birthday: str = None,
        weight: float = None,
        color: str = None,
        db: Session = Depends(get_db),
        user=Depends(get_current_user)
):
    """
    Uploads original image to S3, generates resized images (400x400 PNG and 50x50 PNG),
    stores in S3 and updates DB with dog details.
    """
    # Parse birthday safely
    birthday_date = None
    if birthday:
        try:
            birthday_date = datetime.strptime(birthday, "%Y-%m-%d").date()
        except ValueError:
            logger.warning(f"Invalid birthday format '{birthday}' for dog {dog_id}. Expected YYYY-MM-DD.")

    # Parse shelter_entry_date safely if used
    shelter_entry_dt = None
    if shelter_entry_date:
        try:
            shelter_entry_dt = datetime.strptime(shelter_entry_date, "%Y-%m-%d").date()
        except ValueError:
            logger.warning(f"Invalid shelter entry date '{shelter_entry_date}' for dog {dog_id}. Expected YYYY-MM-DD.")

    contents = await file.read()
    image = Image.open(BytesIO(contents))

    resized_400 = image.copy().resize((400, 400))
    resized_50 = image.copy().resize((50, 50))

    buffer_400 = BytesIO()
    resized_400.save(buffer_400, format="PNG")
    buffer_400.seek(0)

    buffer_50 = BytesIO()
    resized_50.save(buffer_50, format="PNG")
    buffer_50.seek(0)

    original_key = f"{dog_id}/original.jpg"
    resized_400_key = f"{dog_id}/resized_400.png"
    thumbnail_50_key = f"{dog_id}/thumbnail_50.png"

    # Upload to S3
    s3_client.upload_fileobj(BytesIO(contents), BUCKET_NAME, original_key)
    s3_client.upload_fileobj(buffer_400, BUCKET_NAME, resized_400_key)
    s3_client.upload_fileobj(buffer_50, BUCKET_NAME, thumbnail_50_key)

    # Insert or update DB record with dog details
    dog = db.query(models.Dog).filter(models.Dog.dog_id == dog_id).first()
    if dog:
        dog.original_key = original_key
        dog.resized_400_key = resized_400_key
        dog.thumbnail_50_key = thumbnail_50_key
        dog.breed_id = breed_id
        dog.name = encrypt_name(name) if name else None
        dog.shelter_name = shelter_name
        dog.city = city
        dog.state = state
        dog.species = species
        dog.shelter_entry_date = shelter_entry_dt
        dog.description = description
        dog.birthday = birthday_date
        dog.weight = weight
        dog.color = color
    else:
        dog = models.Dog(
            dog_id=dog_id,
            breed_id=breed_id,
            original_key=original_key,
            resized_400_key=resized_400_key,
            thumbnail_50_key=thumbnail_50_key,
            name=encrypt_name(name) if name else None,
            shelter_name=shelter_name,
            city=city,
            state=state,
            species=species,
            shelter_entry_date=shelter_entry_dt,
            description=description,
            birthday=birthday_date,
            weight=weight,
            color=color
        )
        db.add(dog)
    db.commit()

    return {
        "message": f"Uploaded images and details for {dog_id}",
        "keys": [original_key, resized_400_key, thumbnail_50_key]
    }


@app.get("/dogs/{dog_id}/image")
async def get_dog_image(dog_id: str):
    """Generates a pre-signed URL to download the original image for a dog."""
    try:
        key = f"{dog_id}/original.jpg"
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': key},
            ExpiresIn=3600
        )
        return {"url": url}
    except Exception as e:
        logger.error(f"Error generating presigned URL: {e}")
        return {"error": str(e)}


@app.get("/dogs/images")
async def list_all_dog_images():
    """Lists all objects in the S3 bucket."""
    try:
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME)
        contents = response.get("Contents", [])
        files = [obj["Key"] for obj in contents]
        return {"files": files}
    except Exception as e:
        logger.error(f"Error listing S3 objects: {e}")
        return {"error": str(e)}

@app.get("/dogs/wagged")
def get_wagged_dogs(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Get all dogs that the current user has wagged."""
    user_id = user.get('sub')
    logger.info(f"Getting wagged dogs for user: {user_id}")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID (sub) not found in token.")

    # Get all user wags for the current user
    user_wags = db.query(models.UserWag).filter_by(
        user_id=user_id, type="wag"
    ).all()
    logger.info(f"Found {len(user_wags)} wags for user {user_id}")

    wagged_dogs = []
    for user_wag in user_wags:
        dog = db.query(models.Dog).filter(models.Dog.dog_id == user_wag.dog_id).first()
        if dog:
            # Generate presigned URL for the dog's image
            image_url = None
            if dog.original_key:
                try:
                    image_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': BUCKET_NAME, 'Key': dog.original_key},
                        ExpiresIn=3600
                    )
                except Exception as e:
                    logger.error(f"Error generating presigned URL for dog {dog.dog_id}: {e}")

            # Calculate age
            age = None
            if dog.birthday:
                today = datetime.today().date()
                age = today.year - dog.birthday.year - (
                        (today.month, today.day) < (dog.birthday.month, dog.birthday.day))

            wagged_dogs.append({
                "dog_id": dog.dog_id,
                "name": decrypt_name(dog.name) if dog.name else "",
                "breed": dog.species,
                "age": age,
                "image_url": image_url,
                "sentiment_tags": dog.sentiment_tags.split(',') if dog.sentiment_tags else [],
                "wags": dog.wags if dog.wags is not None else 0,
                "growls": dog.growls if dog.growls is not None else 0,
                "wagged_at": user_wag.created_at.isoformat() if user_wag.created_at else None
            })

    return wagged_dogs


@app.get("/dogs/growled")
def get_growled_dogs(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Get all dogs that the current user has growled."""
    user_id = user.get('sub')
    logger.info(f"Getting growled dogs for user: {user_id}")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID (sub) not found in token.")

    # Get all user growls for the current user
    user_growls = db.query(models.UserWag).filter_by(
        user_id=user_id, type="growl"
    ).all()
    logger.info(f"Found {len(user_growls)} growls for user {user_id}")

    growled_dogs = []
    for user_growl in user_growls:
        dog = db.query(models.Dog).filter(models.Dog.dog_id == user_growl.dog_id).first()
        if dog:
            # Generate presigned URL for the dog's image
            image_url = None
            if dog.original_key:
                try:
                    image_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': BUCKET_NAME, 'Key': dog.original_key},
                        ExpiresIn=3600
                    )
                except Exception as e:
                    logger.error(f"Error generating presigned URL for dog {dog.dog_id}: {e}")

            # Calculate age
            age = None
            if dog.birthday:
                today = datetime.today().date()
                age = today.year - dog.birthday.year - (
                        (today.month, today.day) < (dog.birthday.month, dog.birthday.day))

            growled_dogs.append({
                "dog_id": dog.dog_id,
                "name": decrypt_name(dog.name) if dog.name else "",
                "breed": dog.species,
                "age": age,
                "image_url": image_url,
                "sentiment_tags": dog.sentiment_tags.split(',') if dog.sentiment_tags else [],
                "wags": dog.wags if dog.wags is not None else 0,
                "growls": dog.growls if dog.growls is not None else 0,
                "growled_at": user_growl.created_at.isoformat() if user_growl.created_at else None
            })

    return growled_dogs


@app.get("/dogs")
def list_dogs(db: Session = Depends(get_db)):
    """
    Lists all dogs with metadata and a presigned S3 URL for their original image.
    """
    dogs = db.query(models.Dog).all()
    dog_list = []
    for dog in dogs:
        image_url = None
        if dog.original_key:
            try:
                image_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': BUCKET_NAME, 'Key': dog.original_key},
                    ExpiresIn=3600
                )
            except Exception as e:
                logger.error(f"Error generating presigned URL for dog {dog.dog_id}: {e}")
        dog_list.append({
            "dog_id": dog.dog_id,
            "name": decrypt_name(dog.name) if dog.name else "",
            "breed": dog.species,
            "image_url": image_url,
            "sentiment_tags": dog.sentiment_tags.split(',') if dog.sentiment_tags else [],
            "wags": dog.wags if dog.wags is not None else 0,
            "growls": dog.growls if dog.growls is not None else 0,
        })
    return dog_list


# --- Filter Dogs Endpoint ---
@app.get("/dogs/filter", status_code=200)
def filter_dogs(
        state: str = None,
        max_weight: float = None,
        min_weight: float = None,
        color: str = None,
        min_age: int = None,
        max_age: int = None,
        db: Session = Depends(get_db)
):
    """
    Filter dogs by state, weight, color, and age.
    All filters are combined (AND logic) so only dogs matching ALL provided filters are returned.
    """
    query = db.query(models.Dog)
    if state:
        query = query.filter(models.Dog.state == state)
    if max_weight is not None:
        query = query.filter(models.Dog.weight <= max_weight)
    if min_weight is not None:
        query = query.filter(models.Dog.weight >= min_weight)
    if color:
        query = query.filter(models.Dog.color == color)
    dogs = query.all()
    dog_list = []
    today = datetime.today().date()
    for dog in dogs:
        age = None
        if dog.birthday:
            age = today.year - dog.birthday.year - ((today.month, today.day) < (dog.birthday.month, dog.birthday.day))
        if min_age is not None and (age is None or age < min_age):
            continue
        if max_age is not None and (age is None or age > max_age):
            continue
        image_url = None
        if dog.original_key:
            try:
                image_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': BUCKET_NAME, 'Key': dog.original_key},
                    ExpiresIn=3600
                )
            except Exception as e:
                logger.error(f"Error generating presigned URL for dog {dog.dog_id}: {e}")
        dog_list.append({
            "dog_id": dog.dog_id,
            "name": decrypt_name(dog.name) if dog.name else "",
            "breed": dog.species,
            "age": age,
            "image_url": image_url,
            "sentiment_tags": dog.sentiment_tags.split(',') if dog.sentiment_tags else [],
            "wags": dog.wags if dog.wags is not None else 0,
            "growls": dog.growls if dog.growls is not None else 0,
        })
    return dog_list


@app.get("/dogs/{dog_id}")
def get_dog_with_breed(dog_id: str, db: Session = Depends(get_db)):
    user = None  # Public endpoint - no authentication required
    """Retrieve a dog with its breed information and full profile fields including presigned image URL."""
    dog = db.query(models.Dog).filter(models.Dog.dog_id == dog_id).first()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found")

    breed = db.query(models.Breed).filter(models.Breed.id == dog.breed_id).first()

    # Generate presigned URL for original image like Home page list_dogs endpoint
    image_url = None
    resized_400_url = None
    thumbnail_50_url = None
    if dog.original_key:
        try:
            image_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': BUCKET_NAME, 'Key': dog.original_key},
                ExpiresIn=3600
            )
            if dog.resized_400_key:
                resized_400_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': BUCKET_NAME, 'Key': dog.resized_400_key},
                    ExpiresIn=3600
                )
            if dog.thumbnail_50_key:
                thumbnail_50_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': BUCKET_NAME, 'Key': dog.thumbnail_50_key},
                    ExpiresIn=3600
                )

        except Exception as e:
            logger.error(f"Error generating presigned URL for dog {dog.dog_id}: {e}")
            image_url = None

    # Check user's action on this dog
    user_wagged = False
    user_growled = False
    if user:
        user_id = user.get('sub')
        if user_id:
            user_action = db.query(models.UserWag).filter_by(
                user_id=user_id, dog_id=dog_id
            ).first()
            if user_action:
                user_wagged = user_action.type == "wag"
                user_growled = user_action.type == "growl"

    return {
        "dog_id": dog.dog_id,
        "name": decrypt_name(dog.name) if dog.name else "",
        "shelter_name": dog.shelter_name,
        "city": dog.city,
        "state": dog.state,
        "breed": breed.name if breed else None,
        "species": dog.species,
        "shelter_entry_date": dog.shelter_entry_date.isoformat() if dog.shelter_entry_date else None,
        "description": dog.description,
        "birthday": dog.birthday.isoformat() if dog.birthday else None,
        "weight": dog.weight,
        "color": dog.color,
        "sentiment_tags": dog.sentiment_tags.split(',') if dog.sentiment_tags else [],
        "image_url": image_url,
        "resized_400_url": resized_400_url,
        "thumbnail_50_url": thumbnail_50_url,
        "original_key": dog.original_key,
        "resized_400_key": dog.resized_400_key,
        "thumbnail_50_key": dog.thumbnail_50_key,
        "created_at": dog.created_at.isoformat() if dog.created_at else None,
        "user_wagged": False,  # Always false for public endpoint
        "user_growled": False,  # Always false for public endpoint
        "wags": dog.wags if dog.wags is not None else 0,
        "growls": dog.growls if dog.growls is not None else 0
    }


@app.get("/dogs/{dog_id}/auth")
def get_dog_with_breed_auth(dog_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Authenticated version that returns user interaction status"""
    dog = db.query(models.Dog).filter(models.Dog.dog_id == dog_id).first()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found")

    breed = db.query(models.Breed).filter(models.Breed.id == dog.breed_id).first()

    # Generate presigned URLs
    image_url = None
    resized_400_url = None
    thumbnail_50_url = None
    if dog.original_key:
        try:
            image_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': BUCKET_NAME, 'Key': dog.original_key},
                ExpiresIn=3600
            )
            if dog.resized_400_key:
                resized_400_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': BUCKET_NAME, 'Key': dog.resized_400_key},
                    ExpiresIn=3600
                )
            if dog.thumbnail_50_key:
                thumbnail_50_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': BUCKET_NAME, 'Key': dog.thumbnail_50_key},
                    ExpiresIn=3600
                )
        except Exception as e:
            logger.error(f"Error generating presigned URL for dog {dog.dog_id}: {e}")

    # Check user's action on this dog
    user_wagged = False
    user_growled = False
    if user:
        user_id = user.get('sub')
        if user_id:
            user_action = db.query(models.UserWag).filter_by(
                user_id=user_id, dog_id=dog_id
            ).first()
            if user_action:
                user_wagged = user_action.type == "wag"
                user_growled = user_action.type == "growl"

    return {
        "dog_id": dog.dog_id,
        "name": decrypt_name(dog.name) if dog.name else "",
        "shelter_name": dog.shelter_name,
        "city": dog.city,
        "state": dog.state,
        "breed": breed.name if breed else None,
        "species": dog.species,
        "shelter_entry_date": dog.shelter_entry_date.isoformat() if dog.shelter_entry_date else None,
        "description": dog.description,
        "birthday": dog.birthday.isoformat() if dog.birthday else None,
        "weight": dog.weight,
        "color": dog.color,
        "sentiment_tags": dog.sentiment_tags.split(',') if dog.sentiment_tags else [],
        "image_url": image_url,
        "resized_400_url": resized_400_url,
        "thumbnail_50_url": thumbnail_50_url,
        "original_key": dog.original_key,
        "resized_400_key": dog.resized_400_key,
        "thumbnail_50_key": dog.thumbnail_50_key,
        "created_at": dog.created_at.isoformat() if dog.created_at else None,
        "user_wagged": user_wagged,
        "user_growled": user_growled,
        "wags": dog.wags if dog.wags is not None else 0,
        "growls": dog.growls if dog.growls is not None else 0
    }


@app.post("/dogs/{dog_id}/wag")
def wag_dog(dog_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Increment the wag count for a dog and record the user's wag, preventing duplicates."""
    dog = db.query(models.Dog).filter(models.Dog.dog_id == dog_id).first()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found")
    user_id = user.get('sub')
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID (sub) not found in token.")

    # Check if user has any existing action on this dog
    existing_action = db.query(models.UserWag).filter_by(
        user_id=user_id, dog_id=dog_id
    ).first()
    if existing_action:
        if existing_action.type == "wag":
            raise HTTPException(status_code=400, detail="You have already wagged this dog.")
        else:  # existing growl
            raise HTTPException(status_code=400, detail="You have already growled this dog. You cannot wag a dog you've growled.")

    dog.wags += 1
    user_wag = models.UserWag(user_id=user_id, dog_id=dog_id, type="wag")
    db.add(user_wag)
    db.commit()

    # Publish event
    publish_dog_event("dog_wagged", {
        "dog_id": dog_id,
        "user_id": user_id,
        "wags": dog.wags
    })

    return {"message": f"Wag given to {dog_id}", "wags": dog.wags, "growls": dog.growls}


@app.delete("/dogs/{dog_id}/wag")
def unwag_dog(dog_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Remove user's wag from a dog"""
    dog = db.query(models.Dog).filter(models.Dog.dog_id == dog_id).first()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found")
    user_id = user.get('sub')
    
    existing_wag = db.query(models.UserWag).filter_by(
        user_id=user_id, dog_id=dog_id, type="wag"
    ).first()
    if not existing_wag:
        raise HTTPException(status_code=400, detail="You haven't wagged this dog.")
    
    db.delete(existing_wag)
    dog.wags = max(0, dog.wags - 1)
    db.commit()
    
    return {"message": f"Wag removed from {dog_id}", "wags": dog.wags, "growls": dog.growls}


@app.post("/dogs/{dog_id}/growl")
def growl_dog(dog_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Increment the growl count for a dog and record the user's growl, preventing duplicates."""
    dog = db.query(models.Dog).filter(models.Dog.dog_id == dog_id).first()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found")
    user_id = user.get('sub')
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID (sub) not found in token.")

    # Check if user has any existing action on this dog
    existing_action = db.query(models.UserWag).filter_by(
        user_id=user_id, dog_id=dog_id
    ).first()
    if existing_action:
        if existing_action.type == "growl":
            raise HTTPException(status_code=400, detail="You have already growled this dog.")
        else:  # existing wag
            raise HTTPException(status_code=400, detail="You have already wagged this dog. You cannot growl a dog you've wagged.")

    dog.growls += 1
    user_growl = models.UserWag(user_id=user_id, dog_id=dog_id, type="growl")
    db.add(user_growl)
    db.commit()
    return {"message": f"Growl given to {dog_id}", "wags": dog.wags, "growls": dog.growls}


@app.delete("/dogs/{dog_id}/growl")
def ungrowl_dog(dog_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Remove user's growl from a dog"""
    dog = db.query(models.Dog).filter(models.Dog.dog_id == dog_id).first()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found")
    user_id = user.get('sub')
    
    existing_growl = db.query(models.UserWag).filter_by(
        user_id=user_id, dog_id=dog_id, type="growl"
    ).first()
    if not existing_growl:
        raise HTTPException(status_code=400, detail="You haven't growled this dog.")
    
    db.delete(existing_growl)
    dog.growls = max(0, dog.growls - 1)
    db.commit()
    
    return {"message": f"Growl removed from {dog_id}", "wags": dog.wags, "growls": dog.growls}


# --- Breed assignment and retrieval endpoints ---

@app.post("/dogs/{dog_id}/assign_breed")
def assign_breed_to_dog(dog_id: str, breed_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Assigns a breed to a dog."""
    dog = db.query(models.Dog).filter(models.Dog.dog_id == dog_id).first()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found")
    breed = db.query(models.Breed).filter(models.Breed.id == breed_id).first()
    if not breed:
        raise HTTPException(status_code=404, detail="Breed not found")
    dog.breed_id = breed_id
    db.commit()
    return {"message": f"Breed {breed.name} assigned to dog {dog_id}"}


@app.get("/dogs/{dog_id}/breed")
def get_dog_breed(dog_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Retrieve breed information for a specific dog."""
    dog = db.query(models.Dog).filter(models.Dog.dog_id == dog_id).first()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found")
    breed = db.query(models.Breed).filter(models.Breed.id == dog.breed_id).first()
    if not breed:
        raise HTTPException(status_code=404, detail="Breed not assigned or found")
    return {"dog_id": dog.dog_id, "breed_id": breed.id, "breed_name": breed.name}



@app.get("/dogs/wagged")
def get_wagged_dogs(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Get all dogs that the current user has wagged."""
    user_id = user.get('sub')
    logger.info(f"Getting wagged dogs for user: {user_id}")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID (sub) not found in token.")

    # Get all user wags for the current user
    user_wags = db.query(models.UserWag).filter_by(
        user_id=user_id, type="wag"
    ).all()
    logger.info(f"Found {len(user_wags)} wags for user {user_id}")

    wagged_dogs = []
    for user_wag in user_wags:
        dog = db.query(models.Dog).filter(models.Dog.dog_id == user_wag.dog_id).first()
        if dog:
            # Generate presigned URL for the dog's image
            image_url = None
            if dog.original_key:
                try:
                    image_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': BUCKET_NAME, 'Key': dog.original_key},
                        ExpiresIn=3600
                    )
                except Exception as e:
                    logger.error(f"Error generating presigned URL for dog {dog.dog_id}: {e}")

            # Calculate age
            age = None
            if dog.birthday:
                today = datetime.today().date()
                age = today.year - dog.birthday.year - (
                        (today.month, today.day) < (dog.birthday.month, dog.birthday.day))

            wagged_dogs.append({
                "dog_id": dog.dog_id,
                "name": decrypt_name(dog.name) if dog.name else "",
                "breed": dog.species,
                "age": age,
                "image_url": image_url,
                "sentiment_tags": dog.sentiment_tags.split(',') if dog.sentiment_tags else [],
                "wags": dog.wags if dog.wags is not None else 0,
                "growls": dog.growls if dog.growls is not None else 0,
                "wagged_at": user_wag.created_at.isoformat() if user_wag.created_at else None
            })

    return wagged_dogs


@app.get("/dogs/growled")
def get_growled_dogs(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Get all dogs that the current user has growled."""
    user_id = user.get('sub')
    logger.info(f"Getting growled dogs for user: {user_id}")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID (sub) not found in token.")

    # Get all user growls for the current user
    user_growls = db.query(models.UserWag).filter_by(
        user_id=user_id, type="growl"
    ).all()
    logger.info(f"Found {len(user_growls)} growls for user {user_id}")

    growled_dogs = []
    for user_growl in user_growls:
        dog = db.query(models.Dog).filter(models.Dog.dog_id == user_growl.dog_id).first()
        if dog:
            # Generate presigned URL for the dog's image
            image_url = None
            if dog.original_key:
                try:
                    image_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': BUCKET_NAME, 'Key': dog.original_key},
                        ExpiresIn=3600
                    )
                except Exception as e:
                    logger.error(f"Error generating presigned URL for dog {dog.dog_id}: {e}")

            # Calculate age
            age = None
            if dog.birthday:
                today = datetime.today().date()
                age = today.year - dog.birthday.year - (
                        (today.month, today.day) < (dog.birthday.month, dog.birthday.day))

            growled_dogs.append({
                "dog_id": dog.dog_id,
                "name": decrypt_name(dog.name) if dog.name else "",
                "breed": dog.species,
                "age": age,
                "image_url": image_url,
                "sentiment_tags": dog.sentiment_tags.split(',') if dog.sentiment_tags else [],
                "wags": dog.wags if dog.wags is not None else 0,
                "growls": dog.growls if dog.growls is not None else 0,
                "growled_at": user_growl.created_at.isoformat() if user_growl.created_at else None
            })

    return growled_dogs


@app.post("/ai/classify_image")
async def classify_image(file: UploadFile = File(...)):
    """
    Classify an uploaded image as Labrador Retriever or not using Amazon Rekognition.
    """
    image_bytes = await file.read()
    result = bedrock_validator.classify_image_with_rekognition(image_bytes)
    return result


@app.post("/ai/generate_image")
async def generate_image(request: dict = Body(...)):
    """
    Generate a Labrador Retriever image from a description using Amazon Nova Pro via Bedrock.
    """
    description = request.get("description", "")
    if not description:
        return {"image_base64": None, "explanation": "Description is required"}

    result = bedrock_validator.generate_image_with_nova(description)
    return result


@app.post("/test/sentiment")
async def test_sentiment(request: dict = Body(...)):
    """
    Test sentiment analysis directly
    """
    description = request.get("description", "")
    if not description:
        return {"error": "Description is required"}

    result = bedrock_validator.analyze_sentiment(description)
    return result


@app.post("/test/image_sentiment")
async def test_image_sentiment(file: UploadFile = File(...)):
    """
    Test image sentiment analysis directly
    """
    image_bytes = await file.read()
    result = bedrock_validator.analyze_image_sentiment(image_bytes)
    return result


@app.post("/dogs/create_with_document")
async def create_dog_with_document(
        document: UploadFile = File(...),
        image: UploadFile = File(...),
        db: Session = Depends(get_db),
        user=Depends(get_current_user)
):
    """
    Create a dog by extracting information from an uploaded document and image.
    """
    dog_id = str(uuid4())

    # Extract text from document
    document_bytes = await document.read()
    file_extension = document.filename.split('.')[-1] if document.filename else None
    extraction_result = bedrock_validator.extract_text_from_document(document_bytes, f'.{file_extension}' if file_extension else None)

    if not extraction_result['success']:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Document extraction failed",
                "message": extraction_result.get('error', 'Unknown error')
            }
        )

    dog_data = extraction_result['dog_data']

    # Validate species
    species = dog_data.get('species', '')
    if species and species.lower().strip() not in ['labrador retriever', 'labrador', 'lab']:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid breed",
                "message": "Only Labrador Retrievers are accepted.",
                "extracted_data": dog_data
            }
        )

    # Process image
    image_contents = await image.read()
    image_obj = Image.open(BytesIO(image_contents))

    # Rekognition check
    rekog_result = bedrock_validator.classify_image_with_rekognition(image_contents)
    if not rekog_result["is_labrador"]:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Image is not a Labrador Retriever",
                "message": "Only Labrador Retriever images are accepted.",
                "extracted_data": dog_data
            }
        )

    # Resize images
    resized_400 = image_obj.copy().resize((400, 400))
    resized_50 = image_obj.copy().resize((50, 50))

    buffer_400 = BytesIO()
    resized_400.save(buffer_400, format="PNG")
    buffer_400.seek(0)

    buffer_50 = BytesIO()
    resized_50.save(buffer_50, format="PNG")
    buffer_50.seek(0)

    # S3 keys
    original_key = f"{dog_id}/original.jpg"
    resized_400_key = f"{dog_id}/resized_400.png"
    thumbnail_50_key = f"{dog_id}/thumbnail_50.png"

    # Upload to S3
    s3_client.upload_fileobj(BytesIO(image_contents), BUCKET_NAME, original_key)
    s3_client.upload_fileobj(buffer_400, BUCKET_NAME, resized_400_key)
    s3_client.upload_fileobj(buffer_50, BUCKET_NAME, thumbnail_50_key)

    # Sentiment analysis
    sentiment_tags = None
    if dog_data.get('description'):
        sentiment_result = bedrock_validator.analyze_sentiment(dog_data.get('description'))
        if sentiment_result['success']:
            sentiment_tags = ','.join(sentiment_result['tags'])

    # Create dog record
    dog = models.Dog(
        dog_id=dog_id,
        breed_id=None,
        name=encrypt_name(str(dog_data.get('name'))) if dog_data.get('name') else None,
        shelter_name=dog_data.get('shelter_name'),
        city=dog_data.get('city'),
        state=dog_data.get('state'),
        species=dog_data.get('species'),
        description=dog_data.get('description'),
        birthday=dog_data.get('birthday'),
        weight=dog_data.get('weight'),
        color=dog_data.get('color'),
        sentiment_tags=sentiment_tags,
        original_key=original_key,
        resized_400_key=resized_400_key,
        thumbnail_50_key=thumbnail_50_key
    )
    db.add(dog)
    db.commit()
    db.refresh(dog)

    return {
        "message": f"Dog '{dog_data.get('name', 'Unknown')}' created from document successfully.",
        "dog_id": dog_id,
        "extracted_data": dog_data,
        "extracted_text": extraction_result['extracted_text']
    }


@app.post("/extract-text")
async def extract_text_only(
        document: UploadFile = File(...),
        user=Depends(get_current_user)
):
    """
    Extract text from document without creating a dog record.
    """
    document_bytes = await document.read()
    file_extension = document.filename.split('.')[-1] if document.filename else None
    extraction_result = bedrock_validator.extract_text_from_document(document_bytes, f'.{file_extension}' if file_extension else None)

    if not extraction_result['success']:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Document extraction failed",
                "message": extraction_result.get('error', 'Unknown error')
            }
        )

    return {
        "extracted_text": extraction_result['extracted_text'],
        "dog_data": extraction_result['dog_data']
    }


@app.post("/dogs/match")
@tracer.capture_method
async def match_dogs(
        preferences: dict = Body(...),
        db: Session = Depends(get_db),
        user=Depends(get_current_user)
):
    """
    Match user preferences with available dogs using real-time inference.
    """
    # Get all available dogs
    dogs = db.query(models.Dog).all()
    dog_list = []
    today = datetime.today().date()

    for dog in dogs:
        age = None
        if dog.birthday:
            age = today.year - dog.birthday.year - ((today.month, today.day) < (dog.birthday.month, dog.birthday.day))

        image_url = None
        if dog.original_key:
            try:
                image_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': BUCKET_NAME, 'Key': dog.original_key},
                    ExpiresIn=3600
                )
            except Exception as e:
                logger.error(f"Error generating presigned URL for dog {dog.dog_id}: {e}")

        dog_list.append({
            "dog_id": dog.dog_id,
            "name": decrypt_name(dog.name) if dog.name else "",
            "age": age,
            "weight": dog.weight,
            "color": dog.color,
            "description": dog.description,
            "sentiment_tags": dog.sentiment_tags.split(',') if dog.sentiment_tags else [],
            "image_url": image_url,
            "wags": dog.wags if dog.wags is not None else 0,
            "growls": dog.growls if dog.growls is not None else 0,
        })

    # Use AI to match user preferences with dogs
    matching_result = bedrock_validator.match_user_to_dogs(preferences, dog_list)

    if not matching_result['success']:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Matching failed",
                "message": matching_result.get('error', 'Unknown error')
            }
        )

    # Enrich matches with full dog data
    enriched_matches = []
    for match in matching_result['matches']:
        dog_data = next((d for d in dog_list if d['dog_id'] == match['dog_id']), None)
        if dog_data:
            enriched_matches.append({
                **dog_data,
                "match_score": match['match_score'],
                "match_reasons": match['reasons']
            })

    # Add metrics
    metrics.add_metric(name="DogMatchRequests", unit=MetricUnit.Count, value=1)
    metrics.add_metric(name="DogsMatched", unit=MetricUnit.Count, value=len(enriched_matches))

    return {
        "matches": enriched_matches,
        "total_dogs_considered": len(dog_list)
    }


@app.post("/dogs/create_with_generated_image")
async def create_dog_with_generated_image(
        image_base64: str = Body(...),
        breed_id: int = Body(None, embed=True),
        name: str = Body(None),
        shelter_name: str = Body(None),
        city: str = Body(None),
        state: str = Body(None),
        species: str = Body(None),
        shelter_entry_date: str = Body(None),
        description: str = Body(None),
        birthday: str = Body(None),
        weight: Any = Body(None),
        color: str = Body(None),
        db: Session = Depends(get_db),
        user=Depends(get_current_user)
):
    """
    Creates a new dog entry using a base64-encoded image (from AI generation).
    Saves the image to S3, creates resized versions, and stores the dog in the database.
    """
    dog_id = str(uuid4())
    dog_data = {
        'name': name,
        'shelter_name': shelter_name,
        'city': city,
        'state': state,
        'species': species,
        'description': description,
        'color': color,
        'weight': weight,
        'birthday': birthday,
        'shelter_entry_date': shelter_entry_date
    }
    # Skip Bedrock validation for AI-generated images, use simple validation
    cleaned_data = {k: v for k, v in dog_data.items() if v is not None and v != ''}

    # Simple species validation
    if species and species.lower().strip() not in ['labrador retriever', 'labrador', 'lab']:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid breed",
                "message": "Only Labrador Retrievers are accepted.",
                "original_species": species
            }
        )
    try:
        image_bytes = b64decode(image_base64)
        image = Image.open(BytesIO(image_bytes))
    except Exception as e:
        logger.error(f"Failed to decode or open base64 image: {e}")
        return JSONResponse(status_code=400, content={"error": "Invalid image data", "message": str(e)})

    # Skip image validation for AI-generated images since they're already validated by the AI model
    resized_400 = image.copy().resize((400, 400))
    resized_50 = image.copy().resize((50, 50))
    buffer_400 = BytesIO()
    resized_400.save(buffer_400, format="PNG")
    buffer_400.seek(0)
    buffer_50 = BytesIO()
    resized_50.save(buffer_50, format="PNG")
    buffer_50.seek(0)
    original_key = f"{dog_id}/original.jpg"
    resized_400_key = f"{dog_id}/resized_400.png"
    thumbnail_50_key = f"{dog_id}/thumbnail_50.png"
    s3_client.upload_fileobj(BytesIO(image_bytes), BUCKET_NAME, original_key)
    s3_client.upload_fileobj(buffer_400, BUCKET_NAME, resized_400_key)
    s3_client.upload_fileobj(buffer_50, BUCKET_NAME, thumbnail_50_key)

    # Analyze sentiment from generated image
    sentiment_tags = None
    logger.info(f"Analyzing sentiment from generated dog image")
    sentiment_result = bedrock_validator.analyze_image_sentiment(image_bytes)
    logger.info(f"Generated image sentiment analysis result: {sentiment_result}")
    if sentiment_result['success']:
        sentiment_tags = ','.join(sentiment_result['tags'])
        logger.info(f"Generated image sentiment tags: {sentiment_tags}")
    else:
        logger.error(f"Generated image sentiment analysis failed: {sentiment_result.get('error', 'Unknown error')}")
        # Fallback to description if available
        if cleaned_data.get('description'):
            logger.info("Falling back to description sentiment analysis")
            desc_sentiment = bedrock_validator.analyze_sentiment(cleaned_data.get('description'))
            if desc_sentiment['success']:
                sentiment_tags = ','.join(desc_sentiment['tags'])

    dog = models.Dog(
        dog_id=dog_id,
        breed_id=breed_id,
        name=encrypt_name(str(cleaned_data.get('name'))) if cleaned_data.get('name') else None,
        shelter_name=cleaned_data.get('shelter_name'),
        city=cleaned_data.get('city'),
        state=cleaned_data.get('state'),
        species=cleaned_data.get('species'),
        shelter_entry_date=cleaned_data.get('shelter_entry_date'),
        description=cleaned_data.get('description'),
        birthday=cleaned_data.get('birthday'),
        weight=cleaned_data.get('weight'),
        color=cleaned_data.get('color'),
        sentiment_tags=sentiment_tags,
        original_key=original_key,
        resized_400_key=resized_400_key,
        thumbnail_50_key=thumbnail_50_key
    )
    db.add(dog)
    db.commit()
    db.refresh(dog)
    return {
        "message": f"Dog '{cleaned_data.get('name', 'Unknown')}' created with generated image successfully.",
        "dog_id": dog_id,
        "image_keys": [original_key, resized_400_key, thumbnail_50_key],
        "cleaned_data": cleaned_data
    }


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
