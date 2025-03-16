import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
} from 'reactflow';
import { FaArrowLeft, FaSave, FaTrash, FaPlay, FaTimes, FaPencilAlt, FaCheck, FaPause, FaVolumeUp, FaUserCog } from 'react-icons/fa';
import { TiFlowMerge } from "react-icons/ti";
import { RiRobot2Fill } from "react-icons/ri";
import { BsToggle2Off, BsToggle2On } from "react-icons/bs";
import AgentModal from './AgentModal';
import Toast from './Toast';
import 'reactflow/dist/style.css';
import './WorkflowEditor.css';

const initialNodes = [
    {
        id: '1',
        type: 'input',
        data: { label: 'Input Prompt' },
        position: { x: 250, y: 25 },
    },
    {
        id: '2',
        data: { label: 'AI Processing' },
        position: { x: 250, y: 125 },
    },
    {
        id: '3',
        type: 'output',
        data: { label: 'Generated Podcast' },
        position: { x: 250, y: 225 },
    },
];

const initialEdges = [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
];

const DEFAULT_AGENTS = [
    { id: 'researcher', name: 'Research Agent', status: 'Default', isDefault: true },
    { id: 'believer', name: 'Believer Agent', status: 'Default', isDefault: true },
    { id: 'skeptic', name: 'Skeptic Agent', status: 'Default', isDefault: true }
];

