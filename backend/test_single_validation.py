#!/usr/bin/env python3
"""
Simple test for a single validation to see if Bedrock is working.
"""

import sys
import os

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.bedrock_validator import bedrock_validator


def test_single_weight():
    """Test a single weight validation."""
    print("Testing weight validation...")

    result = bedrock_validator.clean_weight_with_bedrock('thirty two pounds')

    print(f"Original: 'thirty two pounds'")
    print(f"Cleaned: {result.value}")
    print(f"Valid: {result.is_valid}")
    print(f"Confidence: {result.confidence}")
    print(f"Warnings: {result.warnings}")
    if result.error_message:
        print(f"Error: {result.error_message}")


if __name__ == "__main__":
    test_single_weight()