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
    applyNodeChanges
} from 'reactflow';
import { FaArrowLeft, FaSave, FaTrash, FaPlay, FaTimes, FaPencilAlt, FaCheck, FaPause, FaVolumeUp, FaUserCog, FaPlus } from 'react-icons/fa';
import { TiFlowMerge } from "react-icons/ti";
import { RiRobot2Fill } from "react-icons/ri";
import { BsToggle2Off, BsToggle2On } from "react-icons/bs";
import AgentModal from './AgentModal';
import WorkflowToast from './WorkflowToast';
import NodeSelectionPanel from './NodeSelectionPanel';
import InputNodeModal from './InputNodeModal';
import customNodeTypes from './CustomNodes'; // Import our custom node types
import CustomEdge, { customEdgeTypes } from './CustomEdge'; // Import our custom edge component
import 'reactflow/dist/style.css';
import './WorkflowEditor.css';

const initialNodes = [];
const initialEdges = [];

const DEFAULT_AGENTS = [
    { id: 'researcher', name: 'Research Agent', status: 'Default', isDefault: true },
    { id: 'believer', name: 'Believer Agent', status: 'Default', isDefault: true },
    { id: 'skeptic', name: 'Skeptic Agent', status: 'Default', isDefault: true }
];

// Define toast type
const initialToastState = {
    message: '',
    type: 'success'
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
    const [toast, setToast] = useState(initialToastState);
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
    const audioRef = useRef();

    // Add missing state variables:
    const [isNodePanelOpen, setIsNodePanelOpen] = useState(false);
    const [selectedInputNode, setSelectedInputNode] = useState(null);
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);

    // New state variables for workflow execution
    const [executionState, setExecutionState] = useState({});
    const [isExecuting, setIsExecuting] = useState(false);
    const [workflowInsights, setWorkflowInsights] = useState("");

    // State for ReactFlow instance
    const [rfInstance, setRfInstance] = useState(null);

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

    const onConnect = useCallback(
        (params) => {
            // Check if connection is valid
            if (isValidConnection(params, nodes)) {
                // Get the source node to determine edge color
                const sourceNode = nodes.find(n => n.id === params.source);

                // Set color based on source node type
                let edgeColor = '#6366f1'; // Default color (purple)
                if (sourceNode) {
                    switch (sourceNode.type) {
                        case 'input':
                            edgeColor = '#6366F1'; // Input -> purple
                            break;
                        case 'researcher':
                            edgeColor = '#4C1D95'; // Researcher -> deep purple
                            break;
                        case 'agent':
                            edgeColor = '#10B981'; // Agent -> green
                            break;
                        case 'insights':
                            edgeColor = '#F59E0B'; // Insights -> amber
                            break;
                        default:
                            edgeColor = '#6366f1'; // Default
                    }
                }

                // Create an animated edge with styling
                const edge = {
                    ...params,
                    type: 'custom', // Use our custom edge type
                    animated: true,
                    style: { stroke: edgeColor, strokeWidth: 2 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: edgeColor,
                        width: 20,
                        height: 20,
                    },
                    data: { sourceType: sourceNode ? sourceNode.type : 'unknown' }
                };

                setEdges((eds) => addEdge(edge, eds));
            } else {
                // Show error message about invalid connection
                setToast({
                    message: 'Invalid connection: Node types cannot be connected in this way',
                    type: 'error'
                });
            }
        },
        [nodes, setEdges, setToast]
    );

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

        // Check for missing connections
        const unconnectedNodes = nodes.filter(node => {
            if (node.type === 'input') return false; // Input nodes don't need incoming connections
            const incomingEdges = edges.filter(edge => edge.target === node.id);
            return incomingEdges.length === 0;
        });

        if (unconnectedNodes.length > 0) {
            setToast({
                message: 'Some nodes are not connected - please complete the workflow',
                type: 'error'
            });
            return;
        }

        // Set up execution state
        setIsExecuting(true);
        setWorkflowInsights(""); // Clear previous insights

        // Initialize execution state for all nodes
        const initialState = {};
        nodes.forEach(node => {
            initialState[node.id] = {
                status: 'pending', // pending, in-progress, completed, error
                result: null,
                error: null
            };
        });
        setExecutionState(initialState);

        try {
            // Update UI to show we're starting
            setToast({
                message: 'Starting workflow execution...',
                type: 'info'
            });

            // Find the topological order of nodes for execution
            const nodeOrder = getTopologicalOrder(nodes, edges);

            // Execute nodes in topological order
            for (const nodeId of nodeOrder) {
                const node = nodes.find(n => n.id === nodeId);

                if (!node) {
                    throw new Error(`Node with ID ${nodeId} not found`);
                }

                // Update node status to in-progress
                setExecutionState(prev => {
                    const newState = Object.assign({}, prev);
                    if (prev[nodeId]) {
                        newState[nodeId] = Object.assign({}, prev[nodeId], { status: 'in-progress' });
                    } else {
                        newState[nodeId] = { status: 'in-progress', result: null, error: null };
                    }
                    return newState;
                });

                // Get input for this node from previous nodes
                const nodeInputs = await getNodeInputs(nodeId, edges, executionState);

                // Execute this node
                const result = await executeNode(node, nodeInputs);

                // Update execution state with result
                setExecutionState(prev => {
                    const newState = Object.assign({}, prev);
                    newState[nodeId] = { status: 'completed', result, error: null };
                    return newState;
                });

                // If this is an insights node, update the insights panel
                if (node.type === 'insights') {
                    setWorkflowInsights(result);
                }

                // Small delay between nodes for visual effect
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            setToast({
                message: 'Workflow execution completed successfully',
                type: 'success'
            });
        } catch (error) {
            console.error('Error executing workflow:', error);
            setToast({
                message: `Workflow execution failed: ${error.message}`,
                type: 'error'
            });
        } finally {
            setIsExecuting(false);
        }
    };

    // Gets the topological order of nodes for execution
    const getTopologicalOrder = (nodes, edges) => {
        // Create a graph representation
        const graph = {};
        const inDegree = {};

        // Initialize
        nodes.forEach(node => {
            graph[node.id] = [];
            inDegree[node.id] = 0;
        });

        // Build the graph
        edges.forEach(edge => {
            graph[edge.source].push(edge.target);
            inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
        });

        // Find nodes with no incoming edges (sources)
        const queue = nodes
            .filter(node => inDegree[node.id] === 0)
            .map(node => node.id);

        const result = [];

        // Process the queue
        while (queue.length > 0) {
            const nodeId = queue.shift();
            result.push(nodeId);

            // For each neighbor, decrease in-degree and check if it becomes a source
            graph[nodeId].forEach(neighbor => {
                inDegree[neighbor]--;
                if (inDegree[neighbor] === 0) {
                    queue.push(neighbor);
                }
            });
        }

        // Check if we visited all nodes
        if (result.length !== nodes.length) {
            throw new Error('Workflow contains cycles, cannot determine execution order');
        }

        return result;
    };

    // Get inputs for a node from its incoming edges
    const getNodeInputs = async (nodeId, edges, executionState) => {
        // Find all edges that point to this node
        const incomingEdges = edges.filter(edge => edge.target === nodeId);

        // For each incoming edge, get the output of the source node
        const inputs = {};
        for (const edge of incomingEdges) {
            const sourceId = edge.source;
            const sourceState = executionState[sourceId];

            if (!sourceState || sourceState.status !== 'completed') {
                throw new Error(`Source node ${sourceId} has not completed execution`);
            }

            inputs[sourceId] = sourceState.result;
        }

        return inputs;
    };

    // Execute a single node
    const executeNode = async (node, inputs) => {
        // Based on node type, execute the appropriate logic
        switch (node.type) {
            case 'input':
                // For input nodes, just return the prompt
                return node.data.prompt || "No input provided";

            case 'researcher':
                // Call the research API
                return await executeResearcherNode(node.data.prompt || inputs[Object.keys(inputs)[0]]);

            case 'agent':
                // Execute an agent based on research results
                return await executeAgentNode(node, inputs);

            case 'insights':
                // Process agent outputs to generate insights
                return await generateInsights(inputs);

            case 'notify':
                // Notify functionality (dummy for now)
                console.log("Notification would be sent:", inputs);
                return "Notification sent";

            case 'output':
                // Publishing functionality (dummy for now)
                console.log("Content would be published:", inputs);
                return "Content published";

            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    };

    // Execute the researcher node
    const executeResearcherNode = async (topic) => {
        try {
            const token = localStorage.getItem('token');

            // For now, we'll simulate the research by using the same endpoint used for podcast generation
            // In a real implementation, this would be a dedicated research endpoint
            setToast({
                message: 'Researching topic...',
                type: 'info'
            });

            const researchData = {
                topic: topic,
                max_tokens: 1000,
                research_only: true // Hypothetical flag to only do research
            };

            // This is a simplification - in a real implementation, we'd have a dedicated endpoint
            const response = await fetch('http://localhost:8000/generate-podcast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(researchData)
            });

            if (!response.ok) {
                throw new Error(`Research failed with status: ${response.status}`);
            }

            const result = await response.json();

            // For demo purposes, simulate a research result if the API doesn't provide one
            const researchText = result.research ||
                `## Research on: ${topic}\n\nThis is simulated research content for demonstration purposes. In a real implementation, this would contain actual research data retrieved from various sources about "${topic}".`;

            return researchText;
        } catch (error) {
            console.error("Error in researcher node:", error);

            // For demo purposes, return a fallback response
            return `## Research on: ${topic}\n\nThis is simulated research content for demonstration purposes. In a real implementation, this would contain actual research data retrieved from various sources.`;
        }
    };

    // Execute an agent node
    const executeAgentNode = async (node, inputs) => {
        try {
            const token = localStorage.getItem('token');
            const agentId = node.data.agentId;
            const agentName = node.data.label || "Agent";

            // Get the first input (research result)
            const research = Object.values(inputs)[0];

            setToast({
                message: `Agent "${agentName}" is processing...`,
                type: 'info'
            });

            // In a real implementation, we'd use a dedicated agent endpoint
            // For now, we'll simulate the agent response

            // Wait a bit to simulate processing
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Generate a simulated response based on agent type
            let agentResponse = "";
            if (agentId === 'believer') {
                agentResponse = `## Believer Agent's Perspective\n\nAs a believer in this topic, I think there are several important points to consider:\n\n1. The research shows promising evidence for this concept\n2. There are multiple credible sources supporting this view\n3. The historical patterns suggest this trend will continue\n\nI believe the data clearly demonstrates the validity of this approach.`;
            } else if (agentId === 'skeptic') {
                agentResponse = `## Skeptic Agent's Response\n\nI remain unconvinced by several aspects of this research:\n\n1. There are methodological flaws in some of the cited studies\n2. Alternative explanations haven't been fully explored\n3. The evidence isn't as robust as it initially appears\n\nWe should maintain healthy skepticism until more conclusive data is available.`;
            } else if (agentId === 'researcher') {
                agentResponse = `## Research Agent's Analysis\n\nBased on the collected information, I've identified these key findings:\n\n1. The topic has been studied across multiple disciplines\n2. There are both supporting and contradicting viewpoints\n3. Recent developments suggest new avenues for investigation\n\nFurther research is recommended in the following areas: [list of suggested research directions]`;
            } else {
                agentResponse = `## ${agentName}'s Analysis\n\nI've processed the research and have the following insights to share:\n\n1. This topic presents interesting challenges and opportunities\n2. Several patterns emerge from the available data\n3. We should consider multiple perspectives when evaluating this information\n\nMy conclusion is that this subject deserves more nuanced discussion.`;
            }

            return agentResponse;
        } catch (error) {
            console.error("Error in agent node:", error);

            // For demo purposes, return a fallback response
            return `## Agent Response\n\nThis is a simulated agent response for demonstration purposes. In a real implementation, this would contain the agent's analysis of the research.`;
        }
    };

    // Generate insights from agent outputs
    const generateInsights = async (inputs) => {
        try {
            // Get agent outputs as an array
            const agentOutputs = Object.values(inputs);

            setToast({
                message: 'Generating insights...',
                type: 'info'
            });

            // Wait a bit to simulate processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Create a nicely formatted insights summary
            let insightsContent = `# Workflow Insights Summary\n\n`;

            // Add a section for each agent output
            agentOutputs.forEach((output, index) => {
                // Extract the first heading if it exists
                const headingMatch = String(output).match(/##\s+(.*?)(\n|$)/);
                const heading = headingMatch ? headingMatch[1] : `Agent ${index + 1} Insights`;

                insightsContent += `## ${heading}\n\n`;

                // Add the output content, removing the original heading
                const contentWithoutHeading = String(output).replace(/##\s+(.*?)(\n|$)/, '').trim();
                insightsContent += `${contentWithoutHeading}\n\n`;
            });

            // Add a conclusion section
            insightsContent += `## Conclusion\n\nThe workflow has processed inputs through research and agent analysis, producing the insights above. These represent different perspectives and analyses of the topic.`;

            return insightsContent;
        } catch (error) {
            console.error("Error generating insights:", error);

            // For demo purposes, return a fallback response
            return `# Workflow Insights Summary\n\nThis is a simulated insights summary for demonstration purposes. In a real implementation, this would contain a comprehensive analysis of all agent outputs.`;
        }
    };

    const handleAddNode = () => {
        setIsNodePanelOpen(true);
    };

    const handleNodeSelect = ({ type, agentId }) => {
        const nodeCount = nodes.length;
        const newNodeId = `${nodeCount + 1}`;

        // Calculate grid-like position for better layout
        // Start with a decent offset and use a grid pattern for placement
        const columnWidth = 250;
        const rowHeight = 150;
        const columnsPerRow = 3;

        const column = nodeCount % columnsPerRow;
        const row = Math.floor(nodeCount / columnsPerRow);

        const position = {
            x: 50 + (column * columnWidth),
            y: 50 + (row * rowHeight)
        };

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

    const handleInputSubmit = (nodeId, prompt) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            prompt: prompt,
                            label: `Input: ${prompt.substring(0, 20)}${prompt.length > 20 ? '...' : ''}`
                        }
                    };
                }
                return node;
            })
        );
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

                if (workflow.edges) {
                    // Apply animation and contextual colors to existing edges
                    const nodesMap = workflow.nodes ? workflow.nodes.reduce((acc, node) => {
                        acc[node.id] = node;
                        return acc;
                    }, {}) : {};

                    const animatedEdges = workflow.edges.map(edge => {
                        // Determine source node to get its type
                        const sourceNode = nodesMap[edge.source];

                        // Set color based on source node type
                        let edgeColor = '#6366f1'; // Default color (purple)
                        if (sourceNode) {
                            switch (sourceNode.type) {
                                case 'input':
                                    edgeColor = '#6366F1'; // Input -> purple
                                    break;
                                case 'researcher':
                                    edgeColor = '#4C1D95'; // Researcher -> deep purple
                                    break;
                                case 'agent':
                                    edgeColor = '#10B981'; // Agent -> green
                                    break;
                                case 'insights':
                                    edgeColor = '#F59E0B'; // Insights -> amber
                                    break;
                                default:
                                    edgeColor = '#6366f1'; // Default
                            }
                        }

                        return {
                            ...edge,
                            type: 'custom', // Use our custom edge type
                            animated: true,
                            style: { stroke: edgeColor, strokeWidth: 2 },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: edgeColor,
                                width: 20,
                                height: 20,
                            },
                            data: { ...edge.data, sourceType: sourceNode ? sourceNode.type : 'unknown' }
                        };
                    });

                    setEdges(animatedEdges);
                }
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

    // Podcast generation functions
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

        // Set initial viewport with proper zoom
        reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 0.8 });

        // Center view on nodes if they exist
        if (nodes.length > 0) {
            setTimeout(() => {
                reactFlowInstance.fitView({ padding: 0.2, includeHiddenNodes: false });
            }, 100);
        }
    }, [nodes]);

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
                            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                            attributionPosition="bottom-left"
                            className="workflow-reactflow"
                            deleteKeyCode={['Backspace', 'Delete']}
                            edgeTypes={edgeTypes}
                            maxZoom={2}
                            minZoom={0.2}
                            proOptions={{ hideAttribution: true }}
                            onNodeClick={onNodeClick}
                        >
                            <Controls />
                            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
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
                        {isExecuting ? (
                            <div className="loading-insights">
                                <p>Executing workflow... Please wait.</p>
                                <div className="execution-loader"></div>
                            </div>
                        ) : workflowInsights ? (
                            <div className="insights-result">
                                <pre>{workflowInsights}</pre>
                            </div>
                        ) : isInsightsEnabled ? (
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
            {toast.message && (
                <div className="workflow-toast-container">
                    <WorkflowToast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(initialToastState)}
                    />
                </div>
            )}
        </div>
    );
};

export default WorkflowEditor;