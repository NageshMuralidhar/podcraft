import React, { useState, useEffect, useRef } from 'react';
import './ResponseEditModal.css';

/**
 * Modal component for editing agent responses in the insights
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {function} props.onClose - Function to call when the modal is closed
 * @param {string} props.agentName - The name of the agent whose response is being edited
 * @param {string} props.agentId - The ID of the agent
 * @param {number} props.turn - The turn number of the response
 * @param {string} props.response - The current response text
 * @param {function} props.onSave - Function to call when the response is saved, receives (agentId, turn, newResponse)
 */
const ResponseEditModal = ({ isOpen, onClose, agentName, agentId, turn, response, onSave }) => {
    const [editedResponse, setEditedResponse] = useState('');
    const modalRef = useRef(null);
    const editorRef = useRef(null);

    // Initialize the editor with the current response when the modal opens
    useEffect(() => {
        if (isOpen && response) {
            // Remove any HTML tags to get plain text for editing
            const plainText = response.replace(/<[^>]*>/g, '');
            setEditedResponse(plainText);

            // Focus the editor when the modal opens
            setTimeout(() => {
                if (editorRef.current) {
                    editorRef.current.focus();
                }
            }, 100);
        }
    }, [isOpen, response]);

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

    // Handle saving the edited response
    const handleSave = () => {
        // Call the onSave callback with the agent ID, turn, and new response
        onSave(agentId, turn, editedResponse);
        onClose();
    };

    // Don't render anything if the modal is not open
    if (!isOpen) return null;

    return (
        <div className="response-modal-overlay">
            <div className="response-modal-content" ref={modalRef}>
                <div className="response-modal-header">
                    <h3>Edit Response: {agentName}</h3>
                    <span className="response-modal-turn">Turn {turn}</span>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <textarea
                    ref={editorRef}
                    className="response-editor"
                    value={editedResponse}
                    onChange={(e) => setEditedResponse(e.target.value)}
                    placeholder="Edit the agent's response..."
                />
                <div className="response-modal-footer">
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                    <button className="save-btn" onClick={handleSave}>Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default ResponseEditModal; 