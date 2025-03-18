import React, { useState, useRef, useEffect } from 'react';
import './Demo.css';

function Demo() {
  const [demoText, setDemoText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [demoResult, setDemoResult] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);
  
  useEffect(() => {
    // When audio URL changes, log it for debugging
    if (audioUrl) {
      console.log("Audio URL set to:", audioUrl);
    }
  }, [audioUrl]);

  // Function to handle audio errors
  const handleAudioError = (e) => {
    console.error("Audio error:", e);
    // Use a fallback audio URL if the original one fails
    console.log("Switching to fallback audio source");
    setAudioUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!demoText.trim()) return;
    
    setIsLoading(true);
    setAudioUrl(null);
    
    try {
      // This is a placeholder for actual API call
      setTimeout(() => {
        setAudioUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error in demo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDemo = () => {
    setIsLoading(true);
    setAudioUrl(null);
    
    // Simulate loading
    setTimeout(() => {
      // Use the backend endpoint to access the audio file
      setAudioUrl('http://localhost:8000/audio/Default/final_podcast.mp3');
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="demo-container">
      <div className="audio-circle-container">
        <div className="audio-circle">
          {isLoading ? (
            <div className="demo-loading-circle">
              <div className="demo-spinner"></div>
              <p>Creating your demo podcast...</p>
            </div>
          ) : audioUrl ? (
            <div className="audio-player-container">
              <audio 
                ref={audioRef} 
                src={audioUrl} 
                controls 
                className="audio-player"
                onError={handleAudioError}
                preload="auto"
              />
              <div className="audio-controls">
                <button 
                  onClick={() => audioRef.current?.play()} 
                  className="audio-control-btn"
                >
                  Play
                </button>
                <button 
                  onClick={() => audioRef.current?.pause()} 
                  className="audio-control-btn"
                >
                  Pause
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-circle-message" onClick={handleGenerateDemo}>
              <p>Click here to generate a demo podcast</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Demo; 