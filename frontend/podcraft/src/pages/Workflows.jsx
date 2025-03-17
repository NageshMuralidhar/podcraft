import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaCalendarAlt, FaEdit, FaTrash, FaPlayCircle, FaRegClock, FaFlask, FaMicrophone, FaHeadphones, FaPodcast, FaCheck } from 'react-icons/fa';
import { MdOutlineWorkspaces } from 'react-icons/md';
import { TiFlowMerge } from 'react-icons/ti';
import './Workflows.css';

const Workflows = () => {
    const navigate = useNavigate();
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

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

    const handleDeleteClick = (e, workflowId) => {
        e.stopPropagation(); // Prevent workflow card click
        setDeleteConfirmId(workflowId);
    };

    const handleDeleteConfirm = async (e, workflowId) => {
        e.stopPropagation(); // Prevent workflow card click

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/api/workflows/${workflowId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete workflow');
            }

            // Remove from state
            setWorkflows(workflows.filter(w => w.id !== workflowId));
            setDeleteConfirmId(null);
        } catch (err) {
            console.error('Error deleting workflow:', err);
            setError(err.message);
        }
    };

    const handleDeleteCancel = (e) => {
        e.stopPropagation(); // Prevent workflow card click
        setDeleteConfirmId(null);
    };

    const getRandomGradient = () => {
        const gradients = [
            'linear-gradient(135deg, #6366F1, #8B5CF6)',
            'linear-gradient(135deg, #3B82F6, #6366F1)',
            'linear-gradient(135deg, #10B981, #3B82F6)',
            'linear-gradient(135deg, #F59E0B, #10B981)',
            'linear-gradient(135deg, #EF4444, #F59E0B)',
            'linear-gradient(135deg, #EC4899, #8B5CF6)',
            'linear-gradient(135deg, #8B5CF6, #EC4899)',
            'linear-gradient(135deg, #6366F1, #EC4899)'
        ];
        return gradients[Math.floor(Math.random() * gradients.length)];
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    };

    if (loading) {
        return (
            <div className="workflows-container">
                <div className="loading-indicator">
                    <div className="loader"></div>
                    <span>Loading your workflows...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="workflows-container">
                <div className="error-message">
                    <span>⚠️ Error: {error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="workflows-container">
            <div className="workflows-header">
                <div className="header-content">
                    <TiFlowMerge className="title-icon" />
                    <h1>Your Podcast Workflows</h1>
                </div>
                <button className="create-workflow-btn" onClick={handleCreateWorkflow}>
                    <FaPlus /> New Workflow
                </button>
            </div>

            <div className="workflows-subheader">
                <p>Manage and edit your podcast workflow templates</p>
                <div className="workflows-stats">
                    <div className="stat-item">
                        <MdOutlineWorkspaces />
                        <span>{workflows.length} Workflows</span>
                    </div>
                </div>
            </div>

            <div className="workflows-grid">
                {workflows.length === 0 ? (
                    <div className="no-workflows">
                        <FaPodcast className="empty-icon" />
                        <h3>No Workflows Yet</h3>
                        <p>You haven't created any workflows yet. Click the "New Workflow" button to get started!</p>
                        <button className="create-workflow-empty-btn" onClick={handleCreateWorkflow}>
                            <FaPlus /> Create Your First Workflow
                        </button>
                    </div>
                ) : (
                    workflows.map((workflow) => (
                        <div
                            key={workflow.id}
                            className="workflow-card"
                            onClick={() => handleWorkflowClick(workflow.id)}
                            style={{ '--card-gradient': getRandomGradient() }}
                        >
                            <div className="workflow-card-header">
                                <div className="workflow-icon">
                                    <TiFlowMerge />
                                </div>
                                <div className="workflow-actions">
                                    {deleteConfirmId === workflow.id ? (
                                        <div className="delete-confirm">
                                            <button
                                                className="delete-yes"
                                                onClick={(e) => handleDeleteConfirm(e, workflow.id)}
                                                title="Confirm delete"
                                            >
                                                <FaCheck />
                                            </button>
                                            <button
                                                className="delete-no"
                                                onClick={handleDeleteCancel}
                                                title="Cancel"
                                            >
                                                <FaEdit />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className="delete-btn"
                                            onClick={(e) => handleDeleteClick(e, workflow.id)}
                                            title="Delete workflow"
                                        >
                                            <FaTrash />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <h3>{workflow.name}</h3>
                            <p className="workflow-description">{workflow.description || 'No description available'}</p>

                            <div className="workflow-meta">
                                <div className="meta-item">
                                    <FaCalendarAlt />
                                    <span>{formatDate(workflow.created_at)}</span>
                                </div>
                                <div className="meta-item">
                                    <FaRegClock />
                                    <span>Last edited: {formatDate(workflow.updated_at || workflow.created_at)}</span>
                                </div>
                            </div>

                            <div className="workflow-card-footer">
                                <div className="workflow-status">
                                    {workflow.insights ? (
                                        <span className="status ready">
                                            <FaHeadphones /> Ready
                                        </span>
                                    ) : (
                                        <span className="status draft">
                                            <FaFlask /> Draft
                                        </span>
                                    )}
                                </div>
                                <button className="open-btn">
                                    <FaPlayCircle /> Open
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Workflows; 