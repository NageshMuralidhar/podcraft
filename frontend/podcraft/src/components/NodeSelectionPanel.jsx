import React from 'react';
import { FaRobot, FaYoutube, FaBell, FaLightbulb, FaKeyboard, FaSearch, FaInfoCircle } from 'react-icons/fa';
import './NodeSelectionPanel.css';

const NodeSelectionPanel = ({ isOpen, onClose, agents, onSelectNode }) => {
    const nodeTypes = [
        {
            id: 'input',
            label: 'Input Node',
            description: 'Add an input prompt for your podcast',
            constraint: 'Can only connect to Research Agent',
            icon: <FaKeyboard />,
            color: '#6366F1',
            colorRgb: '99, 102, 241',
            subItems: null
        },
        {
            id: 'agent',
            label: 'Agents Node',
            description: 'Add AI agents to process your content',
            constraint: 'Research Agent can receive from Input and connect to Agents or Insights. Regular Agents can only connect to Insights',
            icon: <FaRobot />,
            color: '#10B981',
            colorRgb: '16, 185, 129',
            subItems: agents
        },
        {
            id: 'insights',
            label: 'Insights Node',
            description: 'Add analytics and insights processing',
            constraint: 'Can receive from Agents or Research Agent and connect to Notify or Publish nodes',
            icon: <FaLightbulb />,
            color: '#F59E0B',
            colorRgb: '245, 158, 11',
            subItems: null
        },
        {
            id: 'notify',
            label: 'Notify Node',
            description: 'Add notifications and alerts',
            constraint: 'Can only receive from Insights nodes',
            icon: <FaBell />,
            color: '#EF4444',
            colorRgb: '239, 68, 68',
            subItems: null
        },
        {
            id: 'publish',
            label: 'Publish Node',
            description: 'Publish to YouTube',
            constraint: 'Can only receive from Insights nodes',
            icon: <FaYoutube />,
            color: '#DC2626',
            colorRgb: '220, 38, 38',
            subItems: null
        }
    ];

    if (!isOpen) return null;

    const handleNodeSelect = (nodeType, agentId = null) => {
        onSelectNode({ type: nodeType, agentId });
        onClose();
    };

    return (
        <div className="node-selection-overlay" onClick={onClose}>
            <div className="node-selection-panel" onClick={e => e.stopPropagation()}>
                <div className="panel-header">
                    <h2>Add Node</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="node-types">
                    {nodeTypes.map((nodeType) => (
                        <div key={nodeType.id} className="node-type-section">
                            <div
                                className={`node-type-item node-color-${nodeType.id}`}
                                onClick={() => nodeType.id !== 'agent' && handleNodeSelect(nodeType.id)}
                                style={{ borderColor: nodeType.color }}
                            >
                                <div className="node-icon" style={{ backgroundColor: nodeType.color }}>{nodeType.icon}</div>
                                <div className="node-info">
                                    <h3>{nodeType.label}</h3>
                                    <p>{nodeType.description}</p>
                                    <div className="node-constraint" style={{ color: `rgba(${nodeType.colorRgb}, 0.7)` }}>
                                        <FaInfoCircle style={{ color: nodeType.color }} />
                                        <span>{nodeType.constraint}</span>
                                    </div>
                                </div>
                            </div>
                            {nodeType.id === 'agent' && nodeType.subItems && (
                                <div className="agent-list">
                                    {nodeType.subItems.map((agent) => (
                                        <div
                                            key={agent.id}
                                            className={`agent-item ${agent.isDefault ? 'default' : 'custom'} ${agent.id === 'researcher' ? 'researcher-agent' : ''}`}
                                            onClick={() => handleNodeSelect('agent', agent.id)}
                                        >
                                            <span className="agent-name">
                                                {agent.id === 'researcher' && <FaSearch className="agent-special-icon" />}
                                                {agent.name}
                                            </span>
                                            <span className="agent-status">{agent.status}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NodeSelectionPanel; 