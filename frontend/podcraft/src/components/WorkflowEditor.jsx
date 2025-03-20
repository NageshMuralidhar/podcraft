import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    isNode,
    MarkerType,
    BackgroundVariant,
    applyEdgeChanges,
    applyNodeChanges,
    Panel
} from 'reactflow';
import { FaArrowLeft, FaSave, FaTrash, FaPlay, FaTimes, FaPencilAlt, FaCheck, FaPause, FaVolumeUp, FaUserCog, FaPlus, FaChevronDown, FaMicrophone, FaSearch, FaPodcast } from 'react-icons/fa';
import { TiFlowMerge } from "react-icons/ti";
import { RiRobot2Fill } from "react-icons/ri";
import { BsToggle2Off, BsToggle2On } from "react-icons/bs";
import AgentModal from './AgentModal';
import WorkflowToast from './WorkflowToast';
import NodeSelectionPanel from './NodeSelectionPanel';
import InputNodeModal from './InputNodeModal';
import customNodeTypes from './CustomNodes'; // Import our custom node types
import CustomEdge, { customEdgeTypes } from './CustomEdge'; // Import our custom edge component
import { MdSentimentSatisfiedAlt, MdSentimentNeutral, MdSentimentDissatisfied, MdSentimentVeryDissatisfied, MdSentimentVerySatisfied } from 'react-icons/md';
import 'reactflow/dist/style.css';
import './WorkflowEditor.css';
import ResponseEditModal from './ResponseEditModal';
import ChatDetailModal from './ChatDetailModal';

const initialNodes = [];
const initialEdges = [];

const DEFAULT_AGENTS = [
    { id: 'researcher', name: 'Research Agent', status: 'Default', isDefault: true, personality: null },
    { id: 'believer', name: 'Believer Agent', status: 'Default', isDefault: true, personality: null },
    { id: 'skeptic', name: 'Skeptic Agent', status: 'Default', isDefault: true, personality: null }
];

// Define toast type
const initialToastState = {
    message: '',
    type: 'info'
};

// Define node data types with proper interface
const createNodeData = (label, additionalData = {}) => {
    // Create basic data object with default values
    const data = {
        label,
        description: '',
        ...additionalData
    };

    return data;
};

// Create a typed node creator function
const createNode = (id, position, data, nodeType = 'default') => {
    const node = {
        id,
        position,
        data,
        type: nodeType
    };

    return node;
};

// Connection validation rules
const isValidConnection = (connection, nodes) => {
    const { source, target } = connection;

    // Get source and target nodes
    const sourceNode = nodes.find(node => node.id === source);
    const targetNode = nodes.find(node => node.id === target);

    if (!sourceNode || !targetNode) return false;

    // Get node types
    const sourceType = sourceNode.type;
    const targetType = targetNode.type;

    // Define connection rules
    // 1. Input Node can only output to Researcher nodes
    if (sourceType === 'input' && targetType !== 'researcher') {
        return false;
    }

    // 2. Researcher Node can take input from Input nodes and output to Agent nodes or Insights nodes
    if (sourceType === 'researcher' && (targetType !== 'agent' && targetType !== 'insights')) {
        return false;
    }
    if (targetType === 'researcher' && sourceType !== 'input') {
        return false;
    }

    // 3. Agent Nodes can only output to Insights nodes
    if (sourceType === 'agent' && targetType !== 'insights') {
        return false;
    }

    // 4. Insights Node can only take inputs from Agent nodes or Researcher nodes and output to Notify or Publish
    if (sourceType === 'insights' && targetType !== 'notify' && targetType !== 'output') {
        return false;
    }
    if (targetType === 'insights' && sourceType !== 'agent' && sourceType !== 'researcher') {
        return false;
    }

    // 5. Notify and Publish nodes can only take input from Insights
    if ((targetType === 'notify' || targetType === 'output') && sourceType !== 'insights') {
        return false;
    }

    return true;
};

// Add this as a new component at the top of the file, after imports
// This will be used to manage and display toasts

const ToastContainer = ({ toast, setToast }) => {
    if (!toast || !toast.message) return null;

    // Create a DOM container for toast if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    return (
        <WorkflowToast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(initialToastState)}
        />
    );
};

