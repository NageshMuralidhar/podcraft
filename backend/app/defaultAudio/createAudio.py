import requests
import os
from pydub import AudioSegment
from typing import Dict, Tuple

# Create temp_audio directory if it doesn't exist
TEMP_AUDIO_DIR = "../../../backend/temp_audio/Default"
os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)

# Set your OpenAI API key
API_KEY = "OpenAI API Key"
TTS_URL = "https://api.openai.com/v1/audio/speech"

# Define voice configurations
VOICE_CONFIGS = {
    "Nagesh": {
        "voice": "echo",
        "default_speed": 1.0,
        "default_stability": 0.5
    },
    "Akshay": {
        "voice": "onyx",
        "default_speed": 1.0,
        "default_stability": 0.5
    }
}

# Define emotion mappings with voice parameters
EMOTIONS = {
    "excited": {
        "speed": 1.2,
        "stability": 0.3,
        "description": "Faster pace with more variation"
    },
    "skeptical": {
        "speed": 0.95,
        "stability": 0.7,
        "description": "Slightly slower with more stable tone"
    },
    "humorous": {
        "speed": 1.1,
        "stability": 0.4,
        "description": "Slightly faster with good variation"
    },
    "neutral": {
        "speed": 1.0,
        "stability": 0.5,
        "description": "Default balanced tone"
    },
    "enthusiastic": {
        "speed": 1.15,
        "stability": 0.35,
        "description": "Energetic and dynamic"
    }
}

# Enhanced conversation with emotion tags
conversation = [
    ("Nagesh", "Hey Akshay, heard about this AI-powered podcast tool, PodCraft? It's blowing my mind!", "excited"),
    ("Akshay", "Nope, but let me guess—another AI that claims to help but just adds to my credit card bill?", "skeptical"),
    ("Nagesh", "Not this time! It's like a full production team—minus coffee breaks and creative clashes.", "enthusiastic"),
    ("Akshay", "AI agents? Are we talking full-on digital personalities? Because if one sounds like Morgan Freeman, I'm in.", "humorous"),
    ("Nagesh", "Close! There's a Research Agent, a hyped-up Believer, a skeptical friend, and a Critic who refines content.", "excited"),
    ("Akshay", "So, basically, a Canadian-American Facebook debate? One guy shares an article, another believes it, one American calls it fake news, and a Canadian corrects their grammar?", "humorous"),
    ("Nagesh", "Exactly! But these AI agents won't try to sell you essential oils.", "humorous"),
    ("Akshay", "What about voices? Or is it just another robot telling me to 'place item in the bagging area'?", "skeptical"),
    ("Nagesh", "Nope! You can choose styles like 'Alloy' and 'Echo,' tweak emotions, and even preview it first!", "enthusiastic"),
    ("Akshay", "So I can finally have an AI that sounds excited when I say I shoveled my driveway three times today?", "humorous"),
    ("Nagesh", "That's the dream! Plus, the interface is so clean, even a Tim Hortons-fueled zombie could use it.", "humorous"),
    ("Akshay", "And the workflow? Or do I need a PhD in 'Clicking Too Many Buttons'?", "skeptical"),
    ("Nagesh", "Super simple! Choose a basic template, Select the agents, enter a prompt, and AI does the rest.", "enthusiastic"),
    ("Akshay", "Way better than my current setup—just me, a mic, and the existential question of who's actually listening. Can I customize workflows?", "humorous"),
    ("Nagesh", "Absolutely! You can even create an AI that only speaks in hockey metaphors.", "excited"),
    ("Akshay", "An AI co-host that never interrupts me? Sold.", "enthusiastic"),
    ("Nagesh", "And it's not just audio—it crafts engaging, well-researched content!", "excited"),
    ("Akshay", "Basically, a production team without passive-aggressive 'per my last email' messages? I need this. Thanks, Nagesh!", "enthusiastic"),
    ("Nagesh", "Anytime! Just don't be shocked if your AI starts roasting you—it's been trained by the internet.", "humorous")
]

def get_voice_parameters(speaker: str, emotion: str) -> Tuple[float, float]:
    """Get speed and stability parameters based on speaker and emotion."""
    base_speed = VOICE_CONFIGS[speaker]["default_speed"]
    base_stability = VOICE_CONFIGS[speaker]["default_stability"]
    
    emotion_config = EMOTIONS.get(emotion, EMOTIONS["neutral"])
    
    return (
        base_speed * emotion_config["speed"],
        emotion_config["stability"]
    )

def generate_speech(speaker: str, text: str, filename: str, emotion: str = "neutral"):
    """Generate speech with emotional variation."""
    speed, stability = get_voice_parameters(speaker, emotion)
    
    payload = {
        "model": "tts-1",
        "input": text,
        "voice": VOICE_CONFIGS[speaker]["voice"],
        "speed": speed,
        "stability": stability
    }
    
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

    try:
        response = requests.post(TTS_URL, json=payload, headers=headers)
        response.raise_for_status()  # Raise exception for bad status codes

        with open(filename, "wb") as f:
            f.write(response.content)
        print(f"Generated: {filename} (Emotion: {emotion}, Speed: {speed:.2f}, Stability: {stability:.2f})")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error generating speech: {str(e)}")
        if response.status_code != 200:
            print(f"API Error: {response.json()}")
        return False

def merge_audio_files(output_filename="final_podcast.mp3"):
    """
    Merge all generated audio files in the temp directory into a single podcast file.
    Files are merged in order based on their part number in the filename.
    """
    try:
        # Get all mp3 files and sort them by part number
        audio_files = [f for f in os.listdir(TEMP_AUDIO_DIR) if f.endswith('.mp3') and f != output_filename]
        
        # Sort files using a more robust method
        def get_part_number(filename):
            try:
                # Extract the number after 'part_' and before '_'
                part_str = filename.split('part_')[1].split('_')[0]
                return int(part_str)
            except (IndexError, ValueError):
                return float('inf')  # Put files without proper naming at the end
        
        audio_files.sort(key=get_part_number)

        if not audio_files:
            print("No audio files found to merge!")
            return False

        print("Files to be merged in order:", audio_files)  # Debug print

        # Start with the first audio file
        combined = AudioSegment.from_mp3(os.path.join(TEMP_AUDIO_DIR, audio_files[0]))
        
        # Add 0.5 second silence between segments
        silence = AudioSegment.silent(duration=100)  # 500ms = 0.5 seconds

        # Append the rest of the audio files
        for audio_file in audio_files[1:]:
            current_audio = AudioSegment.from_mp3(os.path.join(TEMP_AUDIO_DIR, audio_file))
            combined = combined + silence + current_audio

        # Export the final file
        output_path = os.path.join(TEMP_AUDIO_DIR, output_filename)
        combined.export(output_path, format="mp3")
        print(f"Successfully merged all audio files into: {output_path}")
        return True
    except Exception as e:
        print(f"Error merging audio files: {str(e)}")
        print(f"Current directory contents: {os.listdir(TEMP_AUDIO_DIR)}")  # Debug print
        return False

# Generate speech for each dialogue turn with emotions
print("\nGenerating individual audio files...")
for idx, (speaker, text, emotion) in enumerate(conversation):
    filename = os.path.join(TEMP_AUDIO_DIR, f"podcast_part_{idx+1}_{speaker}.mp3")
    generate_speech(speaker, text, filename, emotion)

print("\nIndividual audio files generated successfully!")

# Merge all generated audio files
print("\nMerging audio files...")
if merge_audio_files():
    print("Podcast creation completed!")
else:
    print("Failed to merge audio files. Check the error messages above.")