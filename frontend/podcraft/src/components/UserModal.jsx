import React, { useState, useEffect } from 'react';
import './UserModal.css';

const UserModal = ({ isOpen, onClose, token }) => {
    const [user, setUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (isOpen && token) {
            fetchUserDetails();
        }
    }, [isOpen, token]);

    const fetchUserDetails = async () => {
        try {
            const response = await fetch('http://localhost:8000/user/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUser(data);
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:8000/user/update-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password: newPassword })
            });

            if (response.ok) {
                setMessage('Password updated successfully');
                setNewPassword('');
            } else {
                const error = await response.json();
                setMessage(error.detail);
            }
        } catch (error) {
            setMessage('Failed to update password');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close" onClick={onClose}>&times;</button>
                <h2>User Profile</h2>
                {user && (
                    <div className="user-info">
                        <p><strong>Username:</strong> {user.username}</p>
                        <form onSubmit={handlePasswordUpdate}>
                            <div className="form-group">
                                <label>New Password:</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                />
                            </div>
                            <button type="submit" className="update-btn">Update Password</button>
                        </form>
                        {message && <p className="message">{message}</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserModal; 