"""
Advanced data validation and cleaning using Amazon Bedrock Converse API.
This module uses multiple Bedrock models to intelligently parse and clean malformed shelter data.
"""

import json
import logging
import boto3
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime, date
import re
import time
import base64

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of data validation with cleaned value and validation status."""
    value: Any
    is_valid: bool
    original_value: Any
    confidence: float = 0.0
    error_message: Optional[str] = None
    warnings: Optional[List[str]] = None
    model_used: Optional[str] = None

    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []


class BedrockValidator:
    """
    Advanced data validator using Amazon Bedrock models.
    Uses Claude Sonnet 3.7 for text parsing and Nova models for image analysis.
    """

    def __init__(self):
        self.bedrock_runtime = boto3.client(
            service_name='bedrock-runtime',
            region_name='us-east-1'  # Adjust based on your region
        )

        # Model configurations - using the models you have access to
        self.models = {
            "Claude 3.7 Sonnet": "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
            "Amazon Nova Pro": "us.amazon.nova-pro-v1:0",
            "Amazon Nova Micro": "us.amazon.nova-micro-v1:0",
            "Amazon Nova Canvas": "amazon.nova-canvas-v1:0",
            "Amazon Nova Reel": "amazon.nova-reel-v1:0"
        }

    def _call_bedrock_converse(self, model_id: str, messages: List[Dict], system_prompt: Optional[str] = None,
                               max_retries: int = 5) -> Dict:
        """Make a call to Bedrock Converse API with exponential backoff for throttling."""
        body = {
            "messages": messages,
            "anthropic_version": "bedrock-2023-05-31"
        }
        if system_prompt:
            body["system"] = system_prompt
        if model_id.startswith("us.anthropic.claude") or model_id.startswith("anthropic.claude"):
            body["max_tokens"] = 1024
        for attempt in range(max_retries):
            try:
                response = self.bedrock_runtime.invoke_model(
                    modelId=model_id,
                    body=json.dumps(body)
                )
                response_body = json.loads(response.get('body').read())
                return response_body
            except self.bedrock_runtime.exceptions.ThrottlingException as e:
                wait = 0.5 * (2 ** attempt)
                logger.warning(f"Bedrock throttled, retrying in {wait:.1f}s (attempt {attempt + 1}/{max_retries})...")
                time.sleep(wait)
            except Exception as e:
                logger.error(f"Bedrock API call failed: {e}")
                raise
        raise Exception("Bedrock API throttling: max retries exceeded")

    def clean_weight_with_bedrock(self, weight_input: Any) -> ValidationResult:
        """
        Use Claude to intelligently parse weight data from various formats.
        """
        if weight_input is None:
            return ValidationResult(None, True, None, confidence=1.0)

        original_value = str(weight_input).strip()

        system_prompt = """
        You are a data cleaning expert for a dog adoption database. Your task is to parse weight values from various formats and convert them to pounds (float).

        Common formats you might encounter:
        - "32 pounds" -> 32.0
        - "32.5 lbs" -> 32.5
        - "thirty two pounds" -> 32.0
        - "15 kilos" -> 33.1 (convert kg to lbs)
        - "15 kg" -> 33.1
        - "32" -> 32.0
        - "about 30 pounds" -> 30.0
        - "30-35 pounds" -> 32.5 (average)
        - "medium weight" -> None (cannot determine)

        Rules:
        1. Always convert to pounds
        2. Convert kg to lbs (1 kg = 2.20462 lbs)
        3. Handle text numbers (thirty two -> 32)
        4. For ranges, use the average
        5. If uncertain, return null
        6. Reasonable weight range: 5-150 pounds

        Respond with ONLY a JSON object:
        {
            "weight": float or null,
            "confidence": float (0.0-1.0),
            "explanation": "brief explanation of conversion",
            "is_valid": boolean
        }
        """

        user_message = f"Parse this weight value: '{original_value}'"

        try:
            response = self._call_bedrock_converse(
                self.models['Claude 3.7 Sonnet'],
                [{"role": "user", "content": user_message}],
                system_prompt
            )

            # Extract the response content
            content = response['content'][0]['text']

            # Parse JSON response
            result = json.loads(content)

            return ValidationResult(
                value=result.get('weight'),
                is_valid=result.get('is_valid', False),
                original_value=original_value,
                confidence=result.get('confidence', 0.0),
                warnings=[result.get('explanation', '')] if result.get('explanation') else [],
                model_used='Claude 3.7 Sonnet'
            )

        except Exception as e:
            logger.error(f"Failed to parse weight '{original_value}' with Bedrock: {e}")
            return ValidationResult(
                value=None,
                is_valid=False,
                original_value=original_value,
                error_message=f"Bedrock parsing failed: {str(e)}"
            )

    def clean_date_with_bedrock(self, date_input: Any) -> ValidationResult:
        """
        Use Claude to intelligently parse date data from various formats.
        """
        if date_input is None:
            return ValidationResult(None, True, None, confidence=1.0)

        original_value = str(date_input).strip()

        system_prompt = """
        You are a data cleaning expert for a dog adoption database. Your task is to parse date values from various formats and convert them to ISO format (YYYY-MM-DD).

        Common formats you might encounter:
        - "12/25/2023" -> "2023-12-25"
        - "25/12/2023" -> "2023-12-25"
        - "December 25, 2023" -> "2023-12-25"
        - "Dec 25, 2023" -> "2023-12-25"
        - "2023-12-25" -> "2023-12-25"
        - "12-25-2023" -> "2023-12-25"
        - "25-12-2023" -> "2023-12-25"
        - "yesterday" -> null (cannot determine specific date)
        - "last week" -> null (cannot determine specific date)

        Rules:
        1. Always return ISO format (YYYY-MM-DD)
        2. Handle both MM/DD and DD/MM formats intelligently
        3. If date is ambiguous, return null
        4. If date is in the future, return null
        5. If date is too far in the past (>50 years), return null

        Respond with ONLY a JSON object:
        {
            "date": "YYYY-MM-DD" or null,
            "confidence": float (0.0-1.0),
            "explanation": "brief explanation of parsing",
            "is_valid": boolean
        }
        """

        user_message = f"Parse this date value: '{original_value}'"

        try:
            response = self._call_bedrock_converse(
                self.models['Claude 3.7 Sonnet'],
                [{"role": "user", "content": user_message}],
                system_prompt
            )

            content = response['content'][0]['text']
            result = json.loads(content)

            # Convert string date to date object if valid
            parsed_date = None
            if result.get('date'):
                try:
                    parsed_date = datetime.strptime(result['date'], '%Y-%m-%d').date()
                except ValueError:
                    result['is_valid'] = False

            return ValidationResult(
                value=parsed_date,
                is_valid=result.get('is_valid', False),
                original_value=original_value,
                confidence=result.get('confidence', 0.0),
                warnings=[result.get('explanation', '')] if result.get('explanation') else [],
                model_used='Claude 3.7 Sonnet'
            )

        except Exception as e:
            logger.error(f"Failed to parse date '{original_value}' with Bedrock: {e}")
            return ValidationResult(
                value=None,
                is_valid=False,
                original_value=original_value,
                error_message=f"Bedrock parsing failed: {str(e)}"
            )

    def clean_state_with_bedrock(self, state_input: Any) -> ValidationResult:
        """
        Use Claude to intelligently parse and normalize state data.
        """
        if state_input is None:
            return ValidationResult(None, True, None, confidence=1.0)

        original_value = str(state_input).strip()

        system_prompt = """
        You are a data cleaning expert for a dog adoption database. Your task is to parse and normalize US state names to their standard 2-letter abbreviations.

        Examples:
        - "California" -> "CA"
        - "california" -> "CA"
        - "CA" -> "CA"
        - "ca" -> "CA"
        - "New York" -> "NY"
        - "new york" -> "NY"
        - "North Carolina" -> "NC"
        - "north carolina" -> "NC"

        Rules:
        1. Always return 2-letter uppercase state abbreviation
        2. Handle full names, abbreviations, and variations
        3. If not a valid US state, return null
        4. Handle common misspellings intelligently

        Respond with ONLY a JSON object:
        {
            "state": "XX" or null,
            "confidence": float (0.0-1.0),
            "explanation": "brief explanation of normalization",
            "is_valid": boolean
        }
        """

        user_message = f"Normalize this state value: '{original_value}'"

        try:
            response = self._call_bedrock_converse(
                self.models['Claude 3.7 Sonnet'],
                [{"role": "user", "content": user_message}],
                system_prompt
            )

            content = response['content'][0]['text']
            result = json.loads(content)

            return ValidationResult(
                value=result.get('state'),
                is_valid=result.get('is_valid', False),
                original_value=original_value,
                confidence=result.get('confidence', 0.0),
                warnings=[result.get('explanation', '')] if result.get('explanation') else [],
                model_used='Claude 3.7 Sonnet'
            )

        except Exception as e:
            logger.error(f"Failed to parse state '{original_value}' with Bedrock: {e}")
            return ValidationResult(
                value=None,
                is_valid=False,
                original_value=original_value,
                error_message=f"Bedrock parsing failed: {str(e)}"
            )

    def clean_color_with_bedrock(self, color_input: Any) -> ValidationResult:
        """
        Use Claude to intelligently parse and normalize color data.
        """
        if color_input is None:
            return ValidationResult(None, True, None, confidence=1.0)

        original_value = str(color_input).strip()

        system_prompt = """
        You are a data cleaning expert for a dog adoption database. Your task is to parse and normalize dog color descriptions to standard color names.

        Standard colors for Labrador Retrievers:
        - Black, Yellow, Chocolate, Golden, Cream, Red, Silver, Charcoal

        Examples:
        - "black" -> "Black"
        - "BLACK" -> "Black"
        - "dark black" -> "Black"
        - "yellow" -> "Yellow"
        - "golden yellow" -> "Golden"
        - "chocolate brown" -> "Chocolate"
        - "light yellow" -> "Cream"
        - "reddish" -> "Red"
        - "silver gray" -> "Silver"

        Rules:
        1. Normalize to standard color names
        2. Handle variations and descriptions
        3. If color is unclear, return null
        4. Use title case for color names

        Respond with ONLY a JSON object:
        {
            "color": "ColorName" or null,
            "confidence": float (0.0-1.0),
            "explanation": "brief explanation of normalization",
            "is_valid": boolean
        }
        """

        user_message = f"Normalize this color value: '{original_value}'"

        try:
            response = self._call_bedrock_converse(
                self.models['Claude 3.7 Sonnet'],
                [{"role": "user", "content": user_message}],
                system_prompt
            )

            content = response['content'][0]['text']
            result = json.loads(content)

            return ValidationResult(
                value=result.get('color'),
                is_valid=result.get('is_valid', False),
                original_value=original_value,
                confidence=result.get('confidence', 0.0),
                warnings=[result.get('explanation', '')] if result.get('explanation') else [],
                model_used='Claude 3.7 Sonnet'
            )

        except Exception as e:
            logger.error(f"Failed to parse color '{original_value}' with Bedrock: {e}")
            return ValidationResult(
                value=None,
                is_valid=False,
                original_value=original_value,
                error_message=f"Bedrock parsing failed: {str(e)}"
            )

    def validate_dog_breed_with_bedrock(self, species_input: Any) -> ValidationResult:
        """
        Use Claude to validate if the dog is actually a Labrador Retriever.
        """
        if species_input is None:
            return ValidationResult(None, True, None, confidence=1.0)

        original_value = str(species_input).strip()

        system_prompt = """
        You are a dog breed validation expert for a Labrador Retriever adoption database. Your task is to determine if a dog description matches a Labrador Retriever.

        Labrador Retriever characteristics:
        - Medium to large size
        - Short, dense coat
        - Three main colors: Black, Yellow, Chocolate
        - Friendly, outgoing temperament
        - Good with families and children
        - Intelligent and trainable

        Common Labrador Retriever names/variations:
        - Labrador Retriever, Lab, Labrador, Yellow Lab, Black Lab, Chocolate Lab
        - English Lab, American Lab, Field Lab, Show Lab

        Rules:
        1. If clearly a Labrador Retriever, return "Labrador Retriever"
        2. If mixed breed with Lab, return "Labrador Retriever Mix"
        3. If not a Lab or Lab mix, return null
        4. If unclear, return null

        Respond with ONLY a JSON object:
        {
            "breed": "Labrador Retriever" or "Labrador Retriever Mix" or null,
            "confidence": float (0.0-1.0),
            "explanation": "brief explanation of breed determination",
            "is_valid": boolean
        }
        """

        user_message = f"Validate if this is a Labrador Retriever: '{original_value}'"

        try:
            response = self._call_bedrock_converse(
                self.models['Claude 3.7 Sonnet'],
                [{"role": "user", "content": user_message}],
                system_prompt
            )

            content = response['content'][0]['text']
            result = json.loads(content)

            return ValidationResult(
                value=result.get('breed'),
                is_valid=result.get('is_valid', False),
                original_value=original_value,
                confidence=result.get('confidence', 0.0),
                warnings=[result.get('explanation', '')] if result.get('explanation') else [],
                model_used='Claude 3.7 Sonnet'
            )

        except Exception as e:
            logger.error(f"Failed to validate breed '{original_value}' with Bedrock: {e}")
            return ValidationResult(
                value=None,
                is_valid=False,
                original_value=original_value,
                error_message=f"Bedrock validation failed: {str(e)}"
            )

    def clean_text_field_with_bedrock(self, text_input: Any, field_name: str,
                                      max_length: int = 255) -> ValidationResult:
        """
        Use Claude to clean and validate text fields.
        """
        if text_input is None:
            return ValidationResult(None, True, None, confidence=1.0)

        original_value = str(text_input).strip()

        system_prompt = f"""
        You are a data cleaning expert for a dog adoption database. Your task is to clean and validate the '{field_name}' field.

        Rules:
        1. Remove excessive whitespace and normalize spacing
        2. Remove inappropriate content or profanity
        3. Truncate to {max_length} characters if needed
        4. Maintain meaningful content
        5. If content is completely inappropriate, return null

        Respond with ONLY a JSON object:
        {{
            "text": "cleaned text" or null,
            "confidence": float (0.0-1.0),
            "explanation": "brief explanation of cleaning",
            "is_valid": boolean
        }}
        """

        user_message = f"Clean this {field_name} value: '{original_value}'"

        try:
            response = self._call_bedrock_converse(
                self.models['Claude 3.7 Sonnet'],
                [{"role": "user", "content": user_message}],
                system_prompt
            )

            content = response['content'][0]['text']
            result = json.loads(content)

            return ValidationResult(
                value=result.get('text'),
                is_valid=result.get('is_valid', False),
                original_value=original_value,
                confidence=result.get('confidence', 0.0),
                warnings=[result.get('explanation', '')] if result.get('explanation') else [],
                model_used='Claude 3.7 Sonnet'
            )

        except Exception as e:
            logger.error(f"Failed to clean text '{original_value}' with Bedrock: {e}")
            return ValidationResult(
                value=None,
                is_valid=False,
                original_value=original_value,
                error_message=f"Bedrock cleaning failed: {str(e)}"
            )

    def validate_dog_data_batch_with_bedrock(self, data: Dict[str, Any]) -> Dict[str, ValidationResult]:
        """
        Batch validate all dog data fields in a single Bedrock call.
        """
        system_prompt = (
            "You are a data cleaning and validation expert for a dog adoption database. "
            "Given a JSON object with dog data fields, clean and validate each field as described below. "
            "Return a single JSON object with the cleaned/validated values, confidence (0.0-1.0), explanation, and is_valid for each field. "
            "If a field is missing or cannot be cleaned, set its value to null and is_valid to false.\n"
            "Fields: name, shelter_name, city, state, species, description, color, weight, birthday, shelter_entry_date.\n"
            "- name: Clean and validate the dog's name (no profanity, max 100 chars).\n"
            "- shelter_name: Clean and validate the shelter name (max 100 chars).\n"
            "- city: Clean and validate the city (max 50 chars).\n"
            "- state: Normalize to 2-letter US state abbreviation.\n"
            "- species: Validate if this is a Labrador Retriever or Labrador Retriever Mix.\n"
            "- description: Clean and validate the description (max 500 chars).\n"
            "- color: Normalize to standard Labrador Retriever colors (Black, Yellow, Chocolate, Golden, Cream, Red, Silver, Charcoal).\n"
            "- weight: Parse and convert to pounds (float).\n"
            "- birthday: Parse to YYYY-MM-DD.\n"
            "- shelter_entry_date: Parse to YYYY-MM-DD.\n"
            "Respond with ONLY a JSON object in this format:\n"
            "{\n"
            "  'name': {'value': ..., 'is_valid': ..., 'confidence': ..., 'explanation': ...},\n"
            "  'shelter_name': {...},\n"
            "  ...\n"
            "}"
        )
        user_message = f"Clean and validate this dog data: {json.dumps(data)}"
        try:
            response = self._call_bedrock_converse(
                self.models['Claude 3.7 Sonnet'],
                [{"role": "user", "content": user_message}],
                system_prompt
            )
            content = response['content'][0]['text']
            result = json.loads(content)
            out = {}
            for field in [
                'name', 'shelter_name', 'city', 'state', 'species', 'description', 'color', 'weight', 'birthday',
                'shelter_entry_date']:
                field_result = result.get(field, {})
                out[field] = ValidationResult(
                    value=field_result.get('value'),
                    is_valid=field_result.get('is_valid', False),
                    original_value=data.get(field),
                    confidence=field_result.get('confidence', 0.0),
                    warnings=[field_result.get('explanation', '')] if field_result.get('explanation') else [],
                    model_used='Claude 3.7 Sonnet'
                )
            return out
        except Exception as e:
            logger.error(f"Failed to batch-validate dog data with Bedrock: {e}")
            # Fallback: mark all fields as invalid
            return {field: ValidationResult(
                value=None,
                is_valid=False,
                original_value=data.get(field),
                error_message=f"Bedrock batch validation failed: {str(e)}"
            ) for field in data}

    def get_cleaned_data(self, validation_results: Dict[str, ValidationResult]) -> Dict[str, Any]:
        """
        Extract cleaned values from validation results.
        """
        cleaned_data = {}
        for field, result in validation_results.items():
            if result.is_valid and result.value is not None:
                cleaned_data[field] = result.value
            else:
                logger.warning(f"Field {field} validation failed: {result.error_message}")

        return cleaned_data

    def log_validation_results(self, validation_results: Dict[str, ValidationResult], dog_id: str):
        """
        Log all validation results for a dog.
        """
        for field, result in validation_results.items():
            if result.warnings:
                for warning in result.warnings:
                    logger.info(f"Dog {dog_id} - {field}: {warning}")
            if not result.is_valid:
                logger.warning(f"Dog {dog_id} - {field}: {result.error_message}")
            if result.confidence < 0.7:
                logger.warning(f"Dog {dog_id} - {field}: Low confidence ({result.confidence})")

    def classify_image_with_nova(self, image_bytes: bytes) -> dict:
        """
        Classify an image as Labrador Retriever or not using Claude 3.7 Sonnet via Bedrock.
        """
        import base64
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        system_prompt = (
            "You are an expert dog breed classifier. Given a base64-encoded image, determine if the dog is a Labrador Retriever. "
            "If you are not sure, err on the side of caution and return false. "
            "Respond ONLY with a JSON object: { 'is_labrador': true/false, 'confidence': float, 'explanation': str }"
        )
        user_message = (
                "Classify this image (base64-encoded, jpg or png):\n" + image_b64
        )
        try:
            response = self._call_bedrock_converse(
                self.models['Claude 3.7 Sonnet'],
                [{"role": "user", "content": user_message}],
                system_prompt
            )
            content = response['content'][0]['text']
            result = json.loads(content)
            return {
                "is_labrador": result.get("is_labrador", False),
                "confidence": result.get("confidence", 0.0),
                "explanation": result.get("explanation", "No explanation provided.")
            }
        except Exception as e:
            logger.error(f"Failed to classify image with Claude: {e}")
            return {
                "is_labrador": False,
                "confidence": 0.0,
                "explanation": f"Classification failed: {str(e)}"
            }

    def classify_image_with_rekognition(self, image_bytes: bytes) -> dict:
        """
        Classify an image as Labrador Retriever or not using Amazon Rekognition.
        """
        rekognition = boto3.client('rekognition')
        try:
            response = rekognition.detect_labels(
                Image={'Bytes': image_bytes},
                MaxLabels=20,
                MinConfidence=70
            )
            labels = response.get('Labels', [])
            explanation = []
            is_labrador = False
            labrador_conf = 0.0
            for label in labels:
                explanation.append(f"{label['Name']} ({label['Confidence']:.1f}%)")
                if label['Name'].lower() in ["labrador retriever", "labrador", "lab"]:
                    is_labrador = True
                    labrador_conf = max(labrador_conf, label['Confidence'])
            return {
                "is_labrador": is_labrador,
                "confidence": labrador_conf if is_labrador else 0.0,
                "explanation": ", ".join(explanation)
            }
        except Exception as e:
            logger.error(f"Failed to classify image with Rekognition: {e}")
            return {
                "is_labrador": False,
                "confidence": 0.0,
                "explanation": f"Rekognition classification failed: {str(e)}"
            }

    def generate_image_with_nova(self, description: str) -> dict:
        """
        Generate a Labrador Retriever image from a description using Amazon Nova Canvas via Bedrock.
        Returns a dict with image_base64 and explanation.
        """
        try:
            body = {
                "taskType": "TEXT_IMAGE",
                "textToImageParams": {
                    "text": f"A Labrador Retriever dog, {description}"
                },
                "imageGenerationConfig": {
                    "numberOfImages": 1,
                    "height": 1024,
                    "width": 1024,
                    "quality": "standard"
                }
            }
            
            response = self.bedrock_runtime.invoke_model(
                modelId=self.models["Amazon Nova Canvas"],
                body=json.dumps(body)
            )
            
            response_body = json.loads(response.get('body').read())
            
            if 'images' in response_body and response_body['images']:
                return {
                    "image_base64": response_body['images'][0],
                    "explanation": "Generated by Amazon Nova Canvas from description."
                }
            
            return {
                "image_base64": None,
                "explanation": "No image generated in response."
            }
            
        except Exception as e:
            logger.error(f"Failed to generate image with Nova Canvas: {e}")
            return {
                "image_base64": None,
                "explanation": f"Image generation failed: {str(e)}"
            }
    
    def analyze_image_sentiment(self, image_bytes: bytes) -> dict:
        """
        Analyze dog image for personality and emotional tags using Claude vision.
        Returns sentiment tags based on visual cues.
        """
        try:
            import base64
            image_b64 = base64.b64encode(image_bytes).decode('utf-8')
            
            prompt = """Analyze this dog image and provide 3-5 personality/emotional tags based on the dog's appearance, body language, and expression. 
            
