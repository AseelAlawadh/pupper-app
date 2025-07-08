# Amazon Bedrock Data Validation System

This system uses Amazon Bedrock's Converse API with Claude Sonnet 3.7 to intelligently validate and clean malformed shelter data for the Pupper dog adoption application.

## Overview

The Bedrock validation system replaces traditional regex-based validation with AI-powered parsing that can handle:
- Text numbers ("thirty two pounds" → 32.0)
- Various date formats (MM/DD/YYYY, DD/MM/YYYY, text dates)
- State name variations (full names → abbreviations)
- Color descriptions (normalized to standard colors)
- Breed validation (ensures only Labrador Retrievers)
- Text cleaning and normalization

## Features

### 1. Weight Validation
Handles various weight formats:
- "32 pounds" → 32.0
- "32.5 lbs" → 32.5
- "thirty two pounds" → 32.0
- "15 kilos" → 33.1 (converts kg to lbs)
- "30-35 pounds" → 32.5 (averages ranges)
- "about 30 pounds" → 30.0

### 2. Date Validation
Supports multiple date formats:
- "12/25/2023" → 2023-12-25
- "December 25, 2023" → 2023-12-25
- "25/12/2023" → 2023-12-25
- "2023-12-25" → 2023-12-25

### 3. State Normalization
Converts state names to standard abbreviations:
- "California" → "CA"
- "california" → "CA"
- "New York" → "NY"
- "north carolina" → "NC"

### 4. Color Normalization
Standardizes color descriptions:
- "dark black" → "Black"
- "golden yellow" → "Golden"
- "chocolate brown" → "Chocolate"
- "light yellow" → "Cream"

### 5. Breed Validation
Ensures only Labrador Retrievers are accepted:
- "Labrador Retriever" → "Labrador Retriever" ✅
- "Lab" → "Labrador Retriever" ✅
- "Golden Retriever" → null ❌
- "German Shepherd" → null ❌

## Setup

### 1. AWS Permissions
Ensure your Lambda function has the following IAM permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel"
            ],
            "Resource": [
                "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v1:0"
            ]
        }
    ]
}
```

### 2. Environment Variables
Set the following environment variables:
```bash
AWS_REGION=us-east-1  # or your preferred region
BEDROCK_ENDPOINT_URL=https://bedrock-runtime.us-east-1.amazonaws.com  # optional
```

### 3. Dependencies
Install the required packages:
```bash
pip install -r requirements_bedrock.txt
```

## Usage

### Basic Usage
```python
from app.bedrock_validator import bedrock_validator

# Validate a single field
weight_result = bedrock_validator.clean_weight_with_bedrock("thirty two pounds")
print(weight_result.value)  # 32.0
print(weight_result.confidence)  # 0.95
print(weight_result.warnings)  # ["Converted text 'thirty two pounds' to 32.0 pounds"]

# Validate complete dog data
dog_data = {
    'name': 'Fido',
    'weight': 'thirty two pounds',
    'state': 'virginia',
    'color': 'dark black',
    'birthday': '4/23/2014'
}

validation_results = bedrock_validator.validate_dog_data_comprehensive(dog_data)
cleaned_data = bedrock_validator.get_cleaned_data(validation_results)
```

### API Integration
The validation is automatically integrated into the `/dogs/create_with_image` endpoint:

```python
# The endpoint now accepts malformed data and cleans it automatically
response = await client.post("/dogs/create_with_image", data={
    "name": "Fido",
    "weight": "thirty two pounds",  # Will be converted to 32.0
    "state": "virginia",            # Will be converted to "VA"
    "color": "dark black",          # Will be converted to "Black"
    "birthday": "4/23/2014"         # Will be converted to 2014-04-23
})
```

## Testing

Run the test suite to see the validation in action:

```bash
cd backend
python test_bedrock_validation.py
```

This will test various malformed inputs and show how they're cleaned.

## Response Format

The API now returns detailed validation information:

```json
{
    "message": "Dog 'Fido' created with image successfully.",
    "dog_id": "uuid-here",
    "image_keys": ["...", "...", "..."],
    "validation_summary": {
        "total_fields": 10,
        "valid_fields": 9,
        "warnings": [
            "weight: Converted text 'thirty two pounds' to 32.0 pounds",
            "state: Converted 'virginia' to VA"
        ]
    },
    "cleaned_data": {
        "name": "Fido",
        "weight": 32.0,
        "state": "VA",
        "color": "Black",
        "birthday": "2014-04-23"
    }
}
```

## Error Handling

### Invalid Breed
If a non-Labrador Retriever is submitted:
```json
{
    "error": "Invalid breed",
    "message": "Only Labrador Retrievers are accepted. Please ensure the dog is a Labrador Retriever.",
    "original_species": "Golden Retriever",
    "validation_details": "Not a Labrador Retriever"
}
```

### Validation Failures
Individual field validation failures are logged and the field is set to null:
```python
# In logs:
# WARNING: Dog uuid-here - weight: Could not parse weight: 'invalid weight'
```

## Performance Considerations

- Each field validation makes a Bedrock API call
- Consider caching common validations
- Monitor API costs and usage
- Set appropriate timeouts for API calls

## Monitoring

The system logs detailed validation information:
- Validation warnings and errors
- Confidence scores for each field
- Original vs cleaned values
- Model used for each validation

## Future Enhancements

1. **Image Analysis**: Use Nova models to validate dog images
2. **Sentiment Analysis**: Analyze dog descriptions for emotional content
3. **Data Quality Scoring**: Overall data quality assessment
4. **Batch Processing**: Validate multiple records efficiently
5. **Custom Models**: Fine-tune models for specific shelter data patterns

## Troubleshooting

### Common Issues

1. **Bedrock API Errors**: Check IAM permissions and region configuration
2. **Timeout Errors**: Increase Lambda timeout for complex validations
3. **Memory Issues**: Monitor Lambda memory usage during validation
4. **Cost Concerns**: Implement caching to reduce API calls

### Debug Mode
Enable detailed logging:
```python
import logging
logging.getLogger("app.bedrock_validator").setLevel(logging.DEBUG)
```

## Security

- All API calls use AWS IAM authentication
- No sensitive data is sent to Bedrock (only validation data)
- Validation results are logged for audit purposes
- Input sanitization prevents injection attacks 