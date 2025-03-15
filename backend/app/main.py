from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from decouple import config
import logging
from .database import users, podcasts, agents
from .models import (
    UserCreate, UserLogin, Token, UserUpdate, UserResponse,
    PodcastRequest, PodcastResponse, AgentCreate, AgentResponse
)
from .agents.researcher import research_topic, research_topic_stream
from .agents.debaters import generate_debate, generate_debate_stream, chunk_text
from .agents.podcast_manager import PodcastManager
import json
import os
import shutil
from typing import List
import time

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Debug environment variables
openai_key = config('OPENAI_API_KEY')
logger.info(f"Loaded OpenAI API Key at startup: {openai_key[:7]}...")
logger.info(f"Key starts with 'sk-proj-': {openai_key.startswith('sk-proj-')}")
logger.info(f"Key starts with 'sk-': {openai_key.startswith('sk-')}")

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]  # Expose all headers
)

# Create necessary directories if they don't exist
os.makedirs("temp", exist_ok=True)
os.makedirs("temp_audio", exist_ok=True)

# Mount static directory for audio files
app.mount("/audio", StaticFiles(directory="temp"), name="audio")

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
SECRET_KEY = config("SECRET_KEY")
ACCESS_TOKEN_EXPIRE_MINUTES = int(config("ACCESS_TOKEN_EXPIRE_MINUTES"))

# Helper functions
def create_access_token(data: dict):
    expires = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    data.update({"exp": expires})
    token = jwt.encode(data, SECRET_KEY, algorithm="HS256")
    return token

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    logger.info("Authenticating user with token")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )
    try:
        logger.info("Decoding JWT token")
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            logger.error("No username found in token")
            raise credentials_exception
        logger.info(f"Token decoded successfully for user: {username}")
    except JWTError as e:
        logger.error(f"JWT Error: {str(e)}")
        raise credentials_exception
        
    user = await users.find_one({"username": username})
    if user is None:
        logger.error(f"No user found for username: {username}")
        raise credentials_exception
    logger.info(f"User authenticated successfully: {username}")
    return user

# Initialize PodcastManager
podcast_manager = PodcastManager()

# Routes
@app.post("/signup")
async def signup(user: UserCreate):
    # Check if username exists
    if await users.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create new user
    user_dict = user.dict()
    user_dict["password"] = get_password_hash(user.password)
    await users.insert_one(user_dict)
    
    # Create and return token after signup
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    logger.info(f"Token request for user: {form_data.username}")
    # Find user
    db_user = await users.find_one({"username": form_data.username})
    if not db_user or not verify_password(form_data.password, db_user["password"]):
        logger.error(f"Failed token request for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": form_data.username})
    logger.info(f"Token generated successfully for user: {form_data.username}")
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
async def login(request: Request, user: UserLogin):
    logger.info(f"Login attempt for user: {user.username}")
    # Find user
    db_user = await users.find_one({"username": user.username})
    if not db_user or not verify_password(user.password, db_user["password"]):
        logger.error(f"Failed login attempt for user: {user.username}")
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.username})
    logger.info(f"Login successful for user: {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/user/me", response_model=UserResponse)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"]
    }

@app.put("/user/update-password")
async def update_password(user_update: UserUpdate, current_user: dict = Depends(get_current_user)):
    hashed_password = get_password_hash(user_update.password)
    await users.update_one(
        {"username": current_user["username"]},
        {"$set": {"password": hashed_password}}
    )
    return {"message": "Password updated successfully"}

@app.get("/")
async def root():
    return {"message": "Welcome to PodCraft API"}

# New podcast endpoints
@app.post("/generate-podcast", response_model=PodcastResponse)
async def generate_podcast(request: Request, podcast_req: PodcastRequest, current_user: dict = Depends(get_current_user)):
    logger.info(f"Received podcast generation request for topic: {podcast_req.topic}")
    logger.info(f"Request headers: {dict(request.headers)}")
    
    try:
        # Step 1: Research the topic
        logger.info("Starting research phase")
        research_results = await research_topic(podcast_req.topic)
        logger.info("Research phase completed")
        
        # Step 2: Generate debate between believer and skeptic
        logger.info("Starting debate generation")
        conversation_blocks = await generate_debate(
            research=research_results,
            believer_name=podcast_req.believer_voice_id,
            skeptic_name=podcast_req.skeptic_voice_id
        )
        
        if not conversation_blocks:
            logger.error("Failed to generate debate - no conversation blocks returned")
            raise HTTPException(status_code=500, detail="Failed to generate debate")
        
        logger.info("Debate generation completed")
        
        # Step 3: Create podcast using TTS and store in MongoDB
        logger.info("Starting podcast creation with TTS")
        result = await podcast_manager.create_podcast(
            topic=podcast_req.topic,
            research=research_results,
            conversation_blocks=conversation_blocks,
            believer_voice_id=podcast_req.believer_voice_id,
            skeptic_voice_id=podcast_req.skeptic_voice_id
        )
        
        if "error" in result:
            logger.error(f"Error in podcast creation: {result['error']}")
            raise HTTPException(status_code=500, detail=result["error"])
        
        logger.info(f"Podcast generated successfully with ID: {result.get('podcast_id')}")
        return result
    except Exception as e:
        logger.error(f"Error in podcast generation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/podcast/{podcast_id}", response_model=PodcastResponse)
