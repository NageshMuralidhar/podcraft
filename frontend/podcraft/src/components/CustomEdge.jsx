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
        borderRadius: 20, // Add rounded corners to the paths
    });

    // Determine edge style based on source node type
    const sourceType = data?.sourceType || 'default';

    // Default style if nothing specific is provided
    const edgeStyle = {
        strokeWidth: 3, // Increase stroke width from default
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
                strokeDasharray="6 3" // Improved dash pattern
                strokeLinecap="round"
                filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.3))" // Add subtle shadow
            />

            {/* Glow effect for the path */}
            <path
                d={edgePath}
                className={`edge-glow source-${sourceType}`}
                style={{
                    ...edgeStyle,
                    stroke: style.stroke,
                    strokeWidth: 10,
                    strokeOpacity: 0.15,
                    filter: 'blur(3px)',
                    pointerEvents: 'none', // Ensure this doesn't interfere with clicks
                }}
            />

            {/* Edge label */}
            {label && (
                <EdgeText
                    x={labelX}
                    y={labelY}
                    label={label}
                    labelStyle={{
                        fontWeight: 500,
                        fill: 'white',
                        fontSize: 12,
                        ...labelStyle,
                    }}
                    labelShowBg={labelShowBg}
                    labelBgStyle={{
                        fill: '#1E1E28',
                        opacity: 0.8,
                        rx: 4,
                        ry: 4,
                    }}
                    labelBgPadding={[4, 6]}
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