#!/usr/bin/env python3
"""
Test script to demonstrate Bedrock data validation capabilities.
This script shows how the system handles various malformed shelter data formats.
"""

import sys
import os
import json
from datetime import datetime

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.bedrock_validator import bedrock_validator


def test_weight_validation():
    """Test weight validation with various malformed inputs."""
    print("=== Testing Weight Validation ===")

    test_cases = [
        "32 pounds",
        "32.5 lbs",
        "thirty two pounds",
        "15 kilos",
        "15 kg",
        "about 30 pounds",
        "30-35 pounds",
        "medium weight",
        "32",
        "forty five pounds",
        "twenty two lbs",
        "unknown",
        ""
    ]

    for weight_input in test_cases:
        print(f"\nInput: '{weight_input}'")
        result = bedrock_validator.clean_weight_with_bedrock(weight_input)
        print(f"  Valid: {result.is_valid}")
        print(f"  Value: {result.value}")
        print(f"  Confidence: {result.confidence}")
        if result.warnings:
            print(f"  Warnings: {result.warnings}")
        if result.error_message:
            print(f"  Error: {result.error_message}")


def test_date_validation():
    """Test date validation with various malformed inputs."""
    print("\n=== Testing Date Validation ===")

    test_cases = [
        "12/25/2023",
        "25/12/2023",
        "December 25, 2023",
        "Dec 25, 2023",
        "2023-12-25",
        "12-25-2023",
        "25-12-2023",
        "yesterday",
        "last week",
        "invalid date",
        "2023/12/25",
        "25 Dec 2023",
        ""
    ]

    for date_input in test_cases:
        print(f"\nInput: '{date_input}'")
        result = bedrock_validator.clean_date_with_bedrock(date_input)
        print(f"  Valid: {result.is_valid}")
        print(f"  Value: {result.value}")
        print(f"  Confidence: {result.confidence}")
        if result.warnings:
            print(f"  Warnings: {result.warnings}")
        if result.error_message:
            print(f"  Error: {result.error_message}")


def test_state_validation():
    """Test state validation with various malformed inputs."""
    print("\n=== Testing State Validation ===")

    test_cases = [
        "California",
        "california",
        "CA",
        "ca",
        "New York",
        "new york",
        "North Carolina",
        "north carolina",
        "invalid state",
        "TX",
        "texas",
        ""
    ]

    for state_input in test_cases:
        print(f"\nInput: '{state_input}'")
        result = bedrock_validator.clean_state_with_bedrock(state_input)
        print(f"  Valid: {result.is_valid}")
        print(f"  Value: {result.value}")
        print(f"  Confidence: {result.confidence}")
        if result.warnings:
            print(f"  Warnings: {result.warnings}")
        if result.error_message:
            print(f"  Error: {result.error_message}")


def test_color_validation():
    """Test color validation with various malformed inputs."""
    print("\n=== Testing Color Validation ===")

    test_cases = [
        "black",
        "BLACK",
        "dark black",
        "yellow",
        "golden yellow",
        "chocolate brown",
        "light yellow",
        "reddish",
        "silver gray",
        "unknown color",
        "brownish",
        ""
    ]

    for color_input in test_cases:
        print(f"\nInput: '{color_input}'")
        result = bedrock_validator.clean_color_with_bedrock(color_input)
        print(f"  Valid: {result.is_valid}")
        print(f"  Value: {result.value}")
        print(f"  Confidence: {result.confidence}")
        if result.warnings:
            print(f"  Warnings: {result.warnings}")
        if result.error_message:
            print(f"  Error: {result.error_message}")


def test_breed_validation():
    """Test breed validation with various inputs."""
    print("\n=== Testing Breed Validation ===")

    test_cases = [
        "Labrador Retriever",
        "Lab",
        "Labrador",
        "Yellow Lab",
        "Black Lab",
        "Chocolate Lab",
        "Golden Retriever",
        "German Shepherd",
        "Poodle",
        "Lab Mix",
        "unknown breed",
        ""
    ]

    for breed_input in test_cases:
        print(f"\nInput: '{breed_input}'")
        result = bedrock_validator.validate_dog_breed_with_bedrock(breed_input)
        print(f"  Valid: {result.is_valid}")
        print(f"  Value: {result.value}")
        print(f"  Confidence: {result.confidence}")
        if result.warnings:
            print(f"  Warnings: {result.warnings}")
        if result.error_message:
            print(f"  Error: {result.error_message}")


def test_comprehensive_validation():
    """Test comprehensive validation with a complete dog record."""
    print("\n=== Testing Comprehensive Validation ===")

    # Example of malformed shelter data
    malformed_dog_data = {
        'name': '  Fido  ',  # Extra whitespace
        'shelter_name': 'Arlington Shelter',
        'city': 'Arlington',
        'state': 'virginia',  # Full name instead of abbreviation
        'species': 'Labrador Retriever',
        'description': 'Good boy who loves to play fetch',
        'color': 'dark black',  # Descriptive color
        'weight': 'thirty two pounds',  # Text number
        'birthday': '4/23/2014',  # MM/DD/YYYY format
        'shelter_entry_date': '1/7/2019'  # MM/DD/YYYY format
    }

    print("Input data:")
    for key, value in malformed_dog_data.items():
        print(f"  {key}: '{value}'")

    print("\nValidating with Bedrock...")
    validation_results = bedrock_validator.validate_dog_data_comprehensive(malformed_dog_data)

    print("\nValidation results:")
    for field, result in validation_results.items():
        print(f"\n{field}:")
        print(f"  Original: '{result.original_value}'")
        print(f"  Cleaned: {result.value}")
        print(f"  Valid: {result.is_valid}")
        print(f"  Confidence: {result.confidence}")
        if result.warnings:
            print(f"  Warnings: {result.warnings}")
        if result.error_message:
            print(f"  Error: {result.error_message}")

    # Get cleaned data
    cleaned_data = bedrock_validator.get_cleaned_data(validation_results)
    print(f"\nCleaned data: {json.dumps(cleaned_data, default=str, indent=2)}")


def main():
    """Run all validation tests."""
    print("Bedrock Data Validation Test Suite")
    print("=" * 50)

    try:
        test_weight_validation()
        test_date_validation()
        test_state_validation()
        test_color_validation()
        test_breed_validation()
        test_comprehensive_validation()

        print("\n" + "=" * 50)
        print("All tests completed!")

    except Exception as e:
        print(f"Test failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main() 