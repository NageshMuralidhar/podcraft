from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain.tools import TavilySearchResults
from decouple import config
import openai
from typing import List, Dict

# Configure OpenAI
openai.api_key = config("OPENAI_API_KEY")

class ResearchAgent:
    def __init__(self):
        self.llm = ChatOpenAI(temperature=0.7, model="gpt-4-turbo-preview")
        self.tools = [TavilySearchResults(api_key=config("TAVILY_API_KEY"))]
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a thorough researcher who provides concise but comprehensive summaries.
            Your task is to research the given topic and provide a balanced summary in 500 words or less.
            Focus on key facts, different perspectives, and current understanding of the topic."""),
            ("user", "{input}")
        ])
        
        self.agent = create_openai_functions_agent(self.llm, self.tools, prompt)
        self.agent_executor = AgentExecutor(agent=self.agent, tools=self.tools)

    async def research(self, topic: str) -> str:
        response = await self.agent_executor.ainvoke({"input": topic})
        return response["output"]

class DebateAgent:
    def __init__(self, agent_type: str):
        self.llm = ChatOpenAI(temperature=0.8, model="gpt-4-turbo-preview")
        self.agent_type = agent_type
        
        if agent_type == "believer":
            system_prompt = """You are an optimistic and enthusiastic podcast speaker who sees the positive potential in everything.
            Your responses should be passionate, forward-thinking, and focus on opportunities and possibilities.
            Keep your responses natural and conversational, as if speaking in a podcast."""
        else:  # skeptic
            system_prompt = """You are a critical thinking podcast speaker who carefully analyzes and questions assumptions.
            Your responses should be analytical, thought-provoking, and focus on potential challenges and limitations.
            Keep your responses natural and conversational, as if speaking in a podcast."""
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", "{input}")
        ])

    async def respond(self, research_summary: str, context: str = "") -> str:
        messages = self.prompt.format_messages(
            input=f"""Based on this research: {research_summary}
            {context}
            Provide your perspective as a {self.agent_type} in a conversational podcast style."""
        )
        response = await self.llm.ainvoke(messages)
        return response.content

class PodcastManager:
    def __init__(self):
        self.researcher = ResearchAgent()
        self.believer = DebateAgent("believer")
        self.skeptic = DebateAgent("skeptic")

    async def create_podcast_script(self, topic: str) -> List[Dict[str, str]]:
        # Get research summary
        research = await self.researcher.research(topic)
        
        # Initialize conversation
        script_blocks = []
        context = ""
        
        # Alternate between believer and skeptic (3 turns each)
        for i in range(3):
            # Believer's turn
            believer_response = await self.believer.respond(research, context)
            script_blocks.append({"speaker": "believer", "text": believer_response})
            context += f"\nBeliever: {believer_response}"
            
            # Skeptic's turn
            skeptic_response = await self.skeptic.respond(research, context)
            script_blocks.append({"speaker": "skeptic", "text": skeptic_response})
            context += f"\nSkeptic: {skeptic_response}"
        
        return script_blocks

    async def generate_audio(self, script_blocks: List[Dict[str, str]]) -> str:
        # Initialize the speech client
        believer_voice = "onyx"  # Optimistic and engaging
        skeptic_voice = "echo"   # More analytical and measured
        
        full_audio = b""
        audio_segments = []

        for block in script_blocks:
            voice = believer_voice if block["speaker"] == "believer" else skeptic_voice
            response = await openai.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=block["text"]
            )
            audio_segments.append(response.content)

        # TODO: Implement audio concatenation logic
        # For now, we'll just return the first segment
        return audio_segments[0]

async def process_podcast_request(topic: str):
    manager = PodcastManager()
    script_blocks = await manager.create_podcast_script(topic)
    audio_content = await manager.generate_audio(script_blocks)
    
    return {
        "script_blocks": script_blocks,
        "audio_content": audio_content
    } 