Look for visual cues like:
- Facial expression (happy, calm, alert, playful)
- Body posture (relaxed, energetic, confident, shy)
- Eyes and ears (bright, attentive, gentle, curious)
- Overall demeanor
            
Return only the tags as a comma-separated list (e.g., "playful, energetic, friendly, alert, happy")."""
            
            response = self.bedrock_runtime.converse(
                modelId=self.models["Claude 3.7 Sonnet"],
                messages=[{
                    "role": "user",
                    "content": [
                        {"text": prompt},
                        {
                            "image": {
                                "format": "jpeg",
                                "source": {"bytes": image_bytes}
                            }
                        }
                    ]
                }]
            )
            
            tags_text = response['output']['message']['content'][0]['text'].strip()
            tags = [tag.strip() for tag in tags_text.split(',') if tag.strip()]
            
            return {
                "tags": tags[:5],  # Limit to 5 tags
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze image sentiment: {e}")
            return {
                "tags": [],
                "success": False,
                "error": str(e)
            }
    
    def analyze_sentiment(self, description: str) -> dict:
        """
        Analyze sentiment and emotions of dog description using Claude.
        Returns sentiment tags and keywords.
        """
        try:
            prompt = f"""Analyze the sentiment and emotions in this dog description and provide 3-5 relevant tags/keywords that describe the dog's personality and emotional state. Return only the tags as a comma-separated list.

