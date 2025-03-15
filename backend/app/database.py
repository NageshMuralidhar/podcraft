from motor.motor_asyncio import AsyncIOMotorClient
from decouple import config

MONGODB_URL = config('MONGODB_URL')
client = AsyncIOMotorClient(MONGODB_URL)
db = client.podcraft

# Collections
users = db.users
podcasts = db.podcasts
agents = db.agents  # New collection for storing agent configurations 