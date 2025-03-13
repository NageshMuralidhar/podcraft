from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..agents import process_podcast_request
from typing import List, Dict
import base64

router = APIRouter()

class PodcastRequest(BaseModel):
    topic: str

class PodcastResponse(BaseModel):
    script_blocks: List[Dict[str, str]]
    audio_base64: str

@router.post("/generate", response_model=PodcastResponse)
async def generate_podcast(request: PodcastRequest):
    try:
        result = await process_podcast_request(request.topic)
        
        # Convert audio content to base64
        audio_base64 = base64.b64encode(result["audio_content"]).decode('utf-8')
        
        return PodcastResponse(
            script_blocks=result["script_blocks"],
            audio_base64=audio_base64
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 