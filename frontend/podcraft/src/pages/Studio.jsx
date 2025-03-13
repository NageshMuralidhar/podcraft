import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import './Studio.css';

const SAMPLE_WORKFLOWS = [
    { id: 1, name: 'Basic Podcast Generation', description: 'Simple workflow for generating podcasts from prompts' },
    { id: 2, name: 'Interview Style', description: 'Generate interview-style podcasts with multiple voices' },
    { id: 3, name: 'News Digest', description: 'Create news digest podcasts from current events' },
];

const Studio = () => {
    const navigate = useNavigate();

    const handleWorkflowClick = (workflowId) => {
        navigate(`/studio/workflow/${workflowId}`);
    };

    const handleCreateWorkflow = () => {
        // For now, we'll create a new workflow with a random ID
        const newId = Math.floor(Math.random() * 10000);
        navigate(`/studio/workflow/${newId}`);
    };

    return (
        <div className="studio-container">
            <div className="studio-header">
                <h1>Your Podcast Workflows</h1>
                <button className="create-workflow-btn" onClick={handleCreateWorkflow}>
                    <FaPlus /> New Workflow
                </button>
            </div>
            <div className="workflows-grid">
                {SAMPLE_WORKFLOWS.map((workflow) => (
                    <div
                        key={workflow.id}
                        className="workflow-card"
                        onClick={() => handleWorkflowClick(workflow.id)}
                    >
                        <h3>{workflow.name}</h3>
                        <p>{workflow.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Studio; 