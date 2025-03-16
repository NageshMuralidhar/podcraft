import React from 'react';
import {
    getSmoothStepPath,
    EdgeText
} from 'reactflow';

// Custom animated edge component with contextual styling
const CustomEdge = (props) => {
    const {
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        style = {},
        markerEnd,
        data,
        label,
        labelStyle,
        labelShowBg = true
    } = props;

    // Get edge path based on the edge type (default to smoothstep)
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // Determine edge style based on source node type
    const sourceType = data?.sourceType || 'default';

    // Default style if nothing specific is provided
    const edgeStyle = {
        ...style,
    };

    return (
        <>
            {/* Main path */}
            <path
                id={id}
                className={`react-flow__edge-path animated source-${sourceType}`}
                d={edgePath}
                style={edgeStyle}
                markerEnd={markerEnd}
                strokeDasharray="5"
                strokeLinecap="round"
            />

            {/* Edge label */}
            {label && (
                <EdgeText
                    x={labelX}
                    y={labelY}
                    label={label}
                    labelStyle={labelStyle}
                    labelShowBg={labelShowBg}
                />
            )}
        </>
    );
};

// Define edge types for ReactFlow
export const customEdgeTypes = {
    custom: CustomEdge,
};

export default CustomEdge; 