const WorkflowEditor = () => {
    const { workflowId } = useParams();
    const navigate = useNavigate();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [workflowName, setWorkflowName] = useState('');
    const [isEditingName, setIsEditingName] = useState(workflowId === '-1');
    const [tempWorkflowName, setTempWorkflowName] = useState('');
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [agents, setAgents] = useState(DEFAULT_AGENTS);
    const [isLoadingAgents, setIsLoadingAgents] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [toast, setToast] = useState(null);
    const [isInsightsEnabled, setIsInsightsEnabled] = useState(false);
    const [podcastText, setPodcastText] = useState('');
    const [selectedVoice, setSelectedVoice] = useState('alloy');
    const [selectedEmotion, setSelectedEmotion] = useState('neutral');
    const [voiceSpeed, setVoiceSpeed] = useState(1.0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [audioUrl, setAudioUrl] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [successMessage, setSuccessMessage] = useState('');
    const audioRef = useRef(null);

    const voices = [
        { id: 'alloy', name: 'Alloy' },
        { id: 'echo', name: 'Echo' },
        { id: 'fable', name: 'Fable' },
        { id: 'onyx', name: 'Onyx' },
        { id: 'nova', name: 'Nova' },
        { id: 'shimmer', name: 'Shimmer' }
    ];

    const emotions = [
        { id: 'neutral', name: 'Neutral' },
        { id: 'happy', name: 'Happy' },
        { id: 'sad', name: 'Sad' },
        { id: 'excited', name: 'Excited' },
        { id: 'calm', name: 'Calm' }
    ];

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const handleSaveWorkflow = async () => {
        if (!workflowName.trim()) {
            setToast({
                message: 'Please enter a workflow name',
                type: 'error'
            });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const workflowData = {
                name: workflowName,
                description: '',
                nodes: nodes,
                edges: edges
            };

            const url = workflowId === '-1'
                ? 'http://localhost:8000/api/workflows'
                : `http://localhost:8000/api/workflows/${workflowId}`;

            const method = workflowId === '-1' ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(workflowData)
            });

            if (!response.ok) {
                throw new Error('Failed to save workflow');
            }

            const savedWorkflow = await response.json();

            // Update workflowId if this was a new workflow
            if (workflowId === '-1') {
                navigate(`/workflows/workflow/${savedWorkflow.id}`, { replace: true });
            }

            setToast({
                message: 'Workflow saved successfully!',
                type: 'success'
            });
        } catch (error) {
            console.error('Error saving workflow:', error);
            setToast({
                message: 'Failed to save workflow',
                type: 'error'
            });
        }
    };

    const handleClearWorkflow = () => {
        setNodes([]);
        setEdges([]);
    };

    const handleExecuteWorkflow = () => {
        console.log('Execute workflow clicked');
    };

    const handleEditName = () => {
        setTempWorkflowName(workflowName);
        setIsEditingName(true);
    };

    const handleSaveName = () => {
        if (tempWorkflowName.trim()) {
            setWorkflowName(tempWorkflowName.trim());
            setIsEditingName(false);
        }
    };

    const handleCancelNameEdit = () => {
        setTempWorkflowName(workflowName);
        setIsEditingName(false);
    };

    const handleCreateAgents = () => {
        setIsAgentModalOpen(true);
    };

    const handleAgentClick = (agent) => {
        if (!agent.isDefault) {
            setSelectedAgent(agent);
            setIsAgentModalOpen(true);
        }
    };

    // Load custom agents
    const loadCustomAgents = async () => {
        try {
            setIsLoadingAgents(true);
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found');
                return;
            }

            const response = await fetch('http://localhost:8000/agents', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load agents');
            }

            const customAgents = await response.json();
            const formattedCustomAgents = customAgents.map(agent => ({
                id: agent.agent_id,
                name: agent.name,
                voice_id: agent.voice_id,
                status: 'Ready',
                isDefault: false
            }));

            // Combine default and custom agents
            setAgents([...DEFAULT_AGENTS, ...formattedCustomAgents]);
        } catch (error) {
            console.error('Error loading agents:', error);
        } finally {
            setIsLoadingAgents(false);
        }
    };

    // Load agents when modal closes
    const handleAgentModalClose = () => {
        setIsAgentModalOpen(false);
        setSelectedAgent(null);
        loadCustomAgents(); // Reload agents after modal closes
    };

    // Load workflow data if editing an existing workflow
    useEffect(() => {
        const loadWorkflow = async () => {
            if (workflowId === '-1') return; // Skip loading for new workflows

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:8000/api/workflows/${workflowId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to load workflow');
                }

                const workflow = await response.json();
                setWorkflowName(workflow.name);
                setTempWorkflowName(workflow.name);
                if (workflow.nodes) setNodes(workflow.nodes);
                if (workflow.edges) setEdges(workflow.edges);
            } catch (error) {
                console.error('Error loading workflow:', error);
                alert('Failed to load workflow');
            }
        };

        loadWorkflow();
    }, [workflowId]);

    // Initial load of agents
    useEffect(() => {
        loadCustomAgents();
    }, []);

    const handleGeneratePodcast = async () => {
        if (!podcastText.trim()) {
            console.log('Please enter some text');
            return;
        }

        setIsGenerating(true);
        setSuccessMessage('');
        try {
            const response = await fetch('http://localhost:8000/generate-text-podcast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    text: podcastText,
                    voice_id: selectedVoice,
                    emotion: selectedEmotion,
                    speed: voiceSpeed
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to generate podcast');
            }

            const data = await response.json();
            console.log('Podcast generated:', data);
            
            if (data.audio_url) {
                setAudioUrl(data.audio_url);
                setSuccessMessage('Podcast generated successfully! You can now play it below.');
            }
            
        } catch (error) {
            console.error('Error generating podcast:', error);
            setSuccessMessage(`Error: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleProgressClick = (e) => {
        if (audioRef.current) {
            const progressBar = e.currentTarget;
            const rect = progressBar.getBoundingClientRect();
            const clickPosition = (e.clientX - rect.left) / rect.width;
            const newTime = clickPosition * audioRef.current.duration;
            if (!isNaN(newTime)) {
                audioRef.current.currentTime = newTime;
                setCurrentTime(newTime);
            }
        }
    };

    const handleProgressMouseMove = (e) => {
        if (audioRef.current && e.buttons === 1) { // Check if primary mouse button is pressed
            const progressBar = e.currentTarget;
            const rect = progressBar.getBoundingClientRect();
            const clickPosition = (e.clientX - rect.left) / rect.width;
            const newTime = clickPosition * audioRef.current.duration;
            if (!isNaN(newTime)) {
                audioRef.current.currentTime = newTime;
                setCurrentTime(newTime);
            }
        }
    };

    return (
        <div className="editor-container">
            <div className="editor-header">
                <h1>Build out a workflow for your podcast generation <TiFlowMerge /></h1>
                <button className="back-button" onClick={() => navigate('/workflows')}>
                    <FaArrowLeft /> Back to Workflows
                </button>
            </div>
            <div className="editor-content">
                <div className="editor-main">
                    <div className="flow-controls">
                        <div className="workflow-name-container">
                            {isEditingName ? (
                                <>
                                    <input
                                        type="text"
                                        value={tempWorkflowName}
                                        onChange={(e) => setTempWorkflowName(e.target.value)}
                                        placeholder="Enter workflow name..."
                                        className="workflow-name-input"
                                    />
                                    <button
                                        className="name-action-button save"
                                        onClick={handleSaveName}
                                        title="Save name"
                                    >
                                        <FaCheck />
                                    </button>
                                    <button
                                        className="name-action-button cancel"
                                        onClick={handleCancelNameEdit}
                                        title="Cancel"
                                    >
                                        <FaTimes />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="workflow-name-display">
                                        {workflowName || 'Untitled Workflow'}
                                    </div>
                                    <button
                                        className="name-action-button edit"
                                        onClick={handleEditName}
                                        title="Edit name"
                                    >
                                        <FaPencilAlt />
                                    </button>
                                </>
                            )}
                        </div>
                        <button className="flow-button save-workflow" onClick={handleSaveWorkflow}>
                            <FaSave />
                            <span>Save</span>
                        </button>
                        <button className="flow-button clear-workflow" onClick={handleClearWorkflow}>
                            <FaTrash />
                            <span>Clear</span>
                        </button>
                        <button className="flow-button execute-workflow" onClick={handleExecuteWorkflow}>
                            <FaPlay />
                            <span>Run</span>
                        </button>
                    </div>
                    <div className="flow-wrapper">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            fitView
                        >
                            <Background />
                            <Controls />
                            <MiniMap />
                        </ReactFlow>
                    </div>
                </div>
                <div className="editor-insights">
                    <div
                        className="toggle-insights"
                        onClick={() => setIsInsightsEnabled(!isInsightsEnabled)}
                        style={{ cursor: 'pointer' }}
                        title={isInsightsEnabled ? "Click to disable insights" : "Click to enable insights"}
                    >
                        <h2>{isInsightsEnabled ? "Workflow Insights" : "Text to Podcast"}</h2>
                        {isInsightsEnabled ? <BsToggle2On style={{ marginLeft: '10px' }} /> : <BsToggle2Off style={{ marginLeft: '10px' }} />}
                    </div>

                    <div className="insights-content">
                        {isInsightsEnabled ? (
                            <p>
                                Workflow insights are now active. You'll see real-time analytics and insights about your workflow here.
                            </p>
                        ) : (
                            <div className="podcast-generation-form">
                                <div className="voice-controls">
                                    <div className="voice-select-group">
                                        <label>Voice:</label>
                                        <select 
                                            value={selectedVoice}
                                            onChange={(e) => setSelectedVoice(e.target.value)}
                                        >
                                            {voices.map(voice => (
                                                <option key={voice.id} value={voice.id}>
                                                    {voice.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="voice-select-group">
                                        <label>Emotion:</label>
                                        <select 
                                            value={selectedEmotion}
                                            onChange={(e) => setSelectedEmotion(e.target.value)}
                                        >
                                            {emotions.map(emotion => (
                                                <option key={emotion.id} value={emotion.id}>
                                                    {emotion.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="voice-select-group">
                                        <label>Speed: {voiceSpeed}x</label>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="2.0"
                                            step="0.1"
                                            value={voiceSpeed}
                                            onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                                            className="speed-slider"
                                        />
                                    </div>
                                </div>
                                <textarea
                                    value={podcastText}
                                    onChange={(e) => setPodcastText(e.target.value)}
                                    placeholder="Enter your text here to generate a podcast..."
                                    rows={8}
                                    className="podcast-text-input"
                                />
                                <button 
                                    className="generate-button"
                                    onClick={handleGeneratePodcast}
                                    disabled={isGenerating || !podcastText.trim()}
                                >
                                    {isGenerating ? 'Generating...' : 'Generate Podcast'}
                                </button>
                                {successMessage && (
                                    <div className={`generation-message ${successMessage.includes('Error') ? 'error' : 'success'}`}>
                                        {successMessage}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="editor-sidebar">
                    <div className="sidebar-card agents-view">
                        <h3><RiRobot2Fill /> Create your agents</h3>
                        <div className="agents-list">
                            {isLoadingAgents ? (
                                <div className="loading-agents">Loading agents...</div>
                            ) : (
                                agents.map((agent) => (
                                    <div
                                        key={agent.id}
                                        className={`agent-item ${agent.isDefault ? 'default' : 'custom'}`}
                                        onClick={() => handleAgentClick(agent)}
                                        style={{ cursor: agent.isDefault ? 'default' : 'pointer' }}
                                    >
                                        <span className="agent-name">{agent.name}</span>
                                        <span className="agent-status">{agent.status}</span>
                                    </div>
                                ))
                            )}
                        </div>
                        <button
                            className="create-agents-btn"
                            onClick={() => setIsAgentModalOpen(true)}
                            type="button"
                        >
                            <FaUserCog /> Create your own agents
                        </button>
                        <p>Design and configure AI agents with unique personalities and roles for your podcast</p>
                    </div>
                    <div className="sidebar-card podcast-audio-view">
                        <h3><FaVolumeUp /> Podcast Preview</h3>
                        <div className="audio-player">
                            <audio
                                ref={audioRef}
                                src={audioUrl}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onEnded={() => setIsPlaying(false)}
                                onPause={() => setIsPlaying(false)}
                                onPlay={() => setIsPlaying(true)}
                            />
                            <div className="player-controls">
                                <button 
                                    className="play-button" 
                                    onClick={handlePlayPause}
                                    disabled={!audioUrl}
                                >
                                    {isPlaying ? <FaPause /> : <FaPlay />}
                                </button>
                                <div 
                                    className="progress-bar" 
                                    onClick={handleProgressClick}
                                    onMouseMove={handleProgressMouseMove}
                                >
                                    <div 
                                        className="progress" 
                                        style={{ 
                                            width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` 
                                        }}
                                    />
                                </div>
                                <div className="time-display">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </div>
                            </div>
                        </div>
                        <p>Preview your generated podcast audio</p>
                    </div>
                </div>
            </div>
            <AgentModal
                isOpen={isAgentModalOpen}
                onClose={handleAgentModalClose}
                editAgent={selectedAgent}
            />
            {toast && (
                <div className="toast-container">
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                </div>
            )}
        </div>
    );
};

export default WorkflowEditor;