Description: {description}

Tags:"""
            
            response = self.bedrock_runtime.converse(
                modelId=self.models["Claude 3.7 Sonnet"],
                messages=[{
                    "role": "user",
                    "content": [{"text": prompt}]
                }]
            )
            
            tags_text = response['output']['message']['content'][0]['text'].strip()
            tags = [tag.strip() for tag in tags_text.split(',') if tag.strip()]
            
            return {
                "tags": tags[:5],  # Limit to 5 tags
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze sentiment: {e}")
            return {
                "tags": [],
                "success": False,
                "error": str(e)
            }
    
    def extract_text_from_document(self, document_bytes: bytes, file_type: str = None) -> dict:
        """
        Extract text from document using Amazon Textract for PDFs/images or direct text reading for .txt/.csv files.
        """
        try:
            extracted_text = ""
            
            # Handle text files directly
            if file_type and file_type.lower() in ['.txt', '.csv']:
                try:
                    extracted_text = document_bytes.decode('utf-8')
                except UnicodeDecodeError:
                    # Try other encodings
                    for encoding in ['latin-1', 'cp1252', 'iso-8859-1']:
                        try:
                            extracted_text = document_bytes.decode(encoding)
                            break
                        except UnicodeDecodeError:
                            continue
                    if not extracted_text:
                        return {
                            "success": False,
                            "error": "Could not decode text file"
                        }
            else:
                # Use Textract for PDFs and images
                import boto3
                textract = boto3.client('textract')
                
                response = textract.detect_document_text(
                    Document={'Bytes': document_bytes}
                )
                
                # Extract all text
                for block in response['Blocks']:
                    if block['BlockType'] == 'LINE':
                        extracted_text += block['Text'] + "\n"
            
            # Use Claude to parse the extracted text into structured data
            prompt = f"""Extract dog adoption information from this text. Return ONLY a valid JSON object with these fields (use null for missing values):

