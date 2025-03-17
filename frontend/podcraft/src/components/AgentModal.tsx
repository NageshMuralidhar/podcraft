import React, { useState, useEffect } from 'react';
import { FaPlay, FaSave, FaTimes, FaChevronDown, FaVolumeUp } from 'react-icons/fa';
import './AgentModal.css';
import { BsRobot, BsToggleOff, BsToggleOn } from "react-icons/bs";
import Toast from './Toast';


type Voice = {
    id: string;
    name: string;
    description: string;
};

type FormData = {
    name: string;
    voice: Voice | null;
    speed: number;
    pitch: number;
    volume: number;
    outputFormat: 'mp3' | 'wav';
    testInput: string;
    personality: string;
    showPersonality: boolean;
};

const VOICE_OPTIONS: Voice[] = [
    { id: 'alloy', name: 'Alloy', description: 'Versatile, well-rounded voice' },
    { id: 'ash', name: 'Ash', description: 'Direct and clear articulation' },
    { id: 'coral', name: 'Coral', description: 'Warm and inviting tone' },
    { id: 'echo', name: 'Echo', description: 'Balanced and measured delivery' },
    { id: 'fable', name: 'Fable', description: 'Expressive storytelling voice' },
    { id: 'onyx', name: 'Onyx', description: 'Authoritative and professional' },
    { id: 'nova', name: 'Nova', description: 'Energetic and engaging' },
    { id: 'sage', name: 'Sage', description: 'Calm and thoughtful delivery' },
    { id: 'shimmer', name: 'Shimmer', description: 'Bright and optimistic tone' }
];

interface AgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    editAgent?: {
        id: string;
        name: string;
        voice_id: string;
        speed: number;
        pitch: number;
        volume: number;
        output_format: string;
        personality: string;
    } | null;
}

