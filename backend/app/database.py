from motor.motor_asyncio import AsyncIOMotorClient
from decouple import config
import ssl
import certifi
import logging
import os
import json
from typing import Dict, List, Optional, Any

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check if we should use mock database
USE_MOCK_DB = False  # Set to False to use real MongoDB

if not USE_MOCK_DB:
    # Get MongoDB connection string from environment variables
    MONGODB_URL = config('MONGODB_URL')

    # Create a client with explicit SSL configuration
    try:
        client = AsyncIOMotorClient(
            MONGODB_URL,
            tlsCAFile=certifi.where(),
            ssl=True,
            connect=False,  # Connect lazily
            serverSelectionTimeoutMS=30000,
            socketTimeoutMS=30000,
            connectTimeoutMS=30000
        )
        # Get database
        db = client.get_database('podcraft')
        # Collections
        users = db.users
        podcasts = db.podcasts
        logger.info("Connected to MongoDB Atlas")
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {e}")
        # Fall back to mock database
        USE_MOCK_DB = True

# Mock database implementation
if USE_MOCK_DB:
    logger.info("Using mock database for development")
    
    class MockCollection:
        def __init__(self, name):
            self.name = name
            self.data = []
            self.data_file = f"mock_{name}.json"
            
            # Load data from file if it exists
            if os.path.exists(self.data_file):
                try:
                    with open(self.data_file, 'r') as f:
                        self.data = json.load(f)
                except Exception as e:
                    logger.error(f"Error loading mock data: {e}")
        
        def _save_data(self):
            try:
                with open(self.data_file, 'w') as f:
                    json.dump(self.data, f)
            except Exception as e:
                logger.error(f"Error saving mock data: {e}")
        
        async def find_one(self, query: Dict) -> Optional[Dict]:
            for item in self.data:
                match = True
                for key, value in query.items():
                    if key not in item or item[key] != value:
                        match = False
                        break
                if match:
                    return item
            return None
        
        async def insert_one(self, document: Dict) -> Any:
            # Add _id if not present
            if '_id' not in document:
                # Generate a simple ID
                document['_id'] = str(len(self.data) + 1)
            
            self.data.append(document)
            self._save_data()
            
            class InsertResult:
                def __init__(self, inserted_id):
                    self.inserted_id = inserted_id
            
            return InsertResult(document['_id'])
        
        async def find(self, query: Dict = None) -> List[Dict]:
            if query is None:
                return self.data
            
            results = []
            for item in self.data:
                match = True
                for key, value in query.items():
                    if key not in item or item[key] != value:
                        match = False
                        break
                if match:
                    results.append(item)
            
            return results
    
    # Create mock collections
    users = MockCollection("users")
    podcasts = MockCollection("podcasts")

logger.info("Database setup complete") 