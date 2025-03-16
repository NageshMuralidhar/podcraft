from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from decouple import config
from typing import Dict, List, AsyncGenerator
import json
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OPENAI_API_KEY = config('OPENAI_API_KEY')

# Debug logging
print(f"\nDebaters - Loaded OpenAI API Key: {OPENAI_API_KEY[:7]}...")
print(f"Key starts with 'sk-proj-': {OPENAI_API_KEY.startswith('sk-proj-')}")
print(f"Key starts with 'sk-': {OPENAI_API_KEY.startswith('sk-')}\n")

believer_turn_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an optimistic and enthusiastic podcast host who sees the positive potential in new developments.
    Your responses should be engaging, conversational, and STRICTLY LIMITED TO 100 WORDS.
    Focus on the opportunities, benefits, and positive implications of the topic.
    Maintain a non-chalant, happy, podcast-style tone while being informative.
    Your name is {name}, use 'I' when referring to yourself."""),
    ("user", "Based on this research and the skeptic's last response (if any), provide your perspective for turn {turn_number}:\n\nResearch: {research}\nSkeptic's last response: {skeptic_response}")
])

skeptic_turn_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a thoughtful and critical podcast host who carefully examines potential drawbacks and challenges.
    Your responses should be engaging, conversational, and STRICTLY LIMITED TO 100 WORDS.
    Focus on potential risks, limitations, and areas needing careful consideration.
    Maintain a enthusiastic and angry, podcast-style tone while being informative.
    Your name is {name}, use 'I' when referring to yourself."""),
    ("user", "Based on this research and the believer's last response (if any), provide your perspective for turn {turn_number}:\n\nResearch: {research}\nBeliever's last response: {believer_response}")
])

# Initialize the LLMs with streaming
believer_llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.7,
    api_key=OPENAI_API_KEY,
    streaming=True
)

skeptic_llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.7,
    api_key=OPENAI_API_KEY,
    streaming=True
)

def chunk_text(text: str, max_length: int = 3800) -> List[str]:
    """Split text into chunks of maximum length while preserving sentence boundaries."""
    # Split into sentences and trim whitespace
    sentences = [s.strip() for s in text.split('.')]
    sentences = [s + '.' for s in sentences if s]
    
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        sentence_length = len(sentence)
        if current_length + sentence_length > max_length:
            if current_chunk:  # If we have accumulated sentences, join them and add to chunks
                chunks.append(' '.join(current_chunk))
                current_chunk = [sentence]
                current_length = sentence_length
            else:  # If a single sentence is too long, split it
                if sentence_length > max_length:
                    words = sentence.split()
                    temp_chunk = []
                    temp_length = 0
                    for word in words:
                        if temp_length + len(word) + 1 > max_length:
                            chunks.append(' '.join(temp_chunk))
                            temp_chunk = [word]
                            temp_length = len(word)
                        else:
                            temp_chunk.append(word)
                            temp_length += len(word) + 1
                    if temp_chunk:
                        chunks.append(' '.join(temp_chunk))
                else:
                    chunks.append(sentence)
        else:
            current_chunk.append(sentence)
            current_length += sentence_length
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

async def generate_debate_stream(research: str, believer_name: str, skeptic_name: str) -> AsyncGenerator[str, None]:
    """
    Generate a streaming podcast-style debate between believer and skeptic agents with alternating turns.
    """
    try:
        turns = 3  # Number of turns for each speaker
        skeptic_last_response = ""
        believer_last_response = ""

        # Start with skeptic for first turn
        for turn in range(1, turns + 1):
            logger.info(f"Starting skeptic ({skeptic_name}) turn {turn}")
            skeptic_response = ""
            # Stream skeptic's perspective
            async for chunk in skeptic_llm.astream(
                skeptic_turn_prompt.format(
                    research=research,
                    name=skeptic_name,
                    turn_number=turn,
                    believer_response=believer_last_response
                )
            ):
                skeptic_response += chunk.content
                yield json.dumps({
                    "type": "skeptic",
                    "name": skeptic_name,
                    "content": chunk.content,
                    "turn": turn
                }) + "\n"
            skeptic_last_response = skeptic_response
            logger.info(f"Skeptic turn {turn}: {skeptic_response}")

            logger.info(f"Starting believer ({believer_name}) turn {turn}")
            believer_response = ""
            # Stream believer's perspective
            async for chunk in believer_llm.astream(
                believer_turn_prompt.format(
                    research=research,
                    name=believer_name,
                    turn_number=turn,
                    skeptic_response=skeptic_last_response
                )
            ):
                believer_response += chunk.content
                yield json.dumps({
                    "type": "believer",
                    "name": believer_name,
                    "content": chunk.content,
                    "turn": turn
                }) + "\n"
            believer_last_response = believer_response
            logger.info(f"Believer turn {turn}: {believer_response}")

    except Exception as e:
        logger.error(f"Error in debate generation: {str(e)}")
        yield json.dumps({"type": "error", "content": str(e)}) + "\n"

async def generate_debate(research: str, believer_name: str, skeptic_name: str) -> List[Dict]:
    """
    Generate a complete podcast-style debate between believer and skeptic agents.
    Kept for compatibility with existing code.
    """
    try:
        logger.info(f"Starting believer ({believer_name}) response generation")
        # Get believer's perspective
        believer_response = await believer_llm.ainvoke(
            believer_prompt.format(research=research, name=believer_name)
        )
        logger.info(f"Believer response: {believer_response.content}")
        
        logger.info(f"Starting skeptic ({skeptic_name}) response generation")
        # Get skeptic's perspective
        skeptic_response = await skeptic_llm.ainvoke(
            skeptic_prompt.format(research=research, name=skeptic_name)
        )
        logger.info(f"Skeptic response: {skeptic_response.content}")

        # Create conversation blocks with chunked text
        blocks = []
        
        # Add believer chunks
        believer_chunks = chunk_text(believer_response.content)
        for i, chunk in enumerate(believer_chunks):
            blocks.append({
                "name": f"{believer_name}'s Perspective (Part {i+1})",
                "input": chunk,
                "silence_before": 1,
                "voice_id": "OA001",  # Will be updated based on selected voice
                "emotion": "neutral",
                "model": "tts-1",
                "speed": 1,
                "duration": 0
            })
        
        # Add skeptic chunks
        skeptic_chunks = chunk_text(skeptic_response.content)
        for i, chunk in enumerate(skeptic_chunks):
            blocks.append({
                "name": f"{skeptic_name}'s Perspective (Part {i+1})",
                "input": chunk,
                "silence_before": 1,
                "voice_id": "OA002",  # Will be updated based on selected voice
                "emotion": "neutral",
                "model": "tts-1",
                "speed": 1,
                "duration": 0
            })

        return blocks
    except Exception as e:
        logger.error(f"Error in debate generation: {str(e)}")
        return [] 