const AgentModal: React.FC<AgentModalProps> = ({ isOpen, onClose, editAgent }) => {
    const [formData, setFormData] = useState<FormData>({
        name: '',
        voice: null,
        speed: 1,
        pitch: 1,
        volume: 1,
        outputFormat: 'mp3',
        testInput: '',
        personality: '',
        showPersonality: false
    });

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
    const [isTestingVoice, setIsTestingVoice] = useState(false);

    // Initialize form data when editing an agent
    useEffect(() => {
        if (editAgent) {
            // Find the matching voice from VOICE_OPTIONS
            const matchingVoice = VOICE_OPTIONS.find(voice => voice.id === editAgent.voice_id) || VOICE_OPTIONS[0];

            // Ensure output_format is either 'mp3' or 'wav'
            const validOutputFormat = editAgent.output_format === 'wav' ? 'wav' : 'mp3';

            setFormData({
                name: editAgent.name,
                voice: matchingVoice,
                speed: editAgent.speed || 1,
                pitch: editAgent.pitch || 1,
                volume: editAgent.volume || 1,
                outputFormat: validOutputFormat,
                testInput: '',
                personality: editAgent.personality || '',
                showPersonality: !!editAgent.personality
            });
        } else {
            // Reset form when not editing
            setFormData({
                name: '',
                voice: VOICE_OPTIONS[0],
                speed: 1,
                pitch: 1,
                volume: 1,
                outputFormat: 'mp3',
                testInput: '',
                personality: '',
                showPersonality: false
            });
        }
    }, [editAgent]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleVoiceSelect = (voice: Voice) => {
        setFormData(prev => ({
            ...prev,
            voice
        }));
        setIsDropdownOpen(false);
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
            setFormData(prev => ({
                ...prev,
                [name]: numericValue
            }));
        }
    };

    const handleTestVoice = async () => {
        if (!formData.testInput.trim()) {
            setToast({ message: 'Please enter some text to test', type: 'error' });
            return;
        }

        try {
            setIsTestingVoice(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setToast({ message: 'Authentication token not found', type: 'error' });
                setIsTestingVoice(false);
                return;
            }

            // Stop any currently playing audio
            if (audioPlayer) {
                audioPlayer.pause();
                audioPlayer.src = '';
                setAudioPlayer(null);
            }

            // Prepare test data
            const testData = {
                text: formData.testInput.trim(),
                voice_id: formData.voice?.id || 'alloy',
                emotion: 'neutral',  // Default emotion
                speed: formData.speed
            };

            console.log('Sending test data:', JSON.stringify(testData, null, 2));

            // Make API request
            const response = await fetch('http://localhost:8000/agents/test-voice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(testData)
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', JSON.stringify(data, null, 2));

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to test voice');
            }

            if (!data.audio_url) {
                throw new Error('No audio URL returned from server');
            }

            setToast({ message: 'Creating audio player...', type: 'info' });

            // Create and configure new audio player
            const newPlayer = new Audio();

            // Set up event handlers before setting the source
            newPlayer.onerror = (e) => {
                console.error('Audio loading error:', newPlayer.error, e);
                setToast({
                    message: `Failed to load audio file: ${newPlayer.error?.message || 'Unknown error'}`,
                    type: 'error'
                });
                setIsTestingVoice(false);
            };

            newPlayer.oncanplaythrough = () => {
                console.log('Audio can play through, starting playback');
                newPlayer.play()
                    .then(() => {
                        setToast({ message: 'Playing test audio', type: 'success' });
                    })
                    .catch((error) => {
                        console.error('Playback error:', error);
                        setToast({
                            message: `Failed to play audio: ${error.message}`,
                            type: 'error'
                        });
                        setIsTestingVoice(false);
                    });
            };

            newPlayer.onended = () => {
                console.log('Audio playback ended');
                setIsTestingVoice(false);
            };

            // Log the audio URL we're trying to play
            console.log('Setting audio source to:', data.audio_url);

            // Set the source and start loading
            newPlayer.src = data.audio_url;
            setAudioPlayer(newPlayer);

            // Try to load the audio
            try {
                await newPlayer.load();
                console.log('Audio loaded successfully');
            } catch (loadError) {
                console.error('Error loading audio:', loadError);
                setToast({
                    message: `Error loading audio: ${loadError instanceof Error ? loadError.message : 'Unknown error'}`,
                    type: 'error'
                });
                setIsTestingVoice(false);
            }

        } catch (error) {
            console.error('Error testing voice:', error);
            setToast({
                message: error instanceof Error ? error.message : 'Failed to test voice',
                type: 'error'
            });
            setIsTestingVoice(false);
        }
    };

    // Cleanup audio player on modal close
    React.useEffect(() => {
        return () => {
            if (audioPlayer) {
                audioPlayer.pause();
                audioPlayer.src = '';
            }
        };
    }, [audioPlayer]);

    const toggleInputType = () => {
        setFormData(prev => ({
            ...prev,
            showPersonality: !prev.showPersonality
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.voice) {
            setToast({ message: 'Please select a voice', type: 'error' });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setToast({ message: 'Authentication token not found', type: 'error' });
                return;
            }

            const requestData = {
                name: formData.name,
                voice_id: formData.voice.id,
                voice_name: formData.voice.name,
                voice_description: formData.voice.description,
                speed: formData.speed,
                pitch: formData.pitch,
                volume: formData.volume,
                output_format: formData.outputFormat, // Use snake_case to match backend
                personality: formData.showPersonality ? formData.personality : null
            };

            console.log('Request data:', JSON.stringify(requestData, null, 2));

            const url = editAgent
                ? `http://localhost:8000/agents/${editAgent.id}`
                : 'http://localhost:8000/agents/create';

            const response = await fetch(url, {
                method: editAgent ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestData)
            });

            const responseData = await response.json();
            console.log('Response data:', JSON.stringify(responseData, null, 2));

            if (!response.ok) {
                throw new Error(JSON.stringify(responseData, null, 2));
            }

            setToast({ message: `Agent ${editAgent ? 'updated' : 'created'} successfully`, type: 'success' });
            onClose();
        } catch (error) {
            console.error('Error saving agent:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
                try {
                    const errorDetails = JSON.parse(error.message);
                    setToast({
                        message: errorDetails.detail?.[0]?.msg || 'Failed to save agent',
                        type: 'error'
                    });
                } catch {
                    setToast({ message: error.message, type: 'error' });
                }
            } else {
                setToast({ message: 'An unexpected error occurred', type: 'error' });
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="agent-modal-overlay" style={{ display: isOpen ? 'flex' : 'none' }}>
            <div className="agent-modal-content">
                <div className="agent-modal-header">
                    <h2>{editAgent ? 'Edit Agent' : 'Create New Agent'}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>

                <form className="agent-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Agent Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Enter agent name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Voice</label>
                        <div className="custom-dropdown">
                            <div
                                className="dropdown-header"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <div className="selected-voice">
                                    <FaVolumeUp />
                                    <div className="voice-info">
                                        <span>{formData.voice?.name}</span>
                                        <small>{formData.voice?.description}</small>
                                    </div>
                                </div>
                                <FaChevronDown style={{
                                    transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                                    transition: 'transform 0.3s ease'
                                }} />
                            </div>
                            {isDropdownOpen && (
                                <div className="dropdown-options">
                                    {VOICE_OPTIONS.map(voice => (
                                        <div
                                            key={voice.id}
                                            className="dropdown-option"
                                            onClick={() => handleVoiceSelect(voice)}
                                        >
                                            <FaVolumeUp />
                                            <div className="voice-info">
                                                <span>{voice.name}</span>
                                                <small>{voice.description}</small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="speed">Speed</label>
                        <div className="slider-container">
                            <input
                                type="range"
                                id="speed"
                                name="speed"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={formData.speed}
                                onChange={handleSliderChange}
                            />
                            <span className="slider-value">{formData.speed}x</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="pitch">Pitch</label>
                        <div className="slider-container">
                            <input
                                type="range"
                                id="pitch"
                                name="pitch"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={formData.pitch}
                                onChange={handleSliderChange}
                            />
                            <span className="slider-value">{formData.pitch}x</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="volume">Volume</label>
                        <div className="slider-container">
                            <input
                                type="range"
                                id="volume"
                                name="volume"
                                min="0"
                                max="2"
                                step="0.1"
                                value={formData.volume}
                                onChange={handleSliderChange}
                            />
                            <span className="slider-value">{formData.volume}x</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Output Format</label>
                        <div className="radio-group">
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="outputFormat"
                                    value="mp3"
                                    checked={formData.outputFormat === 'mp3'}
                                    onChange={handleInputChange}
                                />
                                <span>MP3</span>
                            </label>
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="outputFormat"
                                    value="wav"
                                    checked={formData.outputFormat === 'wav'}
                                    onChange={handleInputChange}
                                />
                                <span>WAV</span>
                            </label>
                        </div>
                    </div>

                    <div className="form-group toggle-group">
                        <label>Input Type</label>
                        <div className="toggle-container" onClick={toggleInputType}>
                            <span className={!formData.showPersonality ? 'active' : ''}>Test Input</span>
                            {formData.showPersonality ?
                                <BsToggleOn className="toggle-icon" /> :
                                <BsToggleOff className="toggle-icon" />
                            }
                            <span className={formData.showPersonality ? 'active' : ''}>Agent Personality</span>
                        </div>
                    </div>

                    {formData.showPersonality ? (
                        <div className="form-group">
                            <label htmlFor="personality">Agent Personality</label>
                            <textarea
                                id="personality"
                                name="personality"
                                value={formData.personality}
                                onChange={handleInputChange}
                                placeholder="Describe the personality and characteristics of this agent..."
                                rows={4}
                            />
                            <small className="help-text">This personality description will be used to guide the agent's responses in workflows.</small>
                        </div>
                    ) : (
                        <div className="form-group">
                            <label htmlFor="testInput">Test Input</label>
                            <textarea
                                id="testInput"
                                name="testInput"
                                value={formData.testInput}
                                onChange={handleInputChange}
                                placeholder="Enter text to test the voice"
                                rows={4}
                            />
                        </div>
                    )}

                    <div className="modal-actions">
                        {!formData.showPersonality && (
                            <button
                                type="button"
                                className="test-voice-btn"
                                onClick={handleTestVoice}
                                disabled={!formData.testInput || isTestingVoice}
                            >
                                <FaPlay /> {isTestingVoice ? 'Testing...' : 'Test Voice'}
                            </button>
                        )}
                        <div className="right-actions">
                            <button type="button" className="cancel-btn" onClick={onClose}>
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="save-btn"
                                disabled={isLoading}
                            >
                                <FaSave /> {isLoading ? 'Saving...' : 'Save Agent'}
                            </button>
                        </div>
                    </div>
                </form>

                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default AgentModal; 