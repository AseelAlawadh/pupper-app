import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    Process dog events from SQS queue
    """
    for record in event['Records']:
        try:
            # Parse SNS message from SQS
            sns_message = json.loads(record['body'])
            message = json.loads(sns_message['Message'])
            
            event_type = message.get('event_type')
            dog_data = message.get('data', {})
            
            logger.info(f"Processing event: {event_type} for dog: {dog_data.get('dog_id')}")
            
            if event_type == 'dog_created':
                process_dog_created(dog_data)
            elif event_type == 'dog_wagged':
                process_dog_wagged(dog_data)
            elif event_type == 'dog_matched':
                process_dog_matched(dog_data)
                
        except Exception as e:
            logger.error(f"Error processing event: {str(e)}")
            raise

def process_dog_created(dog_data):
    """Process dog creation event"""
    logger.info(f"New dog created: {dog_data.get('name')} ({dog_data.get('dog_id')})")

def process_dog_wagged(dog_data):
    """Process dog wag event"""
    logger.info(f"Dog wagged: {dog_data.get('dog_id')} by user {dog_data.get('user_id')}")

def process_dog_matched(dog_data):
    """Process dog matching event"""
    logger.info(f"Dog matching performed for user preferences: {dog_data.get('preferences')}")