from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class Dog(Base):
    __tablename__ = "dogs"

    id = Column(Integer, primary_key=True, index=True)
    dog_id = Column(String, unique=True, index=True, nullable=False)
    breed_id = Column(Integer, ForeignKey("breeds.id"), nullable=True)

    # Image keys
    original_key = Column(String, nullable=True)
    resized_400_key = Column(String, nullable=True)
    thumbnail_50_key = Column(String, nullable=True)

    # Shelter details
    shelter_name = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    shelter_entry_date = Column(Date, nullable=True)

    # Dog details
    name = Column(String, nullable=True)
    species = Column(String, nullable=True)
    description = Column(String, nullable=True)
    birthday = Column(Date, nullable=True)
    weight = Column(Integer, nullable=True)
    color = Column(String, nullable=True)
    sentiment_tags = Column(String, nullable=True)  # Store comma-separated tags

    # Engagement metrics
    wags = Column(Integer, default=0)
    growls = Column(Integer, default=0)

    # Sharing
    share_url = Column(String, nullable=True)

    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    breed = relationship("Breed", back_populates="dogs")


class Breed(Base):
    __tablename__ = "breeds"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)

    dogs = relationship("Dog", back_populates="breed")


class UserWag(Base):
    __tablename__ = "user_wags"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    dog_id = Column(String, ForeignKey("dogs.dog_id"), nullable=False)
    type = Column(String, nullable=False)  # 'wag' or 'growl'
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
