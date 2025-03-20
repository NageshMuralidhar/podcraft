from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Union, Any
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
    personality: str = None  # Optional field for agent personality

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
    personality: str = None  # Optional field for agent personality

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

# Models for structured debate transcript and insights
class TranscriptEntry(BaseModel):
    agentId: str
    agentName: str
    turn: int
    content: str

class InsightsData(BaseModel):
    topic: str
    research: str
    transcript: List[TranscriptEntry]
    keyInsights: List[str]
    conclusion: str

# New Workflow Models
class WorkflowCreate(BaseModel):
    name: str
    description: str
    nodes: List[Dict]
    edges: List[Dict]
    insights: Optional[Union[InsightsData, str]] = None

class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: str
    nodes: List[Dict]
    edges: List[Dict]
    insights: Optional[Union[InsightsData, str]] = None
    user_id: str
    created_at: Optional[str]
    updated_at: Optional[str]

class TextPodcastRequest(BaseModel):
    text: str
    voice_id: str = "alloy"
    emotion: str = "neutral"
    speed: float = 1.0
    title: Optional[str] = None

class TextPodcastResponse(BaseModel):
    audio_url: str
    duration: Optional[float]
    status: str
    error: Optional[str]
    updated_at: Optional[str] 