async def get_podcast(podcast_id: str, current_user: dict = Depends(get_current_user)):
    try:
        result = await podcast_manager.get_podcast(podcast_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-podcast/stream")
async def generate_podcast_stream(request: PodcastRequest, current_user: dict = Depends(get_current_user)):
    async def generate():
        try:
            # Store complete responses for podcast creation
            believer_response = ""
            skeptic_response = ""
            
            # Stream research results
            logger.info("Starting research phase (streaming)")
            research_results = ""
            async for chunk in research_topic_stream(request.topic):
                yield chunk
                if isinstance(chunk, str) and "final" in chunk:
                    data = json.loads(chunk)
                    if data["type"] == "final":
                        research_results = data["content"]
            
            # Stream debate
            logger.info("Starting debate phase (streaming)")
            async for chunk in generate_debate_stream(
                research=research_results,
                believer_name=request.believer_voice_id,
                skeptic_name=request.skeptic_voice_id
            ):
                yield chunk
                # Accumulate responses for podcast creation
                data = json.loads(chunk)
                if data["type"] == "believer":
                    believer_response += data["content"]
                elif data["type"] == "skeptic":
                    skeptic_response += data["content"]
            
            # Create conversation blocks for podcast
            blocks = []
            
            # Add believer chunks
            believer_chunks = chunk_text(believer_response)
            for i, chunk in enumerate(believer_chunks):
                blocks.append({
                    "name": f"{request.believer_voice_id}'s Perspective (Part {i+1})",
                    "input": chunk,
                    "silence_before": 1,
                    "voice_id": request.believer_voice_id,
                    "emotion": "neutral",
                    "model": "tts-1",
                    "speed": 1,
                    "duration": 0
                })
            
            # Add skeptic chunks
            skeptic_chunks = chunk_text(skeptic_response)
            for i, chunk in enumerate(skeptic_chunks):
                blocks.append({
                    "name": f"{request.skeptic_voice_id}'s Perspective (Part {i+1})",
                    "input": chunk,
                    "silence_before": 1,
                    "voice_id": request.skeptic_voice_id,
                    "emotion": "neutral",
                    "model": "tts-1",
                    "speed": 1,
                    "duration": 0
                })
            
            # Create podcast using TTS and store in MongoDB
            logger.info("Starting podcast creation with TTS")
            result = await podcast_manager.create_podcast(
                topic=request.topic,
                research=research_results,
                conversation_blocks=blocks,
                believer_voice_id=request.believer_voice_id,
                skeptic_voice_id=request.skeptic_voice_id,
                user_id=str(current_user["_id"])  # Add user ID to podcast creation
            )
            
            if "error" in result:
                logger.error(f"Error in podcast creation: {result['error']}")
                yield json.dumps({"type": "error", "content": result["error"]}) + "\n"
            else:
                logger.info(f"Podcast generated successfully with ID: {result.get('podcast_id')}")
                # Create audio URL from the audio path
                audio_url = f"/audio/{os.path.basename(os.path.dirname(result['audio_path']))}/final_podcast.mp3"
                yield json.dumps({
                    "type": "success",
                    "content": f"Podcast created successfully! ID: {result.get('podcast_id')}",
                    "podcast_url": audio_url
                }) + "\n"
                
        except Exception as e:
            logger.error(f"Error in streaming podcast generation: {str(e)}")
            yield json.dumps({"type": "error", "content": str(e)}) + "\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )

@app.get("/podcasts")
async def list_podcasts(current_user: dict = Depends(get_current_user)):
    try:
        # Query podcasts for the current user
        cursor = podcasts.find({"user_id": str(current_user["_id"])})
        podcast_list = []
        async for podcast in cursor:
            # Convert MongoDB _id to string and create audio URL
            podcast["_id"] = str(podcast["_id"])
            if "audio_path" in podcast:
                audio_url = f"/audio/{os.path.basename(os.path.dirname(podcast['audio_path']))}/final_podcast.mp3"
                podcast["audio_url"] = f"http://localhost:8000{audio_url}"
            podcast_list.append(podcast)
        return podcast_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/podcasts/latest")
async def get_latest_podcast(current_user: dict = Depends(get_current_user)):
    try:
        # Query podcasts for the current user, sorted by creation date (newest first)
        from bson.objectid import ObjectId
        
        # Find the most recent podcast for this user
        latest_podcast = await podcasts.find_one(
            {"user_id": str(current_user["_id"])},
            sort=[("created_at", -1)]  # Sort by created_at in descending order
        )
        
        if not latest_podcast:
            return {"message": "No podcasts found"}
        
        # Convert MongoDB _id to string and create audio URL
        latest_podcast["_id"] = str(latest_podcast["_id"])
        
        if "audio_path" in latest_podcast:
            audio_url = f"/audio/{os.path.basename(os.path.dirname(latest_podcast['audio_path']))}/final_podcast.mp3"
            latest_podcast["audio_url"] = f"http://localhost:8000{audio_url}"
        
        logger.info(f"Latest podcast found: {latest_podcast['topic']}")
        return latest_podcast
    except Exception as e:
        logger.error(f"Error getting latest podcast: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/podcast/{podcast_id}")
async def delete_podcast(podcast_id: str, current_user: dict = Depends(get_current_user)):
    try:
        # Convert string ID to ObjectId
        from bson.objectid import ObjectId
        podcast_obj_id = ObjectId(podcast_id)
        
        # Find the podcast first to get its audio path
        podcast = await podcasts.find_one({"_id": podcast_obj_id, "user_id": str(current_user["_id"])})
        if not podcast:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        # Delete the podcast from MongoDB
        result = await podcasts.delete_one({"_id": podcast_obj_id, "user_id": str(current_user["_id"])})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Podcast not found")
            
        # Delete the associated audio files if they exist
        if "audio_path" in podcast:
            audio_dir = os.path.dirname(podcast["audio_path"])
            if os.path.exists(audio_dir):
                shutil.rmtree(audio_dir)
        
        return {"message": "Podcast deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agents/create", response_model=AgentResponse)
async def create_agent(agent: AgentCreate, current_user: dict = Depends(get_current_user)):
    """Create a new agent configuration for the current user."""
    try:
        # Convert the user ID to string to ensure consistent handling
        user_id = str(current_user["_id"])
        
        # Prepare agent data
        agent_data = {
            **agent.dict(),
            "user_id": user_id,
            "created_at": datetime.utcnow()
        }
        
        # Insert the agent into the database
        result = await agents.insert_one(agent_data)
        
        # Return the created agent with its ID
        created_agent = await agents.find_one({"_id": result.inserted_id})
        if not created_agent:
            raise HTTPException(status_code=500, detail="Failed to retrieve created agent")
            
        return {
            "agent_id": str(created_agent["_id"]),
            **{k: v for k, v in created_agent.items() if k != "_id"}
        }
    except Exception as e:
        logger.error(f"Error creating agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create agent: {str(e)}")

@app.get("/agents", response_model=List[AgentResponse])
async def list_agents(current_user: dict = Depends(get_current_user)):
    """List all agents created by the current user."""
    try:
        # Convert user ID to string for consistent handling
        user_id = str(current_user["_id"])
        user_agents = []
        
        # Find agents for the current user
        async for agent in agents.find({"user_id": user_id}):
            user_agents.append({
                "agent_id": str(agent["_id"]),
                **{k: v for k, v in agent.items() if k != "_id"}
            })
        
        return user_agents
    except Exception as e:
        logger.error(f"Error listing agents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list agents: {str(e)}")

@app.post("/agents/test-voice")
async def test_agent_voice(request: Request):
    try:
        data = await request.json()
        text = data.get("text")
        voice_id = data.get("voice_id")
        speed = data.get("speed", 1.0)
        pitch = data.get("pitch", 1.0)
        volume = data.get("volume", 1.0)

        if not text or not voice_id:
            raise HTTPException(status_code=400, detail="Missing required fields")

        # Initialize the podcast manager
        manager = PodcastManager()

        # Generate a unique filename for this test
        test_filename = f"test_{voice_id}_{int(time.time())}.mp3"
        output_path = os.path.join("temp", test_filename)

        # Generate the speech
        success = manager.generate_speech(text, voice_id, output_path)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to generate test audio")

        # Return the full URL to the generated audio
        return {"audio_url": f"http://localhost:8000/audio/{test_filename}"}

    except Exception as e:
        logger.error(f"Error in test_agent_voice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add the new PUT endpoint for updating agents
@app.put("/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, agent: AgentCreate, current_user: dict = Depends(get_current_user)):
    """Update an existing agent configuration."""
    try:
        # Convert user ID to string for consistent handling
        user_id = str(current_user["_id"])
        
        # Convert agent_id to ObjectId
        from bson.objectid import ObjectId
        agent_obj_id = ObjectId(agent_id)
        
        # Check if agent exists and belongs to user
        existing_agent = await agents.find_one({
            "_id": agent_obj_id,
            "user_id": user_id
        })
        
        if not existing_agent:
            raise HTTPException(status_code=404, detail="Agent not found or unauthorized")
        
        # Prepare update data
        update_data = {
            **agent.dict(),
            "updated_at": datetime.utcnow()
        }
        
        # Update the agent
        result = await agents.update_one(
            {"_id": agent_obj_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update agent")
            
        # Get the updated agent
        updated_agent = await agents.find_one({"_id": agent_obj_id})
        if not updated_agent:
            raise HTTPException(status_code=500, detail="Failed to retrieve updated agent")
            
        return {
            "agent_id": str(updated_agent["_id"]),
            **{k: v for k, v in updated_agent.items() if k != "_id"}
        }
    except Exception as e:
        logger.error(f"Error updating agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update agent: {str(e)}") 