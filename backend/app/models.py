from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserUpdate(BaseModel):
    password: str

class UserResponse(BaseModel):
    username: str

class AgentCreate(BaseModel):
    name: str
    voice_id: str
    voice_name: str
    voice_description: str
    speed: float
    pitch: float
    volume: float
    output_format: str

class AgentResponse(BaseModel):
    agent_id: str
    name: str
    voice_id: str
    voice_name: str
    voice_description: str
    speed: float
    pitch: float
    volume: float
    output_format: str
    user_id: str

class PodcastRequest(BaseModel):
    topic: str
    believer_voice_id: str
    skeptic_voice_id: str

class ConversationBlock(BaseModel):
    name: str
    input: str
    silence_before: int
    voice_id: str
    emotion: str
    model: str
    speed: float
    duration: int

class PodcastResponse(BaseModel):
    podcast_id: str
    audio_url: Optional[str]
    topic: str
    error: Optional[str]

# New Workflow Models
class WorkflowCreate(BaseModel):
    name: str
    description: str
    nodes: List[Dict]
    edges: List[Dict]

class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: str
    nodes: List[Dict]
    edges: List[Dict]
    user_id: str
    created_at: Optional[str]
    updated_at: Optional[str] 

class TextPodcastRequest(BaseModel):
    text: str 
    voice_id: str 
    emotion: str
    speed: float

class TextPodcastResponse(BaseModel):
    audio_url: str
    duration: Optional[float]
    status: str
    error: Optional[str]
    updated_at: Optional[str] 

