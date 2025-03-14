from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain.agents import AgentExecutor, create_openai_functions_agent
from decouple import config
from typing import AsyncGenerator, List
import os
import json

# Get API keys from environment
TAVILY_API_KEY = config('TAVILY_API_KEY')
OPENAI_API_KEY = config('OPENAI_API_KEY')

# Set Tavily API key in environment
os.environ["TAVILY_API_KEY"] = TAVILY_API_KEY

# Initialize the search tool
search_tool = TavilySearchResults(tavily_api_key=TAVILY_API_KEY)

# List of available tools for the prompt
tools_description = """
Available tools:
- TavilySearchResults: A search tool that provides comprehensive web search results. Use this to gather information about topics.
"""

# Create the prompt template
researcher_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert researcher tasked with gathering comprehensive information on given topics.
    Your goal is to provide detailed, factual information limited to 500 words.
    Focus on key points, recent developments, and verified facts.
    Structure your response clearly with main points and supporting details.
    Keep your response concise and focused.
    
    {tools}
    
    Remember to provide accurate and up-to-date information."""),
    ("user", "{input}"),
    ("assistant", "{agent_scratchpad}")
])

# Initialize the LLM with streaming
researcher_llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.3,
    api_key=OPENAI_API_KEY,
    streaming=True
)

# Create the agent
researcher_agent = create_openai_functions_agent(
    llm=researcher_llm,
    prompt=researcher_prompt,
    tools=[search_tool]
)

# Create the agent executor
researcher_executor = AgentExecutor(
    agent=researcher_agent,
    tools=[search_tool],
    verbose=True,
    handle_parsing_errors=True,
    return_intermediate_steps=True
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

async def research_topic_stream(topic: str) -> AsyncGenerator[str, None]:
    """
    Research a topic and stream the results as they are generated.
    """
    try:
        async for chunk in researcher_executor.astream(
            {
                "input": f"Research this topic thoroughly: {topic}",
                "tools": tools_description
            }
        ):
            if isinstance(chunk, dict):
                # Stream intermediate steps for transparency
                if "intermediate_steps" in chunk:
                    for step in chunk["intermediate_steps"]:
                        yield json.dumps({"type": "intermediate", "content": str(step)}) + "\n"
                
                # Stream the final output
                if "output" in chunk:
                    yield json.dumps({"type": "final", "content": chunk["output"]}) + "\n"
            else:
                yield json.dumps({"type": "chunk", "content": str(chunk)}) + "\n"
    except Exception as e:
        yield json.dumps({"type": "error", "content": str(e)}) + "\n"

async def research_topic(topic: str) -> str:
    """
    Research a topic and return the complete result.
    Kept for compatibility with existing code.
    """
    try:
        result = await researcher_executor.ainvoke(
            {
                "input": f"Research this topic thoroughly: {topic}",
                "tools": tools_description
            }
        )
        return result["output"]
    except Exception as e:
        print(f"Error in research: {str(e)}")
        return "Error occurred during research." 