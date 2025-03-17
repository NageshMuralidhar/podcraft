import React, { useRef, useEffect, useState } from 'react';
import { FaRobot, FaUser, FaCopy, FaSearch, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import './ChatDetailModal.css';

/**
 * Modal component for displaying and editing agent chat messages in detail
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {function} props.onClose - Function to call when the modal is closed
 * @param {string} props.agentName - The name of the agent
 * @param {string} props.agentId - The ID of the agent
 * @param {number} props.turn - The turn number
 * @param {string} props.content - The chat message content
 * @param {function} props.onSave - Function to call when the content is saved
 */
const ChatDetailModal = ({ isOpen, onClose, agentName, agentId, turn, content, onSave }) => {
    const modalRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const textareaRef = useRef(null);

    // Initialize the editor with the current content when editing starts
    useEffect(() => {
        if (isEditing && content) {
            // Remove any HTML tags to get plain text for editing
            const plainText = content.replace(/<[^>]*>/g, '');
            setEditedContent(plainText);

            // Focus the textarea when editing starts
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                }
            }, 100);
        }
    }, [isEditing, content]);

    // Reset edited content when content changes (even if modal is already open)
    useEffect(() => {
        if (content && isOpen) {
            // If we're currently editing, update the edited content
            if (isEditing) {
                const plainText = content.replace(/<[^>]*>/g, '');
                setEditedContent(plainText);
            }
        }
    }, [content, isOpen]);

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

    // Start editing the content
    const handleStartEditing = () => {
        setIsEditing(true);
    };

    // Cancel editing and reset
    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedContent('');
    };

    // Save the edited content
    const handleSaveEdit = () => {
        if (onSave) {
            onSave(agentId, turn, editedContent);
        }
        setIsEditing(false);
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
                        {!isEditing ? (
                            <>
                                <button
                                    className="edit-button"
                                    onClick={handleStartEditing}
                                    title="Edit content"
                                >
                                    <FaEdit />
                                </button>
                                <button
                                    className="copy-button"
                                    onClick={handleCopyContent}
                                    title="Copy to clipboard"
                                >
                                    <FaCopy />
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    className="save-button"
                                    onClick={handleSaveEdit}
                                    title="Save changes"
                                >
                                    <FaSave />
                                </button>
                                <button
                                    className="cancel-button"
                                    onClick={handleCancelEdit}
                                    title="Cancel editing"
                                >
                                    <FaTimes />
                                </button>
                            </>
                        )}
                        <button className="close-button" onClick={onClose}>×</button>
                    </div>
                </div>
                <div className="chat-modal-body">
                    {!isEditing ? (
                        <div className="content-box" dangerouslySetInnerHTML={{ __html: content }} />
                    ) : (
                        <textarea
                            ref={textareaRef}
                            className="content-editor"
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            placeholder="Edit the content..."
                        />
                    )}
                </div>
                <div className="chat-modal-footer">
                    {!isEditing ? (
                        <button className="modal-button close-btn" onClick={onClose}>Close</button>
                    ) : (
                        <>
                            <button className="modal-button cancel-btn" onClick={handleCancelEdit}>Cancel</button>
                            <button className="modal-button save-btn" onClick={handleSaveEdit}>Save Changes</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatDetailModal; 