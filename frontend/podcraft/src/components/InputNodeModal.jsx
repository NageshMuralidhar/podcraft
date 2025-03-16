import React, { useState } from 'react';
import './InputNodeModal.css';

const InputNodeModal = ({ isOpen, onClose, onSubmit, nodeId }) => {
    const [prompt, setPrompt] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(nodeId, prompt);
        setPrompt('');
        onClose();
    };

    return (
        <div className="input-modal-overlay">
            <div className="input-modal">
                <div className="input-modal-header">
                    <h2>Enter Your Prompt</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Enter your prompt here..."
                            rows={6}
                            required
                        />
                    </div>
                    <div className="input-modal-footer">
                        <button type="button" className="cancel-button" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="submit-button">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InputNodeModal; 