const WorkflowEditor = () => {
    const { workflowId } = useParams();
    const navigate = useNavigate();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [workflowName, setWorkflowName] = useState('New Workflow');
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempWorkflowName, setTempWorkflowName] = useState('');
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [agents, setAgents] = useState(DEFAULT_AGENTS);
    const [isLoadingAgents, setIsLoadingAgents] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [toast, setToast] = useState(initialToastState);
    const [isInsightsEnabled, setIsInsightsEnabled] = useState(true);
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
    const [isLoading, setIsLoading] = useState(false); // Add missing isLoading state

    // Add missing state variables:
    const [isNodePanelOpen, setIsNodePanelOpen] = useState(false);
    const [selectedInputNode, setSelectedInputNode] = useState(null);
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);

    // New state variables for workflow execution
    const [executionState, setExecutionState] = useState({});
    const [isExecuting, setIsExecuting] = useState(false);
    const [workflowInsights, setWorkflowInsights] = useState(null); // Can be string or object
    const [workflowInsightsHtml, setWorkflowInsightsHtml] = useState("");
    const [showInsights, setShowInsights] = useState(false);

    // State for ReactFlow instance
    const [rfInstance, setRfInstance] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [executionResults, setExecutionResults] = useState({}); // No specific typing yet

    // Default edge options for animated flow
    const defaultEdgeOptions = {
        type: 'custom',
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 }, // Default color, will be overridden contextually
        markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#6366f1', // Default color, will be overridden contextually
            width: 20,
            height: 20,
        }
    };

    // Edge types definition
    const edgeTypes = { ...customEdgeTypes };

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

    const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false);
    const [emotionDropdownOpen, setEmotionDropdownOpen] = useState(false);

    const voiceDropdownRef = useRef(null);
    const emotionDropdownRef = useRef(null);

    // Set edge class based on source node type
    const getEdgeClass = (sourceNode) => {
        if (!sourceNode) return '';
        const type = sourceNode.type || 'default';
        return `source-${type.replace('Node', '')}`;
    };

    const onConnect = useCallback((params) => {
        // Check if connection is valid
        if (isValidConnection(params, nodes)) {
            // Find source node to determine edge styling
            const sourceNode = nodes.find(node => node.id === params.source);

            // Create a new edge with styling based on source node type
            const newEdge = {
                ...params,
                id: `e${params.source}-${params.target}`,
                type: 'custom',
                animated: true,
                style: {
                    strokeWidth: 2
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 20,
                    height: 20,
                },
                data: { sourceType: sourceNode?.type?.replace('Node', '') || 'default' },
                className: getEdgeClass(sourceNode)
            };

            setEdges((eds) => addEdge(newEdge, eds));
        } else {
            // Show error message about invalid connection
            setToast({
                message: 'Invalid connection: Node types cannot be connected in this way',
                type: 'error'
            });
        }
    }, [nodes, setEdges, setToast]);

    const onNodeClick = useCallback((event, node) => {
        // Check if the clicked node is an input node
        if (node.type === 'input') {
            setSelectedInputNode(node.id);
            setIsInputModalOpen(true);
        }
    }, []);

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

            // Create workflow data
            const workflowData = {
                name: workflowName,
                description: '',
                nodes: nodes,
                edges: edges,
                insights: workflowInsights // Pass as is - backend handles null, object, or string
            };

            // Safe logging of insights for debugging
            console.log("Saving workflow with insights type:", typeof workflowInsights);

            // Only attempt further logging if workflowInsights exists
            if (workflowInsights) {
                // Extremely defensive logging that avoids property access
                try {
                    console.log("Insights preview:",
                        JSON.stringify(workflowInsights).slice(0, 100) + "...");
                } catch (error) {
                    console.log("Could not stringify insights for logging");
                }
            }

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

            // Show success toast - ensure this matches the expected format
            console.log("Displaying success toast");
            setToast({
                message: 'Workflow saved successfully!',
                type: 'success'
            });

            // Ensure the toast is visible by forcing a small delay
            setTimeout(() => {
                console.log("Toast should be visible now");
            }, 100);

        } catch (error) {
            console.error('Error saving workflow:', error);

            // Show error toast
            setToast({
                message: 'Error saving workflow: ' + (error.message || 'Unknown error'),
                type: 'error'
            });
        }
    };

    const handleClearWorkflow = () => {
        setNodes([]);
        setEdges([]);
    };

    const handleExecuteWorkflow = async () => {
        // Prevent multiple executions
        if (isExecuting) {
            setToast({
                message: 'Workflow is already executing',
                type: 'info'
            });
            return;
        }

        // Initial validation
        if (nodes.length === 0) {
            setToast({
                message: 'No nodes to execute in the workflow',
                type: 'error'
            });
            return;
        }

        // Check for input nodes
        const inputNodes = nodes.filter(node => node.type === 'input');
        if (inputNodes.length === 0) {
            setToast({
                message: 'Workflow must contain at least one input node',
                type: 'error'
            });
            return;
        }

        // Check for agent nodes
        const agentNodes = nodes.filter(node => node.type === 'agent' || node.type === 'researcher');
        if (agentNodes.length === 0) {
            setToast({
                message: 'Workflow must contain at least one agent or researcher',
                type: 'error'
            });
            return;
        }

        // Check for insights node
        const insightsNodes = nodes.filter(node => node.type === 'insights');
        if (insightsNodes.length === 0) {
            setToast({
                message: 'Workflow must contain an insights node',
                type: 'error'
            });
            return;
        }

        // Check for missing connections
        const unconnectedNodes = nodes.filter(node => {
            if (node.type === 'input') return false; // Input nodes don't need incoming connections
            const incomingEdges = edges.filter(edge => edge.target === node.id);
            return incomingEdges.length === 0;
        });

        if (unconnectedNodes.length > 0) {
            const nodeNames = unconnectedNodes.map(n => n.data.label || n.type).join(', ');
            setToast({
                message: `Some nodes are not connected: ${nodeNames}`,
                type: 'error'
            });
            return;
        }

        // Set up execution state
        setIsExecuting(true);
        setWorkflowInsights(""); // Clear previous insights

        // Initialize execution state for all nodes
        const initialNodeState = {};
        nodes.forEach(node => {
            initialNodeState[node.id] = {
                status: 'pending', // pending, in-progress, completed, error
                result: null,
                error: null
            };
        });
        setExecutionState(initialNodeState);

        try {
            // Update UI to show we're starting
            setToast({
                message: 'Starting workflow execution...',
                type: 'info'
            });

            // Sort nodes in execution order
            const nodeOrder = getTopologicalOrder(nodes, edges);
            console.log("Execution order:", nodeOrder);

            // Track execution results
            const executionResults = {};
            let userPrompt = "";
            let researchResults = "";
            // Use an explicit type annotation for the array
            const debateTranscript = [];

            // STEP 1: Process input nodes
            for (const nodeId of nodeOrder) {
                const node = nodes.find(n => n.id === nodeId);
                if (!node || node.type !== 'input') continue;

                try {
                    // Mark as in-progress
                    await updateNodeStatus(nodeId, 'in-progress');

                    // Validate prompt
                    if (!node.data || !node.data.prompt) {
                        throw new Error(`No prompt provided for input node "${node.data.label || 'Input'}"`);
                    }

                    userPrompt = node.data.prompt;
                    executionResults[nodeId] = userPrompt;

                    // Mark as completed
                    await updateNodeStatus(nodeId, 'completed', userPrompt);

                    setToast({
                        message: `Processed input: "${userPrompt.substring(0, 30)}${userPrompt.length > 30 ? '...' : ''}"`,
                        type: 'success'
                    });

                    // Small delay for UI
                    await new Promise(r => setTimeout(r, 500));
                } catch (error) {
                    await updateNodeStatus(nodeId, 'error', null, error.message);
                    throw error;
                }
            }

            if (!userPrompt) {
                throw new Error("No input found in workflow");
            }

            // STEP 2: Process researcher nodes
            for (const nodeId of nodeOrder) {
                const node = nodes.find(n => n.id === nodeId);
                if (!node || node.type !== 'researcher') continue;

                try {
                    // Mark as in-progress
                    await updateNodeStatus(nodeId, 'in-progress');

                    setToast({
                        message: 'Researching topic...',
                        type: 'info'
                    });

                    // Execute research
                    researchResults = await executeResearcherNode(userPrompt);
                    executionResults[nodeId] = researchResults;

                    // Mark as completed
                    await updateNodeStatus(nodeId, 'completed', researchResults);

                    // Small delay for UI
                    await new Promise(r => setTimeout(r, 500));
                } catch (error) {
                    await updateNodeStatus(nodeId, 'error', null, error.message);
                    throw error;
                }
            }

            // STEP 3: Find and execute all agent nodes for debate
            const debateAgents = nodes
                .filter(node => node.type === 'agent')
                .map(node => ({
                    id: node.id,
                    name: node.data.label || 'Agent',
                    agent: node
                }));

            if (debateAgents.length > 0) {
                // Execute 3 turns of debate with all agents
                setToast({
                    message: `Starting debate with ${debateAgents.length} agents`,
                    type: 'info'
                });

                // Mark all agents as in-progress
                for (const agent of debateAgents) {
                    await updateNodeStatus(agent.id, 'in-progress');
                }

                // Execute 3 turns of debate
                for (let turn = 1; turn <= 3; turn++) {
                    setToast({
                        message: `Debate turn ${turn}/3 in progress...`,
                        type: 'info'
                    });

                    // Each agent takes a turn
                    for (const agent of debateAgents) {
                        try {
                            // Create appropriate prompt for this turn
                            const prompt = createDebatePrompt(
                                userPrompt,
                                researchResults,
                                debateTranscript,
                                agent.name,
                                turn
                            );

                            // Get agent response
                            const response = await executeAgentDebate(
                                agent.agent,
                                prompt,
                                turn
                            );

                            // Add to transcript
                            debateTranscript.push({
                                agentId: agent.id,
                                agentName: agent.name,
                                turn: turn,
                                response: response
                            });

                            // Small delay between agents
                            await new Promise(r => setTimeout(r, 300));
                        } catch (error) {
                            console.error(`Error in agent ${agent.name} turn ${turn}:`, error);
                            // Continue with other agents even if one fails
                        }
                    }

                    // Delay between turns
                    await new Promise(r => setTimeout(r, 800));
                }

                // Mark all agents as completed
                for (const agent of debateAgents) {
                    // Get just this agent's responses
                    const agentResponses = debateTranscript
                        .filter(entry => entry.agentId === agent.id)
                        .map(entry => entry.response)
                        .join("\n\n");

                    executionResults[agent.id] = agentResponses;
                    await updateNodeStatus(agent.id, 'completed', agentResponses);
                }
            }

            // STEP 4: Process insights nodes
            for (const nodeId of nodeOrder) {
                const node = nodes.find(n => n.id === nodeId);
                if (!node || node.type !== 'insights') continue;

                try {
                    // Mark as in-progress
                    await updateNodeStatus(nodeId, 'in-progress');

                    setToast({
                        message: 'Generating insights...',
                        type: 'info'
                    });

                    // Generate insights from debate
                    const insights = await generateDebateInsights(
                        userPrompt,
                        researchResults,
                        debateTranscript,
                        {}
                    );

                    // Update UI with insights
                    setWorkflowInsights(insights);
                    setShowInsights(true); // Set showInsights to true after generation
                    executionResults[nodeId] = insights;

                    // Mark as completed
                    await updateNodeStatus(nodeId, 'completed', insights);

                    setToast({
                        message: 'Insights generated successfully',
                        type: 'success'
                    });

                    // Directly save the workflow with the newly generated insights
                    // This avoids the timing issues with React state updates
                    await saveWorkflowWithInsights(insights);
                } catch (error) {
                    await updateNodeStatus(nodeId, 'error', null, error.message);
                    throw error;
                }
            }

            setToast({
                message: 'Workflow completed successfully',
                type: 'success'
            });
        } catch (error) {
            console.error('Workflow execution error:', error);
            setToast({
                message: `Workflow error: ${error.message}`,
                type: 'error'
            });
        } finally {
            setIsExecuting(false);
        }
    };

    // Helper function to update node status with UI delay
    const updateNodeStatus = async (nodeId, status, result = null, error = null) => {
        setExecutionState(prev => {
            const newState = Object.assign({}, prev);
            newState[nodeId] = { status, result, error };
            return newState;
        });

        // Allow time for React to update the UI
        await new Promise(resolve => setTimeout(resolve, 100));
    };

    // Helper function to collect inputs for a node
    const collectNodeInputs = async (nodeId, executionResults) => {
        const incomingEdges = edges.filter(edge => edge.target === nodeId);
        const inputs = {};

        for (const edge of incomingEdges) {
            const sourceId = edge.source;
            const result = executionResults[sourceId];

            if (!result) {
                throw new Error(`Missing result from source node ${sourceId}`);
            }

            inputs[sourceId] = result;
        }

        return inputs;
    };

    // Helper function to collect all inputs for insights node
    const collectInsightsInputs = async (nodeId, executionResults) => {
        const incomingEdges = edges.filter(edge => edge.target === nodeId);
        const inputs = {};

        for (const edge of incomingEdges) {
            const sourceId = edge.source;
            const result = executionResults[sourceId];

            if (!result) {
                throw new Error(`Missing result from source node ${sourceId}`);
            }

            inputs[sourceId] = result;
        }

        return inputs;
    };

    // Create a debate prompt for an agent turn
    const createDebatePrompt = (topic, research, debateTranscript, agentName, turn) => {
        // Format previous debate turns for context
        const previousDebate = debateTranscript.map(entry =>
            `${entry.agentName} (Turn ${entry.turn}): ${entry.response}`
        ).join("\n\n");

        // Build a prompt based on which turn this is
        if (turn === 1) {
            return `
# Debate Topic: ${topic}

## Research Context:
${research}

## Your Task:
You are ${agentName}. This is turn 1 of the debate. 
Present your initial perspective on the topic based on the research.
Keep your response concise (2-3 paragraphs).
`;
        } else {
            return `
# Debate Topic: ${topic}

## Research Context:
${research}

## Previous Debate Turns:
${previousDebate}

## Your Task:
You are ${agentName}. This is turn ${turn} of the debate.
React to the previous speakers' points and develop your perspective further.
Keep your response concise (2-3 paragraphs).
`;
        }
    };

    // Execute agent in debate mode
    const executeAgentDebate = async (node, debatePrompt, turn) => {
        try {
            const agentId = node.data.agentId;
            const agentName = node.data.label || "Agent";

            setToast({
                message: `${agentName} is formulating turn ${turn} response...`,
                type: 'info'
            });

            // Look up agent details if it's a custom agent
            const customAgent = agents.find(a => a.id === agentId && !a.isDefault);
            let agentPersonality = null;

            if (customAgent) {
                console.log(`Using custom agent: ${customAgent.name}`);
                // Fetch full agent details if needed
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`http://localhost:8000/agents/${agentId}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const agentDetails = await response.json();
                        agentPersonality = agentDetails.personality;
                        console.log(`Agent personality: ${agentPersonality ? agentPersonality.substring(0, 50) + "..." : "None"}`);
                    }
                } catch (error) {
                    console.warn(`Could not fetch full agent details: ${error.message}`);
                }
            }

            // Wait to simulate processing
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

            // Generate response based on agent type and debate context
            let response = "";
            if (agentPersonality) {
                // Use the custom agent's personality to guide the response
                response = await generatePersonalityBasedResponse(agentName, debatePrompt, turn, agentPersonality);
            } else if (agentId === 'believer') {
                response = await generateBelieverResponse(debatePrompt, turn);
            } else if (agentId === 'skeptic') {
                response = await generateSkepticResponse(debatePrompt, turn);
            } else {
                response = await generateGenericAgentResponse(agentName, debatePrompt, turn);
            }

            return response;
        } catch (error) {
            console.error("Error in agent debate turn:", error);
            return `I apologize, but I encountered an error while formulating my response. Let me summarize my key points briefly: [Error: ${error.message}]`;
        }
    };

    // Generate a response based on a custom agent's personality
    const generatePersonalityBasedResponse = async (agentName, debatePrompt, turn, personality) => {
        // Extract the topic from the prompt
        const topicMatch = debatePrompt.match(/Debate Topic: (.*?)$/m);
        const topic = topicMatch ? topicMatch[1].trim() : "the topic";

        // Simulate API call or complex processing
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Create a prompt that incorporates the agent's personality
        let promptWithPersonality = `
# Agent: ${agentName}
# Personality: ${personality}
# Debate Topic: ${topic}
# Turn: ${turn}

You are participating in a debate as ${agentName}. Your personality and characteristics are described as:
${personality}

${debatePrompt}

Respond in a way that reflects your unique personality while addressing the debate topic.
`;

        console.log(`Generated personality-based prompt for ${agentName}, turn ${turn}`);

        // Here we would normally make an API call to an LLM to generate the response
        // For now, simulate a response that references the personality
        if (turn === 1) {
            return `As ${agentName}, I approach the topic of ${topic} with my unique perspective. 

The research presented offers valuable insights that I can analyze through my particular lens. My assessment is that the key points deserve careful consideration, and I'd like to highlight how they connect to form a coherent picture.

My experience suggests that we should pay particular attention to the implications of these findings for practical application in relevant contexts.`;
        } else {
            return `Continuing our discussion on ${topic}, I'd like to respond to some of the points raised by my fellow debaters.

I find that some of the perspectives offered align with my own thinking, while others prompt me to offer an alternative viewpoint. Specifically, I believe the evidence supports a more nuanced interpretation than what has been suggested.

Looking at this topic through my particular perspective, I would emphasize that understanding the contextual factors is crucial for developing a comprehensive evaluation of the situation.`;
        }
    };

    // Generate a believer agent response
    const generateBelieverResponse = async (debatePrompt, turn) => {
        // Extract the topic from the prompt
        const topicMatch = debatePrompt.match(/Debate Topic: (.*?)$/m);
        const topic = topicMatch ? topicMatch[1].trim() : "the topic";

        // Simulate API call or complex processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        switch (turn) {
            case 1:
                return `As a believer in ${topic}, I see strong evidence supporting its validity. The research clearly demonstrates several key points that we cannot ignore. First, the historical data consistently shows patterns that align with this perspective. Second, respected experts in the field have reached similar conclusions through varied methodologies.

I'm particularly convinced by the comprehensive nature of the findings. When multiple lines of evidence converge on the same conclusion, we should take notice. The practical applications of this understanding are potentially transformative for how we approach related challenges.`;

            case 2:
                return `I appreciate the perspectives shared so far, but I must emphasize that the skeptical view overlooks several crucial aspects of the evidence. The data doesn't just suggest but strongly indicates that this position is well-founded.

What's most compelling is how the research addresses the common counterarguments. Even when accounting for alternate explanations, the core findings remain robust. This isn't about belief alone - it's about following where the evidence leads, and in this case, it clearly supports the affirmative position on ${topic}.`;

            case 3:
                return `As we conclude this debate, I want to highlight that embracing this understanding of ${topic} offers practical benefits that skepticism alone cannot provide. The research gives us a foundation for building effective solutions and making meaningful progress.

We should be guided by evidence while remaining open to refinement. The current body of knowledge strongly supports this view, and while future research may add nuance, the fundamental conclusions are well-established. I believe we can move forward with confidence in this understanding while maintaining intellectual humility.`;

            default:
                return `I continue to support the view that ${topic} is substantiated by strong evidence. The collective research presents a compelling case that withstands scrutiny and offers valuable insights for practical application.`;
        }
    };

    // Generate a skeptic agent response
    const generateSkepticResponse = async (debatePrompt, turn) => {
        // Extract the topic from the prompt
        const topicMatch = debatePrompt.match(/Debate Topic: (.*?)$/m);
        const topic = topicMatch ? topicMatch[1].trim() : "the topic";

        // Simulate API call or complex processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        switch (turn) {
            case 1:
                return `While I acknowledge the research presented on ${topic}, I must emphasize several methodological concerns that warrant caution. The evidence base appears limited in scope and potentially affected by confirmation bias. We should be wary of drawing definitive conclusions from what may be incomplete data.

Critical analysis reveals alternative explanations that haven't been adequately addressed. The correlation-causation distinction is particularly relevant here, as many of the observed patterns could stem from unexamined variables. Good science requires us to consider all plausible interpretations before claiming certainty.`;

            case 2:
                return `I've listened carefully to the optimistic interpretation of the research, but I must point out that the confidence expressed seems disproportionate to the quality of evidence. Several key studies cited have limitations in sample size, control measures, and applicability across contexts.

Furthermore, there's a concerning pattern of dismissing contradictory findings rather than integrating them into a more nuanced understanding. True scientific progress comes from rigorous questioning, not from selectively interpreting data to fit preconceived notions about ${topic}.`;

            case 3:
                return `As we conclude, I want to emphasize that skepticism serves a vital function in advancing our understanding of ${topic}. By identifying weaknesses in current research and demanding higher standards of evidence, we ultimately strengthen the foundation of knowledge.

I don't reject the possibility that the proposed interpretation may be correct. Rather, I maintain that the current evidence doesn't justify the level of certainty being expressed. The most responsible position is to acknowledge the limitations of our understanding while continuing to investigate with methodological rigor and intellectual honesty.`;

            default:
                return `I remain skeptical of the conclusions drawn about ${topic} given the limitations in the current research. We should maintain scientific caution and avoid overinterpreting evidence that may be incomplete or subject to various biases.`;
        }
    };

    // Generate a generic agent response
    const generateGenericAgentResponse = async (agentName, debatePrompt, turn) => {
        // Extract the topic from the prompt
        const topicMatch = debatePrompt.match(/Debate Topic: (.*?)$/m);
        const topic = topicMatch ? topicMatch[1].trim() : "the topic";

        // Simulate API call or complex processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        switch (turn) {
            case 1:
                return `Examining ${topic} from a balanced perspective, I see valid points on multiple sides of this discussion. The research presents interesting findings that deserve careful consideration, though we should be mindful of the limitations inherent in studying such a complex subject.

I find particularly noteworthy the intersection of quantitative data with qualitative insights, which together paint a more complete picture. We should approach this topic with both analytical rigor and contextual understanding, recognizing that different frameworks may yield complementary insights.`;

            case 2:
                return `Both the confident and cautious perspectives shared so far have merit, but I believe the most productive approach lies in synthesizing these viewpoints. The research on ${topic} contains valuable insights, even while acknowledging methodological constraints.

What's often overlooked in polarized debates is how contextual factors influence outcomes. The evidence suggests that certain principles hold true under specific conditions, which explains some of the seemingly contradictory findings. By focusing on these contingencies, we can develop a more nuanced understanding.`;

            case 3:
                return `As we conclude this exchange, I want to emphasize that progress in understanding ${topic} will come from integrating diverse perspectives rather than advocating for a single viewpoint. The most promising path forward involves collaborative investigation that draws on multiple methodologies and theoretical frameworks.

I encourage us to move beyond the binary thinking of simply accepting or rejecting claims, instead focusing on building contextual understanding. By acknowledging both the strengths of the current research and the opportunities for improvement, we can advance knowledge in a way that's both rigorous and pragmatic.`;

            default:
                return `I continue to advocate for a nuanced approach to ${topic} that acknowledges complexity and integrates diverse perspectives. The most valuable insights often emerge from considering multiple viewpoints and remaining open to refinement as new evidence emerges.`;
        }
    };

    // Generate insights from debate transcript
    const generateDebateInsights = async (topic, research, debateTranscript, inputs) => {
        try {
            setToast({
                message: 'Synthesizing insights from debate...',
                type: 'info'
            });

            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Create structured data for insights
            const insightsData = {
                topic: topic,
                research: research,
                transcript: debateTranscript.map(entry => ({
                    agentId: entry.agentId,
                    agentName: entry.agentName,
                    turn: entry.turn,
                    content: entry.response
                })),
                keyInsights: [
                    `The debate revealed multiple valid perspectives on ${topic}, highlighting the complexity of this subject`,
                    `Areas of agreement included the need for rigorous methodology and the value of continued research`,
                    `Points of contention centered on the interpretation of existing evidence and appropriate levels of certainty`,
                    `This topic benefits from interdisciplinary approaches that consider both quantitative and qualitative factors`,
                    `Future discussions would benefit from examining specific case studies and contextual applications`
                ],
                conclusion: `This debate demonstrates how different analytical frameworks can lead to varied interpretations of the same evidence. Rather than viewing these perspectives as contradictory, they may be better understood as complementary approaches that together provide a more complete understanding of ${topic}. The podcast format allowed for a rich exploration of nuance that might be lost in more simplified discussions.`
            };

            // Format the research in a card style for display
            const formattedResearch = `<div class="research-card">
  <div class="research-header">
    <div class="research-icon">🔍</div>
    <div class="research-title">Research Summary</div>
  </div>
  <div class="research-content">
    ${research.split('\n').slice(0, 8).join('\n')}
    ${research.split('\n').length > 8 ? '...' : ''}
  </div>
</div>`;

            // Format the debate transcript in chat style for display
            const chatMessages = debateTranscript.map((entry, index) => {
                const isBeliever = entry.agentName.toLowerCase().includes('believer');
                const isSkeptic = entry.agentName.toLowerCase().includes('skeptic');
                const isResearcher = entry.agentName.toLowerCase().includes('research');

                let agentColor = '#8B5CF6'; // Default purple
                let agentEmoji = '🤖';
                let isEditable = !isResearcher; // All agents except Researcher are editable

                if (isBeliever) {
                    agentColor = '#10B981'; // Green
                    agentEmoji = '✅';
                } else if (isSkeptic) {
                    agentColor = '#EF4444'; // Red
                    agentEmoji = '❓';
                }

                // Debug IDs to help track specific chat bubbles
                const chatBubbleId = `chat-bubble-${entry.agentId}-${entry.turn}`;

                // Important: Set data-editable as a string 'true' or 'false', not a boolean
                // This ensures correct attribute comparison later
                const editableAttr = isEditable ? 'true' : 'false';

                // Add CSS class only if editable (makes styling more consistent)
                const editableClass = isEditable ? 'editable-response' : '';

                // Add data attributes for agent ID and turn number to make responses identifiable
                // Also add an edit indicator for editable responses
                return `<div class="chat-message" id="message-${index}">
<div class="chat-avatar" style="background-color: ${agentColor};">${agentEmoji}</div>
<div class="chat-bubble ${editableClass}" 
    id="${chatBubbleId}"
    data-agent-id="${entry.agentId}" 
    data-turn="${entry.turn}" 
    data-agent-name="${entry.agentName}"
    data-editable="${editableAttr}">
  <div class="chat-header">
    <span class="chat-name">${entry.agentName}</span>
    <span class="chat-turn">Turn ${entry.turn}</span>
    ${isEditable ? '<span class="edit-indicator">Click to edit</span>' : ''}
  </div>
  <div class="chat-content">
    ${entry.response.replace(/\n\n/g, '<br><br>')}
  </div>
</div>
</div>`;
            }).join('\n');

            // Create HTML for display
            const insightsHtml = `<div class="insights-container">
  <h1>Podcast Debate: ${topic}</h1>
  
  ${formattedResearch}
  
  <h2>Debate Transcript</h2>
  <div class="debate-transcript">
  ${chatMessages}
  </div>
  
  <h2>Key Insights</h2>
  <div class="insights-section">
    <ol>
      ${insightsData.keyInsights.map(insight => `<li>${insight}</li>`).join('\n      ')}
    </ol>
  </div>
  
  <h2>Conclusion</h2>
  <div class="conclusion-section">
    <p>${insightsData.conclusion}</p>
  </div>
</div>`;

            // Update UI with HTML for display
            setWorkflowInsights(insightsHtml);
            setShowInsights(true); // Set showInsights to true after generating HTML

            // Save the structured data to MongoDB - THIS IS THE KEY PART
            // We pass the structured data object, not the HTML
            console.log("Saving structured insights data to MongoDB:", insightsData);
            await saveWorkflowWithInsights(insightsData);

            // Return structured data for execution results
            return insightsData;
        } catch (error) {
            // Create HTML error message
            const errorHtml = `<div class="insights-error">
  <h2>Error Generating Insights</h2>
  <p>We encountered a problem while generating insights. Please try again.</p>
  <ul>
    <li>${error.message}</li>
  </ul>
</div>`;

            // Setup fallback structured data for error case
            const fallbackData = {
                topic: topic || "Unknown topic",
                research: research || "",
                transcript: debateTranscript || [],
                keyInsights: ["Error generating insights: " + error.message],
                conclusion: "Unable to generate conclusion due to an error."
            };

            // Update UI with error HTML
            setWorkflowInsights(errorHtml);
            setShowInsights(true); // Set showInsights to true even in error case

            // Return fallback structured data
            return fallbackData;
        }
    };

    // Add the executeResearcherNode function
    const executeResearcherNode = async (topic) => {
        try {
            console.log("Researching topic:", topic);

            // Simulate API call with timeout
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Generate research content based on the prompt
            const researchContent = `# Research Summary: ${topic}

## Key Points
1. This topic has been studied extensively across multiple fields including psychology, sociology, and economics.
2. Recent studies have shown mixed results, with some supporting and others challenging mainstream views.
3. Historical context is essential for understanding the evolution of thinking on this subject.
4. There are several competing frameworks for analyzing this topic, each with its strengths and limitations.

## Evidence Summary
The evidence base includes both quantitative studies with large sample sizes and qualitative research offering deeper insights. Meta-analyses suggest moderate effect sizes for key relationships, though publication bias remains a concern. Longitudinal studies have tracked developments over time, showing how patterns shift in response to changing conditions.

## Expert Perspectives
Experts in the field generally agree on fundamental principles while disagreeing on specific interpretations and implications. The consensus view acknowledges complexity and context-dependence, avoiding oversimplified conclusions.

## Limitations & Gaps
Current research has limitations in methodology, sample diversity, and theoretical integration. More work is needed to reconcile contradictory findings and develop more nuanced models that account for cultural and contextual factors.

## Practical Implications
Understanding this topic has significant implications for policy, practice, and individual decision-making. A balanced approach based on the best available evidence suggests caution in implementation while remaining open to innovation.`;

            return researchContent;
        } catch (error) {
            console.error("Error in researcher node:", error);
            throw new Error(`Research failed: ${error.message}`);
        }
    };

    // Add topological sort function to determine node execution order
    const getTopologicalOrder = (nodes, edges) => {
        // Create adjacency list representation of the graph
        const graph = {};
        const inDegrees = {};

        // Initialize graph with all nodes
        nodes.forEach(node => {
            graph[node.id] = [];
            inDegrees[node.id] = 0;
        });

        // Fill the graph with edges
        edges.forEach(edge => {
            const from = edge.source;
            const to = edge.target;

            if (graph[from]) {
                graph[from].push(to);
            }

            if (inDegrees[to] !== undefined) {
                inDegrees[to]++;
            }
        });

        // Find nodes with zero in-degree (starting nodes)
        const queue = [];
        Object.keys(inDegrees).forEach(nodeId => {
            if (inDegrees[nodeId] === 0) {
                queue.push(nodeId);
            }
        });

        // Process nodes in topological order
        const result = [];

        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);

            graph[current].forEach(neighbor => {
                inDegrees[neighbor]--;

                if (inDegrees[neighbor] === 0) {
                    queue.push(neighbor);
                }
            });
        }

        // Check if we processed all nodes (no cycles)
        if (result.length !== nodes.length) {
            console.warn("Workflow has cycles or disconnected nodes");
        }

        return result;
    };

    const handleAddNode = () => {
        setIsNodePanelOpen(true);
    };

    const handleNodeSelect = ({ type, agentId }) => {
        const nodeCount = nodes.length;
        const newNodeId = `${nodeCount + 1}`;

        // Calculate grid-like position for better layout
        // Improved spacing with wider columns and rows
        const columnWidth = 300;  // Increased from 250
        const rowHeight = 200;    // Increased from 150
        const columnsPerRow = 3;

        const column = nodeCount % columnsPerRow;
        const row = Math.floor(nodeCount / columnsPerRow);

        // Add some offset randomization to prevent perfect alignment
        // which can make connections look messy
        const randomOffset = {
            x: Math.random() * 40 - 20,  // Random offset between -20 and 20
            y: Math.random() * 40 - 20
        };

        const position = {
            x: 100 + (column * columnWidth) + randomOffset.x,  // Start from 100 instead of 50
            y: 100 + (row * rowHeight) + randomOffset.y        // Start from 100 instead of 50
        };

        // If this is the first node, position it in center
        if (nodeCount === 0) {
            position.x = 300;
            position.y = 200;
        }

        // Configure node based on type
        switch (type) {
            case 'input':
                setNodes((nds) => [...nds, createNode(
                    newNodeId,
                    position,
                    createNodeData('Input Prompt', {
                        description: 'Enter your podcast topic or question'
                    }),
                    'input'
                )]);
                break;
            case 'agent':
                const selectedAgent = agents.find(a => a.id === agentId);

                // Special handling for researcher agent
                if (selectedAgent && selectedAgent.id === 'researcher') {
                    setNodes((nds) => [...nds, createNode(
                        newNodeId,
                        position,
                        createNodeData(
                            'Research Agent',
                            {
                                agentId,
                                description: 'Gathers information and research data'
                            }
                        ),
                        'researcher'
                    )]);
                } else {
                    setNodes((nds) => [...nds, createNode(
                        newNodeId,
                        position,
                        createNodeData(
                            selectedAgent ? `${selectedAgent.name}` : 'AI Agent',
                            {
                                agentId,
                                description: selectedAgent ? `${selectedAgent.status} agent` : 'Processes and enhances content'
                            }
                        ),
                        'agent'
                    )]);
                }
                break;
            case 'insights':
                setNodes((nds) => [...nds, createNode(
                    newNodeId,
                    position,
                    createNodeData('Insights Analysis', {
                        description: 'Extract key findings and trends'
                    }),
                    'insights'
                )]);
                break;
            case 'notify':
                setNodes((nds) => [...nds, createNode(
                    newNodeId,
                    position,
                    createNodeData('Notification', {
                        description: 'Sends alerts when processing completes'
                    }),
                    'notify'
                )]);
                break;
            case 'publish':
                setNodes((nds) => [...nds, createNode(
                    newNodeId,
                    position,
                    createNodeData('YouTube Publication', {
                        description: 'Publish podcast to your channel'
                    }),
                    'output'
                )]);
                break;
            default:
                setNodes((nds) => [...nds, createNode(
                    newNodeId,
                    position,
                    createNodeData(`Node ${newNodeId}`, {
                        description: 'Custom workflow node'
                    })
                )]);
        }
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
                personality: agent.personality,
                status: agent.personality ? 'Personalized' : 'Ready',
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

    const handleInputSubmit = (nodeId, prompt) => {
        if (!prompt || !prompt.trim()) {
            setToast({
                message: 'Please enter a prompt for the input node',
                type: 'error'
            });
            return;
        }

        // Update the node with the prompt
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    const updatedNode = {
                        ...node,
                        data: {
                            ...node.data,
                            prompt: prompt.trim(),
                            label: `Input: ${prompt.substring(0, 20)}${prompt.length > 20 ? '...' : ''}`
                        }
                    };
                    console.log("Updated input node:", updatedNode);
                    return updatedNode;
                }
                return node;
            })
        );

        // Provide feedback to the user
        setToast({
            message: 'Input prompt saved successfully',
            type: 'success'
        });
    };

    // Load workflow data if editing an existing workflow
    useEffect(() => {
        const loadWorkflow = async () => {
            if (workflowId && workflowId !== "-1") {
                try {
                    // Show loading
                    setIsLoading(true);

                    // Make API request to load workflow by ID
                    const response = await fetch(`http://localhost:8000/api/workflows/${workflowId}`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to load workflow: ${response.statusText}`);
                    }

                    const workflow = await response.json();
                    console.log("Loaded workflow:", workflow);

                    // Set workflow name and description
                    setWorkflowName(workflow.name);

                    // Check if we have insights to display
                    if (workflow.insights) {
                        console.log("Loaded insights type:", typeof workflow.insights);

                        // Handle both structured insights data and legacy HTML string format
                        if (typeof workflow.insights === 'object') {
                            console.log("Structured insights data:", workflow.insights);

                            // For structured data, set the raw object data
                            setWorkflowInsights(workflow.insights);
                            setShowInsights(true);
                        } else {
                            console.log("Legacy HTML insights string:", workflow.insights);

                            // For legacy string format, just set the HTML directly
                            setWorkflowInsightsHtml(workflow.insights);
                            setWorkflowInsights(workflow.insights);
                            setShowInsights(!!workflow.insights);
                        }
                    }

                    // Load nodes and edges if they exist
                    if (workflow.nodes && workflow.nodes.length > 0) {
                        const loadedNodes = workflow.nodes.map(node => {
                            return {
                                ...node,
                                position: {
                                    x: node.position.x,
                                    y: node.position.y
                                }
                            };
                        });

                        setNodes(loadedNodes);
                    }

                    if (workflow.edges && workflow.edges.length > 0) {
                        const loadedEdges = workflow.edges.map(edge => {
                            // Ensure edges have the right format for React Flow
                            return {
                                ...edge,
                                id: edge.id,
                                source: edge.source,
                                target: edge.target,
                                // Include any other necessary edge properties
                                type: 'custom'
                            };
                        });

                        setEdges(loadedEdges);
                    }

                    // Set loading to false
                    setIsLoading(false);
                } catch (error) {
                    console.error("Error loading workflow:", error);
                    setToast({
                        message: `Error loading workflow: ${error.message}`,
                        type: 'error'
                    });
                    setIsLoading(false);
                }
            }
        };

        loadWorkflow();
    }, [workflowId]);

    // Initial load of agents
    useEffect(() => {
        loadCustomAgents();
    }, []);

    // Podcast generation functions
    const handleGeneratePodcast = async () => {
        if (!podcastText.trim()) {
            setToast({
                message: 'Please enter some text for the podcast',
                type: 'error'
            });
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
                // Remove the old success message
                // const successMsg = 'Podcast generated successfully! You can now play it below.';
                // setSuccessMessage(successMsg);

                // Enhanced toast notification with more details
                setToast({
                    message: `Your podcast has been created! Click play to listen (${Math.ceil(data.duration || 0)}s)`,
                    type: 'podcast'  // Use 'podcast' type for special styling
                });
            } else {
                throw new Error('No audio URL returned from server');
            }

        } catch (error) {
            console.error('Error generating podcast:', error);
            setSuccessMessage(`Error: ${error.message}`);
            setToast({
                message: `Error generating podcast: ${error.message}`,
                type: 'error'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Audio player functions
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

    // Edge class assignment based on source node type
    const getEdgeClassName = useCallback((edge) => {
        const sourceType = edge.data?.sourceType;
        if (sourceType) {
            return `animated source-${sourceType}`;
        }
        return 'animated';
    }, []);

    // Apply classes to existing edges
    useEffect(() => {
        setEdges((eds) =>
            eds.map(edge => {
                // Find source node for this edge
                const sourceNode = nodes.find(n => n.id === edge.source);
                if (sourceNode && sourceNode.type) {
                    // Update edge data with source type if not already set
                    if (!edge.data || !edge.data.sourceType) {
                        return {
                            ...edge,
                            data: {
                                ...(edge.data || {}),
                                sourceType: sourceNode.type
                            }
                        };
                    }
                }
                return edge;
            })
        );
    }, [nodes, setEdges]);

    // Function to attach edge classes to elements in DOM after they're rendered
    useEffect(() => {
        // Apply classes to edge elements based on their source type
        const edgeElements = document.querySelectorAll('.react-flow__edge');
        edgeElements.forEach(el => {
            const edgeId = el.getAttribute('data-testid')?.split('__').pop();
            if (edgeId) {
                const edge = edges.find(e => e.id === edgeId);
                if (edge && edge.data && edge.data.sourceType) {
                    el.classList.add(`source-${edge.data.sourceType}`);
                    el.classList.add('animated');
                }
            }
        });
    }, [edges]);

    // Effect to update nodes with execution state classes
    useEffect(() => {
        if (Object.keys(executionState).length === 0) return;

        setNodes(nds => nds.map(node => {
            if (executionState[node.id]) {
                const status = executionState[node.id].status;
                return {
                    ...node,
                    className: `${node.className || ''} ${status}`.trim()
                };
            }
            return node;
        }));
    }, [executionState, setNodes]);

    // OnInit callback
    const onInit = useCallback((reactFlowInstance) => {
        setRfInstance(reactFlowInstance);

        // Set initial viewport with better zoom
        reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1.2 });

        // Center view on nodes if they exist, with a slight delay to ensure DOM is ready
        if (nodes.length > 0) {
            setTimeout(() => {
                reactFlowInstance.fitView({
                    padding: 0.4,  // Increased padding for better visibility
                    includeHiddenNodes: false,
                    minZoom: 0.8,  // Set minimum zoom to prevent it from being too far out
                    maxZoom: 2     // Set maximum zoom to prevent it from being too close
                });
            }, 200);  // Slightly longer delay to ensure rendering is complete
        }
    }, [nodes]);

    // Handle click outside to close dropdowns
    useEffect(() => {
        function handleClickOutside(event) {
            // Use type assertion to tell TypeScript that current is an HTML element
            if (voiceDropdownRef.current && voiceDropdownRef.current.contains(event.target)) {
                // no changes needed here
            } else {
                setVoiceDropdownOpen(false);
            }

            if (emotionDropdownRef.current && emotionDropdownRef.current.contains(event.target)) {
                // no changes needed here
            } else {
                setEmotionDropdownOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Get emotion icon based on emotion id
    const getEmotionIcon = (emotionId) => {
        switch (emotionId) {
            case 'happy':
                return <MdSentimentVerySatisfied />;
            case 'sad':
                return <MdSentimentDissatisfied />;
            case 'excited':
                return <MdSentimentVeryDissatisfied />;
            case 'calm':
                return <MdSentimentSatisfiedAlt />;
            case 'neutral':
            default:
                return <MdSentimentNeutral />;
        }
    };

    // Add state for the response edit modal
    const [showResponseEditModal, setShowResponseEditModal] = useState(false);
    const [editingResponse, setEditingResponse] = useState({
        agentId: '',
        turn: 0,
        agentName: '',
        response: ''
    });

    // Add a function to handle clicks on agent responses
    const handleResponseClick = (event) => {
        // Disabled response editing functionality
        console.log("Response editing has been disabled");
        return; // Early return to prevent any editing functionality

        // The following code is now disabled:
        /*
        console.log("Clicked in insights container", event.target);

        // Find the closest chat bubble, regardless of whether it has the editable-response class
        const chatBubble = event.target.closest('.chat-bubble');
        console.log("Found chat bubble:", chatBubble);

        if (chatBubble) {
            // Get the data attributes from the chat bubble
            const agentId = chatBubble.getAttribute('data-agent-id');
            const turn = chatBubble.getAttribute('data-turn');
            const agentName = chatBubble.getAttribute('data-agent-name');
            const isEditable = chatBubble.getAttribute('data-editable');

            console.log("Response data:", { agentId, turn, agentName, isEditable });

            // Check if this is an editable response (any agent other than researcher)
            // We'll now use the data-editable attribute explicitly
            if (agentId && turn && isEditable === 'true') {
                // Get the response content (HTML)
                const contentEl = chatBubble.querySelector('.chat-content');
                const responseContent = contentEl ? contentEl.innerHTML : '';

                if (!responseContent) {
                    console.error("Could not find response content in the chat bubble");
                    return;
                }

                // Set the editing response data
                setEditingResponse({
                    agentId,
                    turn: parseInt(turn, 10),
                    agentName,
                    response: responseContent
                });

                // Show the edit modal
                setShowResponseEditModal(true);
            } else {
                console.log("This chat bubble is not editable");
            }
        } else {
            console.log("No chat bubble found at this click point");
        }
        */
    };

    // Add a function to save the edited response
    const saveEditedResponse = async (agentId, turn, newResponse) => {
        try {
            console.log('Saving edited response for agent:', agentId, 'turn:', turn);

            // Check if we have structured data or HTML insights
            if (typeof workflowInsights === 'object' && workflowInsights?.transcript) {
                // Handle structured data - update the transcript directly
                const updatedInsights = { ...workflowInsights };

                // Find and update the specific transcript entry
                if (Array.isArray(updatedInsights.transcript)) {
                    const entryIndex = updatedInsights.transcript.findIndex(
                        entry => entry.agentId === agentId && entry.turn === turn
                    );

                    if (entryIndex !== -1) {
                        // Update the content in the transcript
                        updatedInsights.transcript[entryIndex] = {
                            ...updatedInsights.transcript[entryIndex],
                            content: newResponse
                        };

                        // Update state with the modified insights
                        setWorkflowInsights(updatedInsights);

                        // Save to database
                        await saveWorkflowWithInsights(updatedInsights);

                        // Show success toast
                        setToast({
                            message: 'Response updated successfully',
                            type: 'success'
                        });

                        // Also update chatModalData to reflect changes in the modal
                        if (chatModalData && chatModalData.agentId === agentId && chatModalData.turn === turn) {
                            setChatModalData({
                                ...chatModalData,
                                content: newResponse
                            });
                        }
                    }
                }
            } else if (typeof workflowInsights === 'string') {
                // Handle HTML content - parse and update DOM
                const parser = new DOMParser();
                const doc = parser.parseFromString(workflowInsights, 'text/html');

                // Find the chat bubble with the matching data attributes
                const chatBubble = doc.querySelector(`.chat-bubble[data-agent-id="${agentId}"][data-turn="${turn}"]`);

                if (chatBubble) {
                    // Update the content in the DOM
                    const contentDiv = chatBubble.querySelector('.chat-content');
                    if (contentDiv) {
                        // Format new response with proper line breaks
                        contentDiv.innerHTML = newResponse.replace(/\n\n/g, '<br><br>');

                        // Get the updated HTML
                        const updatedInsights = doc.body.innerHTML;

                        // Update state with the new insights
                        setWorkflowInsights(updatedInsights);

                        // Save to database
                        await saveWorkflowWithInsights(updatedInsights);

                        // Show success toast
                        setToast({
                            message: 'Response updated successfully',
                            type: 'success'
                        });

                        // Also update chatModalData to reflect changes in the modal
                        if (chatModalData && chatModalData.agentId === agentId && chatModalData.turn === turn) {
                            setChatModalData({
                                ...chatModalData,
                                content: newResponse.replace(/\n\n/g, '<br><br>')
                            });
                        }
                    }
                }
            } else {
                console.error('Cannot save edited response: insights data format not recognized');
                setToast({
                    message: 'Failed to update response: Unknown data format',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error updating response:', error);
            setToast({
                message: 'Failed to update response: ' + error.message,
                type: 'error'
            });
        }
    };

    // Function to render insights in the sidebar
    const renderInsights = () => {
        if (!showInsights) return null;

        return (
            <div className="editor-insights">
                {typeof workflowInsights === 'object' ? (
                    // Render React component for structured data
                    renderInsightsFromData(workflowInsights)
                ) : (
                    // Render HTML string for legacy format
                    <div className="insights-content" dangerouslySetInnerHTML={{ __html: workflowInsightsHtml || workflowInsights }} />
                )}
            </div>
        );
    };

    // New function to save workflow with insights directly
    const saveWorkflowWithInsights = async (insightsContent) => {
        if (!workflowName.trim()) {
            setToast({
                message: 'Please enter a workflow name',
                type: 'error'
            });
            return;
        }

        try {
            const token = localStorage.getItem('token');

            // Prepare the insights data - convert Pydantic model object to plain object if needed
            let processedInsights = insightsContent;

            // If insights is an object (structured data), ensure it's a plain object
            if (typeof insightsContent === 'object' && insightsContent !== null) {
                // Convert the structured data to a plain JavaScript object
                // This ensures MongoDB can store it properly
                processedInsights = {
                    topic: insightsContent.topic || "",
                    research: insightsContent.research || "",
                    transcript: insightsContent.transcript
                        ? insightsContent.transcript.map(entry => ({
                            agentId: entry.agentId,
                            agentName: entry.agentName,
                            turn: entry.turn,
                            content: entry.content || entry.response
                        }))
                        : [],
                    keyInsights: insightsContent.keyInsights || [],
                    conclusion: insightsContent.conclusion || ""
                };

                console.log("Serialized structured insights for MongoDB:",
                    JSON.stringify(processedInsights).substring(0, 200) + '...');
            } else {
                console.log("Saving workflow with HTML insights:",
                    insightsContent.substring(0, 100) + "...");
            }

            // Create workflow data with the processed insights
            const workflowData = {
                name: workflowName,
                description: '',
                nodes: nodes,
                edges: edges,
                insights: processedInsights // Use the processed insights data
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
                throw new Error('Failed to save workflow with insights');
            }

            const savedWorkflow = await response.json();
            console.log("Successfully saved workflow with insights:", savedWorkflow.id);

            // Update workflowId if this was a new workflow
            if (workflowId === '-1') {
                navigate(`/workflows/workflow/${savedWorkflow.id}`, { replace: true });
            }

            setToast({
                message: 'Workflow saved successfully',
                type: 'success'
            });
        } catch (error) {
            console.error('Error saving workflow with insights:', error);
            setToast({
                message: `Error saving workflow: ${error.message}`,
                type: 'error'
            });
        }
    };

    // Function to render insights from structured data into HTML for display
    const renderInsightsFromData = (data) => {
        if (!data) return null;

        console.log("Rendering insights from structured data:", data);

        // Extract key parts from the insights data
        const { topic, research, transcript, keyInsights, conclusion } = data;

        // Function to generate podcast from the transcript
        const handleGenerateDebatePodcast = async () => {
            // Set generating state and clear any previous audio
            setIsGenerating(true);
            setAudioUrl('');
            setSuccessMessage('');

            try {
                // Filter out the researcher agent messages and format the transcript for the podcast
                const agentTranscript = transcript.filter(entry => entry.agentId !== 'researcher');

                if (agentTranscript.length === 0) {
                    throw new Error("No agent messages found to generate a podcast");
                }

                // Combine all agent messages into one cohesive script
                // Format it as a debate with clear speaker identification
                let podcastScript = `Let's discuss ${topic}.\n\n`;

                agentTranscript.forEach(entry => {
                    podcastScript += `${entry.agentName}: ${entry.content || entry.response}\n\n`;
                });

                // Add a conclusion
                podcastScript += `In conclusion: ${conclusion}`;

                console.log('Generating podcast from script:', podcastScript.substring(0, 100) + '...');

                // Use the text-podcast endpoint to generate the audio
                const response = await fetch('http://localhost:8000/generate-text-podcast', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        text: podcastScript,
                        voice_id: 'nova', // Use a default voice or add a selection option
                        emotion: 'neutral',
                        speed: 1.0,
                        title: topic // Add the topic as the title
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Failed to generate podcast');
                }

                const data = await response.json();
                console.log('Debate podcast generated:', data);

                if (data.audio_url) {
                    setAudioUrl(data.audio_url);

                    // Show success toast
                    setToast({
                        message: `Your debate podcast has been created! Click play to listen (${Math.ceil(data.duration || 0)}s)`,
                        type: 'podcast'  // Use 'podcast' type for special styling
                    });

                    // Scroll to the audio player section
                    const audioPlayer = document.querySelector('.audio-player');
                    if (audioPlayer) {
                        audioPlayer.scrollIntoView({ behavior: 'smooth' });
                    }
                } else {
                    throw new Error('No audio URL returned from server');
                }
            } catch (error) {
                console.error('Error generating podcast:', error);
                setToast({
                    message: `Error generating podcast: ${error.message}`,
                    type: 'error'
                });
            } finally {
                setIsGenerating(false);
            }
        };

        return (
            <div className="insights-container">
                <h1>{topic}</h1>

                {/* Research Section - Simplified */}
                <div className="research-card">
                    <div className="research-header">
                        <div className="research-icon">
                            <FaSearch />
                        </div>
                        <div className="research-title">Research Summary</div>
                    </div>
                    <div className="research-content" dangerouslySetInnerHTML={{ __html: research }} />
                </div>

                {/* Transcript Section - Now with click handler */}
                <h2>Debate Transcript</h2>
                <div className="debate-transcript" onClick={handleChatBubbleClick}>
                    {Array.isArray(transcript) && transcript.length > 0 ? (
                        transcript.map((entry, index) => (
                            <div className="chat-message" key={index}>
                                <div className="chat-avatar">
                                    {entry.agentName.charAt(0).toUpperCase()}
                                </div>
                                <div
                                    className={`chat-bubble ${entry.agentId !== 'researcher' ? 'clickable-bubble' : ''}`}
                                    data-agent-id={entry.agentId}
                                    data-turn={entry.turn}
                                    data-agent-name={entry.agentName}
                                >
                                    <div className="chat-header">
                                        <span className="chat-name">{entry.agentName}</span>
                                        <span className="chat-turn">Turn {entry.turn}</span>
                                    </div>
                                    <div className="chat-content" dangerouslySetInnerHTML={{ __html: entry.content || entry.response }} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No transcript data available.</p>
                    )}
                </div>

                {/* Key Insights Section - Simplified */}
                <h2>Key Insights</h2>
                <div className="insights-section">
                    {Array.isArray(keyInsights) && keyInsights.length > 0 ? (
                        <ol>
                            {keyInsights.map((insight, index) => (
                                <li key={index}>{insight}</li>
                            ))}
                        </ol>
                    ) : (
                        <p>No key insights available.</p>
                    )}
                </div>

                {/* Conclusion Section - Simplified */}
                <h2>Conclusion</h2>
                <div className="conclusion-section">
                    <p>{conclusion}</p>
                </div>

                {/* Podcast Generation Button */}
                <div className="podcast-generation-button-container">
                    <button
                        className="generate-button podcast-from-debate-btn"
                        onClick={handleGenerateDebatePodcast}
                        disabled={isGenerating || !Array.isArray(transcript) || transcript.length === 0}
                    >
                        {isGenerating ? (
                            <>
                                <div className="button-spinner"></div>
                                <span>Generating Podcast...</span>
                            </>
                        ) : (
                            <>
                                <FaPodcast />
                                <span>Generate Podcast</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    };

    // After the component mounts, find all native select elements and transform them to custom dropdowns
    useEffect(() => {
        // Initialize custom select dropdowns
        initCustomSelects();
    }, []);

    // Function to initialize custom select dropdowns
    const initCustomSelects = () => {
        // Use querySelectorAll with casting to HTMLSelectElement
        const selectElements = document.querySelectorAll('.voice-select-group select');

        selectElements.forEach(select => {
            // Cast to HTMLSelectElement for proper type checking
            const selectElement = select;

            // Check if parent exists and if it's already been converted
            if (!selectElement.parentElement || selectElement.parentElement.classList.contains('custom-select-wrapper')) return;

            // Create wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-select-wrapper';
            selectElement.parentElement.insertBefore(wrapper, selectElement);
            wrapper.appendChild(selectElement);

            // Create styled dropdown element
            const styled = document.createElement('div');
            styled.className = 'select-styled';
            styled.textContent = selectElement.options[selectElement.selectedIndex]?.textContent || 'Select option';
            wrapper.appendChild(styled);

            // Create list of options
            const list = document.createElement('ul');
            list.className = 'select-options';
            wrapper.appendChild(list);

            // Add all options to the list
            Array.from(selectElement.options).forEach((option, index) => {
                const htmlOption = option;
                const li = document.createElement('li');
                li.textContent = htmlOption.textContent || '';
                li.setAttribute('rel', htmlOption.value);
                if (selectElement.selectedIndex === index) li.classList.add('selected');

                li.addEventListener('click', () => {
                    // When clicked, update styled element and actual select value
                    selectElement.selectedIndex = index;
                    styled.textContent = htmlOption.textContent || '';

                    // Trigger change event on the original select
                    const event = new Event('change', { bubbles: true });
                    selectElement.dispatchEvent(event);

                    // Update selected class
                    const items = list.querySelectorAll('li');
                    items.forEach(item => item.classList.remove('selected'));
                    li.classList.add('selected');

                    // Hide the options
                    list.style.display = 'none';
                    styled.classList.remove('active');
                });

                list.appendChild(li);
            });

            // Toggle dropdown when styled element is clicked
            styled.addEventListener('click', (e) => {
                e.stopPropagation();

                // Close all other open dropdowns
                document.querySelectorAll('.select-styled.active').forEach(el => {
                    if (el !== styled && el.nextElementSibling) {
                        el.classList.remove('active');
                        const nextElement = el.nextElementSibling;
                        if (nextElement) {
                            nextElement.style.display = 'none';
                        }
                    }
                });

                styled.classList.toggle('active');
                list.style.display = styled.classList.contains('active') ? 'block' : 'none';
            });

            // Close when clicking outside
            document.addEventListener('click', () => {
                styled.classList.remove('active');
                list.style.display = 'none';
            });
        });
    };

    useEffect(() => {
        // Create custom emotion dropdown on component mount
        createCustomEmotionDropdown();
    }, []);

    // Function to create a custom emotion dropdown
    const createCustomEmotionDropdown = () => {
        const emotions = [
            { id: 'neutral', name: 'Neutral', icon: '😐' },
            { id: 'happy', name: 'Happy', icon: '😊' },
            { id: 'excited', name: 'Excited', icon: '🤩' },
            { id: 'sad', name: 'Sad', icon: '😢' },
            { id: 'angry', name: 'Angry', icon: '😠' },
            { id: 'calm', name: 'Calm', icon: '😌' },
            { id: 'surprised', name: 'Surprised', icon: '😲' }
        ];

        // Find the emotion select container
        const emotionContainer = document.querySelector('.emotion-select-container');
        if (!emotionContainer) return;

        // Clear existing content
        emotionContainer.innerHTML = '';

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        emotionContainer.appendChild(wrapper);

        // Create styled dropdown element
        const styled = document.createElement('div');
        styled.className = 'select-styled';
        styled.innerHTML = `<span>${emotions[0].icon} ${emotions[0].name}</span>`;
        styled.setAttribute('data-emotion-id', emotions[0].id);
        wrapper.appendChild(styled);

        // Create list of options
        const list = document.createElement('ul');
        list.className = 'select-options';
        wrapper.appendChild(list);

        // Add all options to the list
        emotions.forEach(emotion => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${emotion.icon} ${emotion.name}</span>`;
            li.setAttribute('data-emotion-id', emotion.id);

            if (emotion.id === 'neutral') {
                li.classList.add('selected');
            }

            li.addEventListener('click', () => {
                // Update selected emotion
                setSelectedEmotion(emotion.id);

                // Update styled element
                styled.innerHTML = `<span>${emotion.icon} ${emotion.name}</span>`;
                styled.setAttribute('data-emotion-id', emotion.id);

                // Update selected class
                const items = list.querySelectorAll('li');
                items.forEach(item => item.classList.remove('selected'));
                li.classList.add('selected');

                // Hide the options
                list.style.display = 'none';
                styled.classList.remove('active');
            });

            list.appendChild(li);
        });

        // Toggle dropdown when styled element is clicked
        styled.addEventListener('click', (e) => {
            e.stopPropagation();

            // Close all other open dropdowns
            document.querySelectorAll('.select-styled.active').forEach(el => {
                if (el !== styled && el.nextElementSibling) {
                    el.classList.remove('active');
                    const nextElement = el.nextElementSibling;
                    if (nextElement) {
                        nextElement.style.display = 'none';
                    }
                }
            });

            styled.classList.toggle('active');
            list.style.display = styled.classList.contains('active') ? 'block' : 'none';
        });

        // Close when clicking outside
        document.addEventListener('click', () => {
            styled.classList.remove('active');
            list.style.display = 'none';
        });
    };

    // Add new function to handle clicking on chat bubbles (replace or update the current handleResponseClick)
    const handleChatBubbleClick = (event) => {
        // Find the closest chat bubble
        const chatBubble = event.target.closest('.chat-bubble');

        if (chatBubble) {
            // Get the data attributes from the chat bubble
            const agentId = chatBubble.getAttribute('data-agent-id');
            const turn = chatBubble.getAttribute('data-turn');
            const agentName = chatBubble.getAttribute('data-agent-name');

            // Skip opening modal for researcher (optional)
            if (agentId === 'researcher') {
                return;
            }

            // Get the content
            const contentEl = chatBubble.querySelector('.chat-content');
            const content = contentEl ? contentEl.innerHTML : '';

            if (!content) {
                console.error("Could not find content in the chat bubble");
                return;
            }

            // Set the modal data and open it
            setChatModalData({
                agentId,
                turn: parseInt(turn, 10),
                agentName,
                content
            });
        }
    };

    // Add function to close the chat modal
    const handleCloseChatModal = () => {
        setChatModalData(null);
    };

    // Add state for chat bubble modal
    const [chatModalData, setChatModalData] = useState(null);

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
                                    <div onClick={handleEditName} className="workflow-name-display">
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
                        <button className={`flow-button execute-workflow ${isExecuting ? 'executing' : ''}`} onClick={handleExecuteWorkflow} disabled={isExecuting}>
                            {isExecuting ? (
                                <>
                                    <div className="button-spinner"></div>
                                    <span>Running</span>
                                </>
                            ) : (
                                <>
                                    <FaPlay />
                                    <span>Run</span>
                                </>
                            )}
                        </button>
                        <button className="flow-button add-node" onClick={handleAddNode}>
                            <FaPlus />
                            <span>Add</span>
                        </button>
                    </div>
                    <div className="flow-wrapper">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            nodeTypes={customNodeTypes}
                            defaultEdgeOptions={defaultEdgeOptions}
                            edgesFocusable={true}
                            edgesUpdatable={true}
                            elementsSelectable={true}
                            onInit={onInit}
                            defaultViewport={{ x: 0, y: 0, zoom: 1.2 }}
                            attributionPosition="bottom-left"
                            className="workflow-reactflow"
                            deleteKeyCode={['Backspace', 'Delete']}
                            edgeTypes={edgeTypes}
                            minZoom={0.4}
                            maxZoom={2.5}
                            proOptions={{ hideAttribution: true }}
                            onNodeClick={onNodeClick}
                            snapToGrid={true}
                            snapGrid={[15, 15]}
                            nodesDraggable={true}
                            zoomOnScroll={true}
                            zoomOnPinch={true}
                            panOnScroll={false}
                            panOnDrag={true}
                            nodeExtent={[
                                [-1000, -1000],
                                [1000, 1000]
                            ]}
                            fitView
                            fitViewOptions={{
                                padding: 0.4,
                                minZoom: 0.8,
                                maxZoom: 2,
                            }}
                        >
                            <Controls />
                            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                            <MiniMap
                                nodeStrokeWidth={3}
                                zoomable
                                pannable
                            />
                        </ReactFlow>
                    </div>
                </div>
                <div className={`editor-insights ${isInsightsEnabled ? "insights-enabled" : "t-to-p-enabled"}`}>
                    <div
                        className="toggle-insights"
                        onClick={() => setIsInsightsEnabled(!isInsightsEnabled)}
                        style={{ cursor: 'pointer' }}
                        title={isInsightsEnabled ? "Click to disable insights" : "Click to enable insights"}
                    >
                        <h2>{isInsightsEnabled ? "Workflow Insights" : "Script to Podcast"}</h2>
                        {isInsightsEnabled ? <BsToggle2On style={{ marginLeft: '10px' }} /> : <BsToggle2Off style={{ marginLeft: '10px' }} />}
                    </div>

                    <div className="insights-contents">
                        {isInsightsEnabled ? (
                            renderInsights()
                        ) : (
                            // Script to Podcast UI
                            <div className="podcast-generation-form">
                                <textarea
                                    className="podcast-text-input"
                                    placeholder="Enter your podcast script here..."
                                    value={podcastText}
                                    onChange={(e) => setPodcastText(e.target.value)}
                                    rows={8}
                                />

                                <div className="voice-controls">
                                    <div className="voice-select-group">
                                        <label>Voice:</label>
                                        <select
                                            value={selectedVoice}
                                            onChange={(e) => setSelectedVoice(e.target.value)}
                                        >
                                            <option value="alloy">Alloy (Neutral)</option>
                                            <option value="echo">Echo (Male)</option>
                                            <option value="fable">Fable (Female)</option>
                                            <option value="onyx">Onyx (Deep Male)</option>
                                            <option value="nova">Nova (Female)</option>
                                            <option value="shimmer">Shimmer (Female)</option>
                                        </select>
                                    </div>

                                    <div className="voice-select-group">
                                        <label>Emotion:</label>
                                        <select
                                            value={selectedEmotion}
                                            onChange={(e) => setSelectedEmotion(e.target.value)}
                                        >
                                            <option value="neutral">Neutral</option>
                                            <option value="happy">Happy</option>
                                            <option value="sad">Sad</option>
                                            <option value="excited">Excited</option>
                                            <option value="calm">Calm</option>
                                        </select>
                                    </div>

                                    <div className="voice-select-group">
                                        <label>Speed: {voiceSpeed}x</label>
                                        <div className="slider-container">
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="2"
                                                step="0.1"
                                                value={voiceSpeed}
                                                onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                                                className="speed-slider"
                                            />
                                            <span className="slider-value">{voiceSpeed}x</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className="generate-button"
                                    onClick={handleGeneratePodcast}
                                    disabled={isGenerating || !podcastText.trim()}
                                >
                                    {isGenerating ? (
                                        <>Generating... <div className="button-spinner"></div></>
                                    ) : (
                                        <>Generate Podcast</>
                                    )}
                                </button>

                                {successMessage && successMessage.includes('Error') && (
                                    <div className="generation-message error">
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
                                        className={`agent-item ${agent.isDefault ? 'default' : 'custom'} ${agent.personality ? 'personalized' : ''}`}
                                        onClick={() => handleAgentClick(agent)}
                                        style={{ cursor: agent.isDefault ? 'default' : 'pointer' }}
                                    >
                                        <span className="agent-name">{agent.name}</span>
                                        <span className="agent-status">
                                            {agent.personality ?
                                                <span className="personalized-badge">Personalized</span> :
                                                agent.status}
                                        </span>
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
                    <div className={`sidebar-card podcast-audio-view ${isInsightsEnabled ? "insights-enabled" : "t-to-p-enabled"}`}>
                        <h3><FaVolumeUp /> Podcast Preview</h3>
                        <div className="audio-player">
                            <audio
                                ref={audioRef}
                                src={audioUrl || undefined} // Use undefined, not null or empty string
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
            <NodeSelectionPanel
                isOpen={isNodePanelOpen}
                onClose={() => setIsNodePanelOpen(false)}
                agents={agents}
                onSelectNode={handleNodeSelect}
            />
            <InputNodeModal
                isOpen={isInputModalOpen}
                onClose={() => setIsInputModalOpen(false)}
                onSubmit={handleInputSubmit}
                nodeId={selectedInputNode}
            />
            <AgentModal
                isOpen={isAgentModalOpen}
                onClose={handleAgentModalClose}
                editAgent={selectedAgent}
            />
            <ResponseEditModal
                isOpen={showResponseEditModal}
                onClose={() => setShowResponseEditModal(false)}
                agentName={editingResponse?.agentName}
                agentId={editingResponse?.agentId}
                turn={editingResponse?.turn}
                response={editingResponse?.response}
                onSave={saveEditedResponse}
            />
            <ToastContainer toast={toast} setToast={setToast} />
            {/* Add the ChatDetailModal */}
            {chatModalData && (
                <ChatDetailModal
                    isOpen={!!chatModalData}
                    onClose={handleCloseChatModal}
                    agentName={chatModalData.agentName}
                    agentId={chatModalData.agentId}
                    turn={chatModalData.turn}
                    content={chatModalData.content}
                    onSave={saveEditedResponse}
                />
            )}
        </div>
    );
};

export default WorkflowEditor;