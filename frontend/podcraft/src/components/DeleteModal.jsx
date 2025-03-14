import React from 'react';
import './DeleteModal.css';
import { FaExclamationTriangle } from 'react-icons/fa';

const DeleteModal = ({ isOpen, onClose, onConfirm, podcastName }) => {
    if (!isOpen) return null;

    return (
        <div className="delete-modal-overlay">
            <div className="delete-modal-content">
                <div className="delete-modal-header">
                    <FaExclamationTriangle className="warning-icon" />
                    <h2>Confirm Deletion</h2>
                </div>
                <div className="delete-modal-body">
                    <p>This will permanently delete <span className="podcast-name">"{podcastName}"</span> podcast.</p>
                    <p className="warning-text">This action cannot be undone.</p>
                </div>
                <div className="delete-modal-footer">
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                    <button className="delete-btn" onClick={onConfirm}>Delete Podcast</button>
                </div>
            </div>
        </div>
    );
};

export default DeleteModal; 