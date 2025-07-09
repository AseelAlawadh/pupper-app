#!/usr/bin/env python3
"""
Script to update sentiment analysis calls from description-based to image-based
"""

import re

def update_sentiment_calls():
    with open('backend/app/main.py', 'r') as f:
        content = f.read()
    
    # Replace the first occurrence in create_with_image
    content = re.sub(
        r'bedrock_validator\.analyze_sentiment\(cleaned_data\.get\(\'description\'\)\)',
        'bedrock_validator.analyze_image_sentiment(contents)',
        content,
        count=1
    )
    
    # Update log messages
    content = content.replace(
        'Analyzing sentiment for description:',
        'Analyzing sentiment from dog image'
    )
    content = content.replace(
        'Sentiment analysis result:',
        'Image sentiment analysis result:'
    )
    content = content.replace(
        'Generated sentiment tags:',
        'Generated image sentiment tags:'
    )
    
    with open('backend/app/main.py', 'w') as f:
        f.write(content)
    
    print("Updated sentiment analysis calls")

if __name__ == '__main__':
    update_sentiment_calls()