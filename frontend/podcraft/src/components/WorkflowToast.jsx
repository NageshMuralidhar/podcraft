import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCheckCircle, FaTimesCircle, FaInfoCircle, FaPodcast, FaMusic } from 'react-icons/fa';
import './WorkflowToast.css';

// The actual Toast component
const Toast = ({ message, type = 'success', onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Add class to body to prevent scrollbar
        document.body.classList.add('has-toast');

        // Show toast immediately
        setVisible(true);

        // Hide toast after delay
        const timer = setTimeout(() => {
            setVisible(false);
            // Delay actual removal from DOM to allow exit animation to complete
            setTimeout(() => {
                document.body.classList.remove('has-toast');
                onClose();
            }, 300);
        }, 5000); // Extended duration for toast visibility

        return () => {
            clearTimeout(timer);
            document.body.classList.remove('has-toast');
        };
    }, [onClose, message]);

    const getIcon = () => {
        // Check if message is related to podcast generation
        const isPodcastMessage = message.toLowerCase().includes('podcast') ||
            message.toLowerCase().includes('play') ||
            message.toLowerCase().includes('listen');

        switch (type) {
            case 'success':
                return isPodcastMessage ? <FaPodcast /> : <FaCheckCircle />;
            case 'error':
                return <FaTimesCircle />;
            case 'info':
                return <FaInfoCircle />;
            case 'podcast':
                return <FaMusic />;
            default:
                return <FaCheckCircle />;
        }
    };

    // Determine if this is a podcast-related toast for special styling
    const isPodcastToast = message.toLowerCase().includes('podcast') || type === 'podcast';
    const toastClass = `workflow-toast ${type} ${isPodcastToast ? 'podcast-toast' : ''} ${visible ? 'visible' : ''}`;

    return (
        <div className={toastClass}>
            <div className="workflow-toast-icon">
                {getIcon()}
            </div>
            <div className="workflow-toast-message">{message}</div>
        </div>
    );
};

// Portal component to mount toasts in the toast container
const WorkflowToast = (props) => {
    const container = document.getElementById('toast-container');

    if (!container) {
        // Fallback if the toast container doesn't exist
        return <Toast {...props} />;
    }

    return createPortal(<Toast {...props} />, container);
};

export default WorkflowToast; 