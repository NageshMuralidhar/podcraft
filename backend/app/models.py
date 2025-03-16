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

class TextPodcastRequest(BaseModel):
    text: str = Field(..., description="The text content to convert into a podcast")
    voice_id: str = Field(..., description="Voice ID for the speaker")
    emotion: str = Field("neutral", description="Emotion for the voice (e.g., neutral, happy, sad)")
    speed: float = Field(1.0, description="Speed of speech (0.5 to 2.0)")

class TextPodcastResponse(BaseModel):
    audio_url: str = Field(..., description="URL to access the generated audio")
    duration: Optional[float] = Field(None, description="Duration of the generated audio in seconds")
    status: str = Field("completed", description="Status of the podcast generation")
    error: Optional[str] = Field(None, description="Error message if generation failed") 