import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
} from 'reactflow';
import { FaArrowLeft } from 'react-icons/fa';
import 'reactflow/dist/style.css';
import './WorkflowEditor.css';
import { TiFlowMerge } from "react-icons/ti";


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

const WorkflowEditor = () => {
    const { workflowId } = useParams();
    const navigate = useNavigate();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    return (
        <div className="editor-container">
            <div className="editor-header">
                <h1> Build out a workflow for your podcast generation <TiFlowMerge /></h1>
                <button className="back-button" onClick={() => navigate('/studio')}>
                    <FaArrowLeft /> Back to Workflows
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
    );
};

export default WorkflowEditor; 