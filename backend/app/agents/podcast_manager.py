import requests
import json
import os
import shutil
import subprocess
from datetime import datetime
from decouple import config
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict, List

OPENAI_API_KEY = config('OPENAI_API_KEY')
MONGODB_URL = config('MONGODB_URL')

client = AsyncIOMotorClient(MONGODB_URL)
db = client.podcraft
podcasts = db.podcasts

class PodcastManager:
    def __init__(self):
        self.tts_url = "https://api.openai.com/v1/audio/speech"
        self.headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        # Create absolute path for temp directory
        self.temp_dir = os.path.abspath("temp_audio")
        os.makedirs(self.temp_dir, exist_ok=True)
        
        # Define allowed voices
        self.allowed_voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer", "ash", "sage", "coral"]

    def generate_speech(self, text: str, voice_id: str, filename: str) -> bool:
        """Generate speech using OpenAI's TTS API."""
        try:
            # Debug logging for voice selection
            print(f"\n=== TTS Generation Details ===")
            print(f"File: {filename}")
            print(f"Voice ID (original): {voice_id}")
            print(f"Voice ID (lowercase): {voice_id.lower()}")
            print(f"Allowed voices: {self.allowed_voices}")
            
            # Validate and normalize voice_id
            voice = voice_id.lower()
            if voice not in self.allowed_voices:
                print(f"Warning: Invalid voice ID: {voice_id}. Using default voice 'alloy'")
                voice = "alloy"
            
            print(f"Final voice selection: {voice}")

            payload = {
                "model": "tts-1",
                "input": text,
                "voice": voice
            }
            
            print(f"TTS API payload: {json.dumps(payload, indent=2)}")
            print(f"Request headers: {json.dumps(self.headers, indent=2)}")

            response = requests.post(self.tts_url, json=payload, headers=self.headers)
            
            if response.status_code == 200:
                # Ensure directory exists
                os.makedirs(os.path.dirname(filename), exist_ok=True)
                with open(filename, "wb") as f:
                    f.write(response.content)
                print(f"Successfully generated speech file: {filename}")
                return True
            else:
                print(f"TTS API Error Response: {response.status_code}")
                print(f"Error details: {response.text}")
                return False
        except Exception as e:
            print(f"Error generating speech: {str(e)}")
            return False

    def merge_audio_files(self, audio_files: List[str], output_file: str) -> bool:
        """Merge multiple audio files into one using ffmpeg."""
        try:
            if not audio_files:
                print("No audio files to merge")
                return False

            # Verify all input files exist
            for audio_file in audio_files:
                if not os.path.exists(audio_file):
                    print(f"Audio file does not exist: {audio_file}")
                    return False

            # Ensure all paths are absolute
            output_file = os.path.abspath(output_file)
            output_dir = os.path.dirname(output_file)
            os.makedirs(output_dir, exist_ok=True)
            
            # Create temporary files in the same directory
            list_file = os.path.join(output_dir, "files.txt")
            silence_file = os.path.join(output_dir, "silence.mp3")
            
            print(f"Output directory: {output_dir}")
            print(f"List file: {list_file}")
            print(f"Silence file: {silence_file}")
            
            # Generate silence file first
            silence_result = subprocess.run([
                'ffmpeg', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', 
                '-t', '1', '-q:a', '9', '-acodec', 'libmp3lame', silence_file
            ], capture_output=True, text=True)

            if silence_result.returncode != 0:
                print(f"Error generating silence file: {silence_result.stderr}")
                return False

            if not os.path.exists(silence_file):
                print("Failed to create silence file")
                return False

            # Write the file list with absolute paths
            try:
                with open(list_file, "w", encoding='utf-8') as f:
                    for audio_file in audio_files:
                        abs_audio_path = os.path.abspath(audio_file)
                        print(f"Adding audio file: {abs_audio_path}")
                        # Use forward slashes for ffmpeg compatibility
                        abs_audio_path = abs_audio_path.replace('\\', '/')
                        silence_path = silence_file.replace('\\', '/')
                        f.write(f"file '{abs_audio_path}'\n")
                        f.write(f"file '{silence_path}'\n")
            except Exception as e:
                print(f"Error writing list file: {str(e)}")
                return False

            if not os.path.exists(list_file):
                print("Failed to create list file")
                return False

            # Print the contents of the list file for debugging
            print("\nContents of files.txt:")
            with open(list_file, 'r', encoding='utf-8') as f:
                print(f.read())

            # Merge all files using the concat demuxer
            merge_result = subprocess.run([
                'ffmpeg', '-f', 'concat', '-safe', '0', '-i', list_file,
                '-c', 'copy', output_file
            ], capture_output=True, text=True)
            
            if merge_result.returncode != 0:
                print(f"FFmpeg error output: {merge_result.stderr}")
                return False

            # Verify the output file was created
            if not os.path.exists(output_file):
                print("Failed to create output file")
                return False

            print(f"Successfully created merged audio file: {output_file}")

            # Clean up temporary files
            try:
                os.remove(list_file)
                os.remove(silence_file)
            except Exception as e:
                print(f"Warning: Error cleaning up temporary files: {str(e)}")

            return True
        except subprocess.CalledProcessError as e:
            print(f"FFmpeg error: {e.stderr}")
            return False
        except Exception as e:
            print(f"Error merging audio files: {str(e)}")
            return False

    async def create_podcast(
        self,
        topic: str,
        research: str,
        conversation_blocks: List[Dict],
        believer_voice_id: str,
        skeptic_voice_id: str,
        user_id: str = None
    ) -> Dict:
        """Create a podcast by converting text to speech and storing the results."""
        podcast_temp_dir = None
        try:
            # Debug logging for voice IDs
            print(f"\nPodcast Creation - Voice Configuration:")
            print(f"Believer Voice ID: {believer_voice_id}")
            print(f"Skeptic Voice ID: {skeptic_voice_id}")
            
            # Create a unique directory with absolute path
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            podcast_temp_dir = os.path.abspath(os.path.join(self.temp_dir, timestamp))
            os.makedirs(podcast_temp_dir, exist_ok=True)
            
            print(f"Created temp directory: {podcast_temp_dir}")
            print(f"Processing conversation blocks: {json.dumps(conversation_blocks, indent=2)}")
            
            audio_files = []
            
            # Check if we have the new turn-based format or the old format
            if any("turn" in block for block in conversation_blocks):
                # New turn-based format
                skeptic_parts = []
                believer_parts = []
                
                # Separate blocks by speaker and turn
                for block in conversation_blocks:
                    if "type" in block and "content" in block:
                        if block["type"] == "skeptic":
                            turn = block.get("turn", len(skeptic_parts) + 1)
                            skeptic_parts.append((turn, block["content"]))
                            print(f"Added skeptic part for turn {turn} - Will use voice: {skeptic_voice_id}")
                        elif block["type"] == "believer":
                            turn = block.get("turn", len(believer_parts) + 1)
                            believer_parts.append((turn, block["content"]))
                            print(f"Added believer part for turn {turn} - Will use voice: {believer_voice_id}")
                
                if not skeptic_parts and not believer_parts:
                    raise Exception("No valid conversation parts found in the blocks")
                
                # Sort by turn number
                skeptic_parts.sort(key=lambda x: x[0])
                believer_parts.sort(key=lambda x: x[0])
                
                print(f"Skeptic parts: {len(skeptic_parts)}, Believer parts: {len(believer_parts)}")
                
                # Generate audio for each turn in order
                for turn_num in range(1, max(len(skeptic_parts), len(believer_parts)) + 1):
                    # Skeptic's turn
                    if turn_num <= len(skeptic_parts):
                        turn, content = skeptic_parts[turn_num - 1]
                        if content.strip():  # Only process non-empty content
                            audio_file = os.path.join(podcast_temp_dir, f"skeptic_turn_{turn}.mp3")
                            print(f"\nProcessing skeptic turn {turn} with voice {skeptic_voice_id}")
                            if self.generate_speech(content, skeptic_voice_id, audio_file):
                                audio_files.append(audio_file)
                                print(f"Generated skeptic audio for turn {turn}")
                            else:
                                raise Exception(f"Failed to generate audio for skeptic turn {turn}")
                    
                    # Believer's turn
                    if turn_num <= len(believer_parts):
                        turn, content = believer_parts[turn_num - 1]
                        if content.strip():  # Only process non-empty content
                            audio_file = os.path.join(podcast_temp_dir, f"believer_turn_{turn}.mp3")
                            print(f"\nProcessing believer turn {turn} with voice {believer_voice_id}")
                            if self.generate_speech(content, believer_voice_id, audio_file):
                                audio_files.append(audio_file)
                                print(f"Generated believer audio for turn {turn}")
                            else:
                                raise Exception(f"Failed to generate audio for believer turn {turn}")
            else:
                # Old format - fallback to processing blocks sequentially
                for i, block in enumerate(conversation_blocks):
                    if "input" in block and block["input"].strip():
                        # Check for either "Believer" in name or if the name starts with "alloy"
                        is_believer = "Believer" in block.get("name", "") or block.get("name", "").lower().startswith("alloy")
                        voice_id = believer_voice_id if is_believer else skeptic_voice_id
                        speaker_type = "believer" if is_believer else "skeptic"
                        print(f"\nProcessing {speaker_type} block {i+1} with voice {voice_id}")
                        print(f"Block name: {block.get('name', '')}")  # Debug logging
                        audio_file = os.path.join(podcast_temp_dir, f"part_{i+1}.mp3")
                        if self.generate_speech(block["input"], voice_id, audio_file):
                            audio_files.append(audio_file)
                            print(f"Generated audio for part {i+1}")
                        else:
                            raise Exception(f"Failed to generate audio for part {i+1}")

            if not audio_files:
                raise Exception("No audio files were generated from the conversation blocks")

            print(f"Generated {len(audio_files)} audio files")
            
            # Merge all audio files
            final_audio = os.path.join(podcast_temp_dir, "final_podcast.mp3")
            print(f"Merging to final audio: {final_audio}")
            
            if not self.merge_audio_files(audio_files, final_audio):
                raise Exception("Failed to merge audio files")

            podcast_doc = {
                "topic": topic,
                "research": research,
                "conversation_blocks": conversation_blocks,
                "audio_path": final_audio,
                "created_at": datetime.utcnow(),
                "believer_voice_id": believer_voice_id,
                "skeptic_voice_id": skeptic_voice_id,
                "user_id": user_id
            }

            result = await podcasts.insert_one(podcast_doc)
            
            # Clean up individual audio files but keep the final one
            for audio_file in audio_files:
                if os.path.exists(audio_file):
                    os.remove(audio_file)

            return {
                "podcast_id": str(result.inserted_id),
                "audio_path": final_audio,
                "topic": topic
            }

        except Exception as e:
            # Clean up the temp directory in case of error
            if os.path.exists(podcast_temp_dir):
                shutil.rmtree(podcast_temp_dir)
            print(f"Error in podcast creation: {str(e)}")
            return {
                "error": str(e)
            }

    async def get_podcast(self, podcast_id: str) -> Dict:
        """Retrieve a podcast by ID."""
        try:
            from bson.objectid import ObjectId
            podcast = await podcasts.find_one({"_id": ObjectId(podcast_id)})
            if podcast:
                podcast["_id"] = str(podcast["_id"])
                return podcast
            return {"error": "Podcast not found"}
        except Exception as e:
            return {"error": str(e)} 