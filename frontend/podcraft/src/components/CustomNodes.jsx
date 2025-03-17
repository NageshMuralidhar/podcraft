import React from 'react';
import { Handle, Position } from 'reactflow';
import {
    FaKeyboard,
    FaRobot,
    FaLightbulb,
    FaBell,
    FaYoutube,
    FaBrain,
    FaMicrophone,
    FaSlidersH,
    FaSearch,
    FaBookReader
} from 'react-icons/fa';
import { BiPodcast } from 'react-icons/bi';
import './CustomNodes.css';

const nodeIcons = {
    input: FaKeyboard,
    researcher: FaSearch,
    agent: FaRobot,
    insights: FaBrain,
    notify: FaBell,
    publish: FaYoutube,
    default: BiPodcast
};

// Base node component
const BaseNode = ({ data, nodeType, icon: IconComponent, color, showSourceHandle = true, showTargetHandle = true }) => {
    // Use CSS variable through inline style object without TypeScript complaints
    const nodeStyle = {
        borderColor: color,
        // Additional inline styles can be added here
    };

    // Check if this is an input node with a prompt
    const hasPrompt = nodeType === 'input-node' && data.prompt;

    return (
        <div className={`custom-node ${nodeType}-node ${data.prompt ? 'has-prompt' : ''}`} style={nodeStyle}>
            {showTargetHandle && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className="custom-handle"
                    style={{ backgroundColor: color }}
                />
            )}

            <div className="node-content">
                <div className="node-header">
                    <div className="node-icon" style={{ backgroundColor: color }}>
                        <IconComponent />
                    </div>
                    <div className="node-title">{data.label}</div>
                </div>
                {data.description && (
                    <div className="node-description">{data.description}</div>
                )}
                {data.prompt && nodeType === 'input-node' && (
                    <div className="node-prompt">
                        <div className="prompt-indicator">Prompt set ✓</div>
                    </div>
                )}
            </div>

            {showSourceHandle && (
                <Handle
                    type="source"
                    position={Position.Right}
                    className="custom-handle"
                    style={{ backgroundColor: color }}
                />
            )}
        </div>
    );
};

// Specific node types
export const InputNode = (props) => {
    // Input nodes only have source handles (output)
    return (
        <BaseNode
            {...props}
            nodeType="input"
            icon={FaKeyboard}
            color="#6366F1"
            showTargetHandle={false}
        />
    );
};

// Specialized Researcher node (a type of agent)
export const ResearcherNode = (props) => {
    return (
        <BaseNode
            {...props}
            nodeType="researcher"
            icon={FaSearch}
            color="#4C1D95" // Deep purple
        />
    );
};

export const AgentNode = (props) => {
    return (
        <BaseNode
            {...props}
            nodeType="agent"
            icon={FaRobot}
            color="#10B981"
        />
    );
};

export const InsightsNode = (props) => {
    return (
        <BaseNode
            {...props}
            nodeType="insights"
            icon={FaBrain}
            color="#F59E0B"
        />
    );
};

export const NotifyNode = (props) => {
    return (
        <BaseNode
            {...props}
            nodeType="notify"
            icon={FaBell}
            color="#EF4444"
        />
    );
};

export const PublishNode = (props) => {
    // Output nodes only have target handles (input)
    return (
        <BaseNode
            {...props}
            nodeType="publish"
            icon={FaYoutube}
            color="#DC2626"
            showSourceHandle={false}
        />
    );
};

// Default node for any other types
export const DefaultNode = (props) => {
    return (
        <BaseNode
            {...props}
            nodeType="default"
            icon={BiPodcast}
            color="#8B5CF6"
        />
    );
};

// A map of node types to their components for easy registration
export const nodeTypes = {
    input: InputNode,
    researcher: ResearcherNode,
    agent: AgentNode,
    insights: InsightsNode,
    notify: NotifyNode,
    output: PublishNode,
    default: DefaultNode
};

export default nodeTypes; 