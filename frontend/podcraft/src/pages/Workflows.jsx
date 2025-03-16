import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import './Workflows.css';

const Workflows = () => {
    const navigate = useNavigate();
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const fetchWorkflows = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/api/workflows', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch workflows');
            }

            const data = await response.json();
            setWorkflows(data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching workflows:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const handleWorkflowClick = (workflowId) => {
        navigate(`/workflows/workflow/${workflowId}`);
    };

    const handleCreateWorkflow = () => {
        // Use -1 to indicate a new workflow
        navigate(`/workflows/workflow/-1`);
    };

    if (loading) {
        return (
            <div className="workflows-container">
                <div className="loading-indicator">Loading your workflows...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="workflows-container">
                <div className="error-message">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="workflows-container">
            <div className="workflows-header">
                <h1>Your Podcast Workflows</h1>
                <button className="create-workflow-btn" onClick={handleCreateWorkflow}>
                    <FaPlus /> New Workflow
                </button>
            </div>
            <div className="workflows-grid">
                {workflows.length === 0 ? (
                    <div className="no-workflows">
                        <p>You haven't created any workflows yet. Click the "New Workflow" button to get started!</p>
                    </div>
                ) : (
                    workflows.map((workflow) => (
                        <div
                            key={workflow.id}
                            className="workflow-card"
                            onClick={() => handleWorkflowClick(workflow.id)}
                        >
                            <h3>{workflow.name}</h3>
                            <p>{workflow.description || 'No description available'}</p>
                            <div className="workflow-meta">
                                <span className="date">
                                    Created: {new Date(workflow.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Workflows; 