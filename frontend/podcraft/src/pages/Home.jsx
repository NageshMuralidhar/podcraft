import React, { useState, useRef, useEffect } from 'react';
import { RiSendPlaneFill } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import { TbSparkles } from "react-icons/tb";
import { LuBookAudio } from "react-icons/lu";
import { FaArrowRight, FaPlay, FaVolumeUp, FaChevronDown, FaLightbulb, FaSkull, FaCheckCircle, FaPause, FaLock } from "react-icons/fa";
import { TiFlowMerge } from "react-icons/ti";
import { RiVoiceprintFill } from "react-icons/ri";
import { BsSoundwave } from "react-icons/bs";
import { BiPodcast } from "react-icons/bi";

const Home = () => {
    const [prompt, setPrompt] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isBelieverDropdownOpen, setIsBelieverDropdownOpen] = useState(false);
    const [isSkepticDropdownOpen, setIsSkepticDropdownOpen] = useState(false);
    const [selectedWorkflow, setSelectedWorkflow] = useState('Basic Podcast');
    const [selectedBelieverVoice, setSelectedBelieverVoice] = useState({ id: 'alloy', name: 'Alloy' });
    const [selectedSkepticVoice, setSelectedSkepticVoice] = useState({ id: 'echo', name: 'Echo' });
    const [researchSteps, setResearchSteps] = useState([]);
    const [believerResponses, setBelieverResponses] = useState([]);
    const [skepticResponses, setSkepticResponses] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [audioUrl, setAudioUrl] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const audioRef = useRef(null);
    const navigate = useNavigate();
    const workflowDropdownRef = useRef(null);
    const believerDropdownRef = useRef(null);
    const skepticDropdownRef = useRef(null);
    const insightsRef = useRef(null);

    const workflows = [
        { id: '1', name: 'Basic Podcast' },
        { id: '2', name: 'Interview Style' },
        { id: '3', name: 'News Digest' }
    ];

    const voices = [
        { id: 'alloy', name: 'Alloy' },
        { id: 'echo', name: 'Echo' },
        { id: 'fable', name: 'Fable' },
        { id: 'onyx', name: 'Onyx' },
        { id: 'nova', name: 'Nova' },
        { id: 'shimmer', name: 'Shimmer' },
        { id: 'ash', name: 'Ash' },
        { id: 'sage', name: 'Sage' },
        { id: 'coral', name: 'Coral' }
    ];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (workflowDropdownRef.current && !workflowDropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (believerDropdownRef.current && !believerDropdownRef.current.contains(event.target)) {
                setIsBelieverDropdownOpen(false);
            }
            if (skepticDropdownRef.current && !skepticDropdownRef.current.contains(event.target)) {
                setIsSkepticDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            const updateTime = () => {
                setCurrentTime(audio.currentTime);
            };

            const updateDuration = () => {
                if (!isNaN(audio.duration) && audio.duration > 0) {
                    // Validate duration before setting it
                    if (audio.duration > 86400) {
                        console.error('Invalid duration detected:', audio.duration);
                        // Don't update state with invalid duration
                        return;
                    }
                    console.log('Duration updated:', audio.duration);
                    setDuration(audio.duration);
                }
            };

            // Add event listeners
            audio.addEventListener('timeupdate', updateTime);
            audio.addEventListener('loadedmetadata', updateDuration);
            audio.addEventListener('durationchange', updateDuration);
            audio.addEventListener('canplay', updateDuration); // Additional event to catch duration
            audio.addEventListener('ended', () => setIsPlaying(false));
            audio.addEventListener('error', (e) => {
                console.error('Audio error in event listener:', e);
                setIsPlaying(false);
            });

            return () => {
                // Remove event listeners
                audio.removeEventListener('timeupdate', updateTime);
                audio.removeEventListener('loadedmetadata', updateDuration);
                audio.removeEventListener('durationchange', updateDuration);
                audio.removeEventListener('canplay', updateDuration);
                audio.removeEventListener('ended', () => setIsPlaying(false));
                audio.removeEventListener('error', (e) => {
                    console.error('Audio error:', e);
                    setIsPlaying(false);
                });
            };
        }
    }, [audioUrl]);

    useEffect(() => {
        if (audioUrl) {
            setIsUnlocking(true);
            // Remove the unlocking class after animation completes
            const timer = setTimeout(() => {
                setIsUnlocking(false);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [audioUrl]);

    // Add a separate effect to check duration when audioUrl changes
    useEffect(() => {
        if (audioUrl && audioRef.current) {
            console.log('Audio URL changed, checking duration...');

            // Reset current time and check duration
            setCurrentTime(0);

            // Create a function to check duration periodically
            const checkDuration = () => {
                if (audioRef.current && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
                    // Validate the duration
                    if (audioRef.current.duration > 86400) {
                        console.error('Invalid duration detected in check:', audioRef.current.duration);
                        return false;
                    }
                    console.log('Duration found after URL change:', audioRef.current.duration);
                    setDuration(audioRef.current.duration);
                    return true;
                }
                return false;
            };

            // Try immediately
            if (!checkDuration()) {
                // If not successful, try again after a short delay
                const timerId = setTimeout(async () => {
                    if (!checkDuration()) {
                        // If still not successful, try manual calculation
                        console.log('Duration not available, attempting manual calculation');
                        try {
                            const calculatedDuration = await calculateMP3Duration(audioUrl);
                            console.log('Manually calculated duration:', calculatedDuration);
                            setDuration(calculatedDuration);
                        } catch (error) {
                            console.error('Manual duration calculation failed:', error);
                            // Set a default duration as fallback
                            setDuration(300); // Default to 5 minutes
                        }
                    }
                }, 1000);

                return () => clearTimeout(timerId);
            }
        }
    }, [audioUrl]);

    const checkForExistingPodcast = async () => {
        try {
            // Check server directly - removing local file check
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('http://localhost:8000/podcasts/default', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();

                if (data && data.audio_url) {
                    setAudioUrl(data.audio_url);
                    setSuccessMessage('Default podcast loaded');
                    setIsSuccess(true);
                    console.log('Default podcast loaded:', data.topic);
                } else {
                    console.log('No podcasts found on server');
                }
            } else {
                console.error('Error fetching latest podcast:', await response.text());
            }
        } catch (error) {
            console.error('Error checking for existing podcast:', error);
        }
    };

    const checkAudioFileExists = async (url) => {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            console.error('Error checking audio file:', error);
            return false;
        }
    };

    useEffect(() => {
        console.log('Component mounted, checking for existing podcasts...');
        checkForExistingPodcast();
    }, []);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                const playPromise = audioRef.current.play();

                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            setIsPlaying(true);
                        })
                        .catch(error => {
                            console.error('Error playing audio:', error);
                            setSuccessMessage('Error playing audio. Please try again.');
                        });
                }
            }
        }
    };

    const handleSeek = (e) => {
        if (!audioRef.current || !audioUrl) return;

        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;

        // Ensure clickPosition is between 0 and 1
        const normalizedPosition = Math.max(0, Math.min(1, clickPosition));
        
        // Get the duration directly from the audio element
        const audioDuration = audioRef.current.duration;
        
        if (isNaN(audioDuration) || audioDuration <= 0) {
            console.warn('Cannot seek: Invalid audio duration');
            return;
        }

        const newTime = normalizedPosition * audioDuration;

        try {
            setIsSeeking(true);
            
            // Update the visual position immediately for better UX
            setCurrentTime(newTime);
            
            // Update audio time
            audioRef.current.currentTime = newTime;
            
            // If was playing, continue playing after seek
            if (isPlaying) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error('Error resuming playback after seek:', error);
                    });
                }
            }
            
            console.log(`Seeking to ${formatTime(newTime)} (${(normalizedPosition * 100).toFixed(2)}%)`);
        } catch (error) {
            console.error('Error during seek:', error);
            // Revert to actual current time on error
            setCurrentTime(audioRef.current.currentTime);
        } finally {
            setIsSeeking(false);
        }
    };

    // Add mouse event handlers for smoother seeking
    const handleProgressBarMouseDown = (e) => {
        if (!audioRef.current || !audioUrl) return;
        setIsSeeking(true);
        handleSeek(e);
        document.addEventListener('mousemove', handleProgressBarMouseMove);
        document.addEventListener('mouseup', handleProgressBarMouseUp);
    };

    const handleProgressBarMouseMove = (e) => {
        if (isSeeking) {
            handleSeek(e);
        }
    };

    const handleProgressBarMouseUp = () => {
        setIsSeeking(false);
        document.removeEventListener('mousemove', handleProgressBarMouseMove);
        document.removeEventListener('mouseup', handleProgressBarMouseUp);
    };

    // Update the time update handler
    const handleTimeUpdate = () => {
        if (audioRef.current && !isSeeking) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const formatTime = (time) => {
        // Handle invalid time values
        if (isNaN(time) || time === null || time === undefined || time < 0) {
            return '0:00';
        }

        // Cap extremely large values (likely errors)
        if (time > 86400) { // More than 24 hours
            console.warn('Extremely large duration detected:', time);
            time = 0; // Reset to 0 for display purposes
        }

        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleWorkflowSelect = (workflow) => {
        setSelectedWorkflow(workflow.name);
        setIsDropdownOpen(false);
    };

    const handleBelieverVoiceSelect = (voice) => {
        setSelectedBelieverVoice(voice);
        setIsBelieverDropdownOpen(false);
    };

    const handleSkepticVoiceSelect = (voice) => {
        setSelectedSkepticVoice(voice);
        setIsSkepticDropdownOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsGenerating(true);
        setResearchSteps([]);
        setBelieverResponses([]);
        setSkepticResponses([]);
        setIsSuccess(false);
        setSuccessMessage('');
        setAudioUrl('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found');
                return;
            }

            const response = await fetch('http://localhost:8000/generate-podcast/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    topic: prompt,
                    believer_voice_id: selectedBelieverVoice.id,
                    skeptic_voice_id: selectedSkepticVoice.id
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        switch (data.type) {
                            case 'intermediate':
                                setResearchSteps(prev => [...prev, data.content]);
                                break;
                            case 'final':
                                setResearchSteps(prev => [...prev, 'Research completed!']);
                                break;
                            case 'believer':
                                if (data.turn) {
                                    setBelieverResponses(prev => {
                                        const newResponses = [...prev];
                                        newResponses[data.turn - 1] = (newResponses[data.turn - 1] || '') + data.content;
                                        return newResponses;
                                    });
                                }
                                break;
                            case 'skeptic':
                                if (data.turn) {
                                    setSkepticResponses(prev => {
                                        const newResponses = [...prev];
                                        newResponses[data.turn - 1] = (newResponses[data.turn - 1] || '') + data.content;
                                        return newResponses;
                                    });
                                }
                                break;
                            case 'success':
                                setIsSuccess(true);
                                setSuccessMessage(data.content || 'Podcast created successfully!');
                                if (data.podcast_url) {
                                    setAudioUrl(`http://localhost:8000${data.podcast_url}`);
                                }
                                break;
                            case 'error':
                                console.error('Error:', data.content);
                                break;
                        }
                        // Auto-scroll to the bottom of insights
                        if (insightsRef.current) {
                            insightsRef.current.scrollTop = insightsRef.current.scrollHeight;
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    // Add a function to manually calculate duration for MP3 files
    const calculateMP3Duration = async (url) => {
        try {
            console.log('Attempting to manually calculate MP3 duration for:', url);

            // Create a temporary audio element
            const tempAudio = new Audio();

            // Create a promise to handle the duration calculation
            const durationPromise = new Promise((resolve, reject) => {
                // Set up event listeners
                tempAudio.addEventListener('loadedmetadata', () => {
                    if (!isNaN(tempAudio.duration) && tempAudio.duration > 0 && tempAudio.duration < 86400) {
                        console.log('Successfully calculated duration:', tempAudio.duration);
                        resolve(tempAudio.duration);
                    } else {
                        // If duration is invalid, use a default value
                        console.warn('Invalid duration from calculation, using default');
                        resolve(300); // Default to 5 minutes (300 seconds)
                    }
                });

                tempAudio.addEventListener('error', (e) => {
                    console.error('Error calculating duration:', e);
                    reject(e);
                });

                // Set a timeout in case the metadata never loads
                setTimeout(() => {
                    console.warn('Duration calculation timed out, using default');
                    resolve(300); // Default to 5 minutes
                }, 5000);
            });

            // Start loading the audio
            tempAudio.src = url;
            tempAudio.load();

            // Wait for the duration to be calculated
            const calculatedDuration = await durationPromise;
            return calculatedDuration;

        } catch (error) {
            console.error('Error in duration calculation:', error);
            return 300; // Default to 5 minutes on error
        }
    };

    return (
        <div className="home-container">
            <div className='home-hero'>
                <div className="home-hero-content">
                    <h1>Welcome to PodCraft</h1>
                </div>
            </div>
            <div className="top-row">
                <div className="column left-column">
                    <div className="content-card">
                        <h3>Generated insights <TbSparkles /></h3>
                        <div className="insights-container" ref={insightsRef}>
                            {researchSteps.length === 0 && !believerResponses.length && !skepticResponses.length ? (
                                <div className="placeholder-content">
                                    <span className="info-icon"><TbSparkles /></span>
                                    <p>Insights from the AI agents will appear here</p>
                                </div>
                            ) : (
                                <div className="insights-content">
                                    {researchSteps.length > 0 && (
                                        <div className="research-section">
                                            <h4>Research Progress</h4>
                                            <div className="research-steps">
                                                {researchSteps.map((step, index) => (
                                                    <div key={index} className="research-step">
                                                        <span className="step-number">{index + 1}</span>
                                                        <p>{step}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {(skepticResponses.length > 0 || believerResponses.length > 0) && (
                                        <div className="debate-section">
                                            {skepticResponses.map((response, index) => (
                                                <React.Fragment key={`turn-${index + 1}`}>
                                                    {response && (
                                                        <div className="agent-response skeptic">
                                                            <div className="agent-header">
                                                                <FaSkull className="agent-icon" />
                                                                <h4>{selectedSkepticVoice.name}'s Turn {index + 1}</h4>
                                                            </div>
                                                            <p>{response}</p>
                                                        </div>
                                                    )}
                                                    {believerResponses[index] && (
                                                        <div className="agent-response believer">
                                                            <div className="agent-header">
                                                                <FaLightbulb className="agent-icon" />
                                                                <h4>{selectedBelieverVoice.name}'s Turn {index + 1}</h4>
                                                            </div>
                                                            <p>{believerResponses[index]}</p>
                                                        </div>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {isSuccess && (
                                <div className="success-message">
                                    <FaCheckCircle className="success-icon" />
                                    <p>{successMessage}</p>
                                </div>
                            )}
                        </div>
                        {isGenerating && (
                            <div className="generating-indicator">
                                <div className="loading-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <p className="generating-text">
                                    {!believerResponses.length ? "Researching topic..." :
                                        !skepticResponses.length ? "Generating believer's perspective..." :
                                            skepticResponses.length > 0 && !isSuccess ? "Creating podcast with TTS..." :
                                                ""}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="column right-column">
                    <div className="content-card">
                        <h3>Configure your podcast <LuBookAudio /></h3>
                        <div className="audio-content">
                            <div className="audio-row">
                                <div className="row-header">
                                    <div className="row-title">
                                        <TiFlowMerge className="row-icon" />
                                        <h4>Choose Workflow Template</h4>
                                    </div>
                                </div>
                                <div className="custom-dropdown" ref={workflowDropdownRef}>
                                    <div
                                        className={`dropdown-header ${isDropdownOpen ? 'open' : ''}`}
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    >
                                        <span>{selectedWorkflow || 'Select Workflow'}</span>
                                        <FaChevronDown className={`chevron ${isDropdownOpen ? 'open' : ''}`} />
                                    </div>
                                    {isDropdownOpen && (
                                        <div className="dropdown-options">
                                            {workflows.map((workflow) => (
                                                <div
                                                    key={workflow.id}
                                                    className="dropdown-option"
                                                    onClick={() => handleWorkflowSelect(workflow)}
                                                >
                                                    {workflow.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="audio-row">
                                <div className="row-header">
                                    <div className="row-title">
                                        <RiVoiceprintFill className="row-icon" />
                                        <h4>Select Voice Style</h4>
                                    </div>
                                </div>
                                <div className="voice-dropdowns">
                                    <div className="voice-dropdown-container">
                                        <div className="voice-type">
                                            <FaLightbulb className="voice-icon believer" />
                                            <span>Believer Voice</span>
                                        </div>
                                        <div className="custom-dropdown" ref={believerDropdownRef}>
                                            <div
                                                className={`dropdown-header ${isBelieverDropdownOpen ? 'open' : ''}`}
                                                onClick={() => setIsBelieverDropdownOpen(!isBelieverDropdownOpen)}
                                            >
                                                <span>{selectedBelieverVoice ? selectedBelieverVoice.name : 'Select Voice'}</span>
                                                <FaChevronDown className={`chevron ${isBelieverDropdownOpen ? 'open' : ''}`} />
                                            </div>
                                            {isBelieverDropdownOpen && (
                                                <div className="dropdown-options">
                                                    {voices.map((voice) => (
                                                        <div
                                                            key={voice.id}
                                                            className={`dropdown-option ${selectedSkepticVoice?.id === voice.id ? 'disabled' : ''}`}
                                                            onClick={() => selectedSkepticVoice?.id !== voice.id && handleBelieverVoiceSelect(voice)}
                                                        >
                                                            <div className="voice-option-content">
                                                                <span>{voice.name}</span>
                                                                <small>{voice.id}</small>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="voice-dropdown-container">
                                        <div className="voice-type">
                                            <FaSkull className="voice-icon skeptic" />
                                            <span>Skeptic Voice</span>
                                        </div>
                                        <div className="custom-dropdown" ref={skepticDropdownRef}>
                                            <div
                                                className={`dropdown-header ${isSkepticDropdownOpen ? 'open' : ''}`}
                                                onClick={() => setIsSkepticDropdownOpen(!isSkepticDropdownOpen)}
                                            >
                                                <span>{selectedSkepticVoice ? selectedSkepticVoice.name : 'Select Voice'}</span>
                                                <FaChevronDown className={`chevron ${isSkepticDropdownOpen ? 'open' : ''}`} />
                                            </div>
                                            {isSkepticDropdownOpen && (
                                                <div className="dropdown-options">
                                                    {voices.map((voice) => (
                                                        <div
                                                            key={voice.id}
                                                            className={`dropdown-option ${selectedBelieverVoice?.id === voice.id ? 'disabled' : ''}`}
                                                            onClick={() => selectedBelieverVoice?.id !== voice.id && handleSkepticVoiceSelect(voice)}
                                                        >
                                                            <div className="voice-option-content">
                                                                <span>{voice.name}</span>
                                                                <small>{voice.id}</small>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="audio-row">
                                <div className="row-header">
                                    <div className="row-title">
                                        <BiPodcast className="row-icon" />
                                        <h4>Preview Audio</h4>
                                    </div>
                                </div>
                                <div className={`player-controls ${!audioUrl ? 'locked' : isUnlocking ? 'unlocking' : ''}`}>
                                    {!audioUrl && <FaLock className="lock-icon" />}
                                    <button
                                        className="play-btn"
                                        onClick={togglePlay}
                                        disabled={!audioUrl}
                                        aria-label={isPlaying ? "Pause" : "Play"}
                                    >
                                        {isPlaying ? <FaPause /> : <FaPlay />}
                                    </button>
                                    <div
                                        className="player-progress"
                                        onMouseDown={handleProgressBarMouseDown}
                                        style={{ cursor: audioUrl ? 'pointer' : 'not-allowed' }}
                                    >
                                        <div className="progress-bar">
                                            <div
                                                className="progress"
                                                style={{
                                                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="time-stamps">
                                        <span>{formatTime(currentTime)}/{formatTime(duration)}</span>
                                    </div>
                                </div>
                                <audio
                                    ref={audioRef}
                                    src={audioUrl}
                                    preload="metadata"
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadStart={() => setIsAudioLoading(true)}
                                    onCanPlay={() => setIsAudioLoading(false)}
                                    onLoadedMetadata={(e) => {
                                        console.log('Audio metadata loaded successfully');
                                        console.log('Audio duration from event:', e.target.duration);
                                        if (audioRef.current && !isNaN(audioRef.current.duration)) {
                                            setDuration(audioRef.current.duration);
                                        }
                                    }}
                                    onDurationChange={(e) => {
                                        console.log('Duration changed:', e.target.duration);
                                        if (!isNaN(e.target.duration) && e.target.duration > 0) {
                                            // Validate duration before setting it
                                            if (e.target.duration > 86400) {
                                                console.error('Invalid duration detected in event:', e.target.duration);
                                                return;
                                            }
                                            setDuration(e.target.duration);
                                        }
                                    }}
                                    onError={(e) => {
                                        console.error('Audio element error:', e);
                                        if (e.target.error) {
                                            console.error('Audio error details:', e.target.error);
                                        }
                                        setIsAudioLoading(false);
                                        setSuccessMessage('Error loading audio. Please try again.');
                                        setIsSuccess(false);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bottom-row">
                <div className="prompt-container">
                    <form onSubmit={handleSubmit} className="prompt-form">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Enter your prompt to generate a podcast..."
                            className="prompt-input"
                            disabled={isGenerating}
                        />
                        <button
                            type="submit"
                            className="prompt-submit"
                            disabled={isGenerating || !prompt.trim()}
                        >
                            <RiSendPlaneFill />
                        </button>
                    </form>
                </div>
            </div>
            <div className="workflows-redirect">
                <button onClick={() => navigate('/workflows')} className="workflows-button">
                    Create in workflows <FaArrowRight />
                </button>
            </div>
            {isAudioLoading && <div>Loading audio...</div>}
        </div>
    );
};

export default Home; 