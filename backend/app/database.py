from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import json
import boto3

# Load secrets (same logic as in main.py)
if "DB_SECRET_ARN" in os.environ:
    secrets_client = boto3.client("secretsmanager")
    secret_arn = os.environ["DB_SECRET_ARN"]
    get_secret_value_response = secrets_client.get_secret_value(SecretId=secret_arn)
    secret_dict = json.loads(get_secret_value_response["SecretString"])

    DB_HOST = os.environ["DB_HOST"]
    DB_USER = secret_dict["username"]
    DB_PASSWORD = secret_dict["password"]
    DB_NAME = "pupperdb"
else:
    # Local dev defaults
    DB_HOST = "localhost"
    DB_USER = "postgres"
    DB_PASSWORD = "password"
    DB_NAME = "local_pupper"

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:5432/{DB_NAME}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


#
# DATABASE_URL = "postgresql://postgres:password@localhost:5432/local_pupper"


def init_db():
    from models import Dog, Breed
    Base.metadata.create_all(bind=engine)
    print("create DB done ✅")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