{{
  "name": "dog name or null",
  "shelter_name": "shelter name or null", 
  "city": "city or null",
  "state": "state or null",
  "species": "species or null",
  "description": "description or null",
  "birthday": "YYYY-MM-DD format or null",
  "weight": number or null,
  "color": "color or null"
}}

Do not include any explanation, markdown, or extra text. Return only the JSON object.

Text to parse:
{extracted_text}"""
            
            response = self.bedrock_runtime.converse(
                modelId=self.models["Claude 3.7 Sonnet"],
                messages=[{
                    "role": "user",
                    "content": [{"text": prompt}]
                }]
            )
            
            parsed_text = response['output']['message']['content'][0]['text'].strip()
            
            # Clean the response - remove markdown code blocks if present
            if parsed_text.startswith('```json'):
                parsed_text = parsed_text[7:]  # Remove ```json
            if parsed_text.startswith('```'):
                parsed_text = parsed_text[3:]   # Remove ```
            if parsed_text.endswith('```'):
                parsed_text = parsed_text[:-3]  # Remove ```
            parsed_text = parsed_text.strip()
            
            try:
                import json
                dog_data = json.loads(parsed_text)
                return {
                    "success": True,
                    "extracted_text": extracted_text,
                    "dog_data": dog_data
                }
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing failed: {e}")
                logger.error(f"Raw Claude response: {parsed_text}")
                return {
                    "success": False,
                    "error": f"Failed to parse extracted data: {str(e)}",
                    "extracted_text": extracted_text,
                    "raw_response": parsed_text
                }
                
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def match_user_to_dogs(self, user_preferences: dict, available_dogs: list) -> dict:
        """
        Use Claude to match user preferences with available dogs.
        """
        try:
            dogs_summary = []
            for dog in available_dogs:
                dogs_summary.append({
                    "dog_id": dog["dog_id"],
                    "name": dog["name"],
                    "age": dog.get("age", "unknown"),
                    "weight": dog.get("weight", "unknown"),
                    "color": dog.get("color", "unknown"),
                    "description": dog.get("description", ""),
                    "sentiment_tags": dog.get("sentiment_tags", [])
                })
            
            prompt = f"""You are a dog adoption expert. Match this user with the best dogs from the available options.

