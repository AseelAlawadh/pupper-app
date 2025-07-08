#!/usr/bin/env python3
"""
Simple test to check Bedrock connectivity and available models.
"""

import boto3
import json
import sys
import os

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))


def test_bedrock_connectivity():
    """Test basic Bedrock connectivity."""
    print("Testing Bedrock connectivity...")

    try:
        # Create Bedrock client
        bedrock = boto3.client(
            service_name='bedrock-runtime',
            region_name='us-east-1'
        )
        print("✅ Bedrock client created successfully")

        # Test with a simple model
        test_model = "anthropic.claude-3-haiku-20240307-v1:0"

        # Simple test message
        test_message = {
            "messages": [
                {
                    "role": "user",
                    "content": "Hello, can you respond with just 'OK'?"
                }
            ],
            "anthropic_version": "bedrock-2023-05-31"
        }

        print(f"Testing with model: {test_model}")

        response = bedrock.invoke_model(
            modelId=test_model,
            body=json.dumps(test_message)
        )

        response_body = json.loads(response.get('body').read())
        print("✅ Bedrock API call successful!")
        print(f"Response: {response_body}")

        return True

    except Exception as e:
        print(f"❌ Bedrock test failed: {e}")
        return False


def test_available_models():
    """List available Bedrock models."""
    print("\nChecking available models...")

    try:
        bedrock = boto3.client(
            service_name='bedrock',
            region_name='us-east-1'
        )

        response = bedrock.list_foundation_models()

        print("Available models:")
        for model in response['modelSummaries']:
            print(f"  - {model['modelId']}")

        return True

    except Exception as e:
        print(f"❌ Failed to list models: {e}")
        return False


def main():
    """Run connectivity tests."""
    print("Bedrock Connectivity Test")
    print("=" * 40)

    # Test basic connectivity
    if test_bedrock_connectivity():
        print("\n✅ Bedrock is working!")
    else:
        print("\n❌ Bedrock connectivity failed")

    # List available models
    test_available_models()


if __name__ == "__main__":
    main() 