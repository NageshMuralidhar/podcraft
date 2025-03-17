import React, { useState, useRef, useEffect } from 'react';
import './Demo.css';

function Demo() {
  const [demoText, setDemoText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [demoResult, setDemoResult] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);
  
  useEffect(() => {
    // Auto-play when audio is loaded (optional)
    if (audioRef.current && audioUrl) {
      audioRef.current.volume = 0.5; // Set initial volume
    }
  }, [audioUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!demoText.trim()) return;
    
    setIsLoading(true);
    setAudioUrl(null);
    
    try {
      // This is a placeholder for actual API call
      // Replace with your actual demo functionality
      setTimeout(() => {
        setAudioUrl('backend/temp_audio/Default/final_podcast.mp3');
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
      setAudioUrl('backend/temp_audio/Default/final_podcast.mp3');
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
              />
              {demoResult && (
                <div className="audio-info">
                  <h3>{demoResult.title}</h3>
                  <p>{demoResult.description}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-circle-message" onClick={handleGenerateDemo}>
              <p>Generate a podcast to see it here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Demo; 