User Preferences:
{json.dumps(user_preferences, indent=2)}

Available Dogs:
{json.dumps(dogs_summary, indent=2)}

Return ONLY a JSON object with this format:
{{
  "matches": [
    {{
      "dog_id": "dog_id",
      "match_score": 0.95,
      "reasons": ["reason1", "reason2"]
    }}
  ]
}}

Rank by best match (highest score first). Include top 5 matches or all available dogs if fewer than 5."""
            
            response = self.bedrock_runtime.converse(
                modelId=self.models["Claude 3.7 Sonnet"],
                messages=[{
                    "role": "user",
                    "content": [{"text": prompt}]
                }],
                inferenceConfig={
                    "maxTokens": 1000,
                    "temperature": 0.3,
                    "topP": 0.9
                }
            )
            
            result_text = response['output']['message']['content'][0]['text'].strip()
            logger.info(f"Claude matching response: {result_text}")
            
            # Clean the response - remove markdown code blocks
            if result_text.startswith('```json'):
                result_text = result_text[7:]  # Remove ```json
            if result_text.endswith('```'):
                result_text = result_text[:-3]  # Remove ```
            result_text = result_text.strip()
            
            try:
                matches = json.loads(result_text)
                return {
                    "success": True,
                    "matches": matches.get("matches", [])
                }
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing failed: {e}")
                logger.error(f"Raw response: {result_text}")
                return {
                    "success": False,
                    "error": f"Failed to parse matching results: {str(e)}"
                }
                
        except Exception as e:
            logger.error(f"Dog matching failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }


# Global validator instance
bedrock_validator = BedrockValidator()
