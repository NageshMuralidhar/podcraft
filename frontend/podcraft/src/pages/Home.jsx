import React, { useState } from 'react';
import { RiSendPlaneFill } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import { TbSparkles } from "react-icons/tb";
import { LuBookAudio } from "react-icons/lu";
import { FaArrowRight, FaPlay, FaVolumeUp, FaChevronDown, FaLightbulb, FaSkull } from "react-icons/fa";
import { TiFlowMerge } from "react-icons/ti";
import { RiVoiceprintFill } from "react-icons/ri";
import { BsSoundwave } from "react-icons/bs";

const Home = () => {
    const [prompt, setPrompt] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isBelieverDropdownOpen, setIsBelieverDropdownOpen] = useState(false);
    const [isSkepticDropdownOpen, setIsSkepticDropdownOpen] = useState(false);
    const [selectedWorkflow, setSelectedWorkflow] = useState('Basic Podcast');
    const [selectedBelieverVoice, setSelectedBelieverVoice] = useState('');
    const [selectedSkepticVoice, setSelectedSkepticVoice] = useState('');
    const navigate = useNavigate();

    const workflows = [
        { id: '1', name: 'Basic Podcast' },
        { id: '2', name: 'Interview Style' },
        { id: '3', name: 'News Digest' }
    ];

    const believerVoices = [
        { id: '1', name: 'Optimistic Tone' },
        { id: '2', name: 'Inspiring Voice' },
        { id: '3', name: 'Enthusiastic Style' }
    ];

    const skepticVoices = [
        { id: '1', name: 'Critical Tone' },
        { id: '2', name: 'Analytical Voice' },
        { id: '3', name: 'Questioning Style' }
    ];

    const handleWorkflowSelect = (workflow) => {
        setSelectedWorkflow(workflow.name);
        setIsDropdownOpen(false);
    };

    const handleBelieverVoiceSelect = (voice) => {
        setSelectedBelieverVoice(voice.name);
        setIsBelieverDropdownOpen(false);
    };

    const handleSkepticVoiceSelect = (voice) => {
        setSelectedSkepticVoice(voice.name);
        setIsSkepticDropdownOpen(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // TODO: Handle prompt submission
        console.log('Prompt submitted:', prompt);
        setPrompt('');
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
                        <h3>Generated insights </h3>
                        <div className="placeholder-content">
                            <span className="info-icon"><TbSparkles /></span>
                            <p>Insights from the AI agents will appear here</p>
                        </div>
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
                                <div className="custom-dropdown">
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
                                        <div className="custom-dropdown">
                                            <div
                                                className={`dropdown-header ${isBelieverDropdownOpen ? 'open' : ''}`}
                                                onClick={() => setIsBelieverDropdownOpen(!isBelieverDropdownOpen)}
                                            >
                                                <span>{selectedBelieverVoice || 'Select Voice'}</span>
                                                <FaChevronDown className={`chevron ${isBelieverDropdownOpen ? 'open' : ''}`} />
                                            </div>
                                            {isBelieverDropdownOpen && (
                                                <div className="dropdown-options">
                                                    {believerVoices.map((voice) => (
                                                        <div
                                                            key={voice.id}
                                                            className="dropdown-option"
                                                            onClick={() => handleBelieverVoiceSelect(voice)}
                                                        >
                                                            {voice.name}
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
                                        <div className="custom-dropdown">
                                            <div
                                                className={`dropdown-header ${isSkepticDropdownOpen ? 'open' : ''}`}
                                                onClick={() => setIsSkepticDropdownOpen(!isSkepticDropdownOpen)}
                                            >
                                                <span>{selectedSkepticVoice || 'Select Voice'}</span>
                                                <FaChevronDown className={`chevron ${isSkepticDropdownOpen ? 'open' : ''}`} />
                                            </div>
                                            {isSkepticDropdownOpen && (
                                                <div className="dropdown-options">
                                                    {skepticVoices.map((voice) => (
                                                        <div
                                                            key={voice.id}
                                                            className="dropdown-option"
                                                            onClick={() => handleSkepticVoiceSelect(voice)}
                                                        >
                                                            {voice.name}
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
                                        <BsSoundwave className="row-icon" />
                                        <h4>Preview Audio</h4>
                                    </div>
                                </div>
                                <div className="podcast-player">
                                    <div className="player-controls">
                                        <button className="play-btn">
                                            <FaPlay />
                                        </button>
                                        <div className="player-progress">
                                            <div className="progress-bar">
                                                <div className="progress" style={{ width: '60%' }}></div>
                                            </div>
                                            <div className="time-stamps">
                                                <span>1:30</span>
                                                <span>3:45</span>
                                            </div>
                                        </div>
                                        <div className="volume-control">
                                            <FaVolumeUp />
                                        </div>
                                    </div>
                                </div>
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
                        />
                        <span className="prompt-submit">
                            <RiSendPlaneFill />
                        </span>
                    </form>
                </div>
            </div>
            <div className="studio-redirect">
                <button onClick={() => navigate('/studio')} className="studio-button">
                    Create in studio <FaArrowRight />
                </button>
            </div>
        </div>
    );
};

export default Home; 