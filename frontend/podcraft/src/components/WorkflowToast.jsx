import React, { useEffect } from 'react';
import { FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';
import './WorkflowToast.css';

const WorkflowToast = ({ message, type = 'success', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <FaCheckCircle />;
            case 'error':
                return <FaTimesCircle />;
            case 'info':
                return <FaInfoCircle />;
            default:
                return <FaCheckCircle />;
        }
    };

    return (
        <div className={`workflow-toast ${type}`}>
            <div className="workflow-toast-icon">
                {getIcon()}
            </div>
            <div className="workflow-toast-message">{message}</div>
        </div>
    );
};

export default WorkflowToast; 