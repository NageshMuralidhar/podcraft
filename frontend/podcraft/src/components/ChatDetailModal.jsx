import React, { useRef, useEffect } from 'react';
import { FaRobot, FaUser, FaCopy, FaSearch } from 'react-icons/fa';
import './ChatDetailModal.css';

/**
 * Modal component for displaying agent chat messages in detail
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {function} props.onClose - Function to call when the modal is closed
 * @param {string} props.agentName - The name of the agent
 * @param {string} props.agentId - The ID of the agent
 * @param {number} props.turn - The turn number
 * @param {string} props.content - The chat message content
 */
const ChatDetailModal = ({ isOpen, onClose, agentName, agentId, turn, content }) => {
    const modalRef = useRef(null);

    // Handle clicks outside the modal to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Copy content to clipboard
    const handleCopyContent = () => {
        const plainText = content.replace(/<[^>]*>/g, '');
        navigator.clipboard.writeText(plainText);

        // Show a mini toast or feedback
        const copyButton = document.querySelector('.copy-button');
        if (copyButton) {
            copyButton.classList.add('copied');
            setTimeout(() => {
                copyButton.classList.remove('copied');
            }, 2000);
        }
    };

    // Don't render anything if the modal is not open
    if (!isOpen) return null;

    // Get agent icon based on agent ID or name
    const getAgentIcon = () => {
        if (agentId === 'researcher') {
            return <FaSearch />;
        }
        return <FaRobot />;
    };

    return (
        <div className="chat-modal-overlay">
            <div className="chat-modal-content" ref={modalRef}>
                <div className="chat-modal-header">
                    <div className="agent-info">
                        <div className="agent-avatar">
                            {getAgentIcon()}
                        </div>
                        <div className="agent-details">
                            <h3>{agentName}</h3>
                            <span className="turn-badge">Turn {turn}</span>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button
                            className="copy-button"
                            onClick={handleCopyContent}
                            title="Copy to clipboard"
                        >
                            <FaCopy />
                        </button>
                        <button className="close-button" onClick={onClose}>×</button>
                    </div>
                </div>
                <div className="chat-modal-body">
                    <div className="content-box" dangerouslySetInnerHTML={{ __html: content }} />
                </div>
                <div className="chat-modal-footer">
                    <button className="modal-button close-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default ChatDetailModal; 