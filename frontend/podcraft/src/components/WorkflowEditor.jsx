import React, { useState, useCallback, useEffect } from 'react';
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
import AgentModal from './AgentModal';
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
    const [isEditingName, setIsEditingName] = useState(true);
    const [tempWorkflowName, setTempWorkflowName] = useState('');
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [agents, setAgents] = useState(DEFAULT_AGENTS);
    const [isLoadingAgents, setIsLoadingAgents] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const handleSaveWorkflow = () => {
        if (!workflowName.trim()) {
            console.log('Please enter a workflow name');
            return;
        }
        console.log('Save workflow clicked', { name: workflowName, nodes, edges });
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

    // Initial load of agents
    useEffect(() => {
        loadCustomAgents();
    }, []);

    return (
        <div className="editor-container">
            <div className="editor-header">
                <h1>Build out a workflow for your podcast generation <TiFlowMerge /></h1>
                <button className="back-button" onClick={() => navigate('/studio')}>
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
                    <h2>Workflow Insights</h2>
                    <div className="insights-content">
                        <p>Real-time analytics and insights about your workflow will appear here</p>
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
                            <div className="player-controls">
                                <button className="play-button">
                                    <FaPlay />
                                </button>
                                <div className="progress-bar">
                                    <div className="progress"></div>
                                </div>
                                <div className="time-display">0:00 / 0:00</div>
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
        </div>
    );
};

export default WorkflowEditor;