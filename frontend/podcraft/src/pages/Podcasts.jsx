import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaPlay, FaPause, FaVolumeUp, FaTrash } from 'react-icons/fa';
import { BiPodcast } from 'react-icons/bi';
import { MdDateRange } from 'react-icons/md';
import DeleteModal from '../components/DeleteModal';
import Toast from '../components/Toast';
import './Podcasts.css';

const AudioPlayer = ({ audioUrl, duration }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            const updateProgress = () => {
                setProgress((audio.currentTime / audio.duration) * 100);
                setCurrentTime(audio.currentTime);
            };

            audio.addEventListener('timeupdate', updateProgress);
            audio.addEventListener('ended', () => setIsPlaying(false));

            return () => {
                audio.removeEventListener('timeupdate', updateProgress);
                audio.removeEventListener('ended', () => setIsPlaying(false));
            };
        }
    }, []);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="audio-player">
            <button className="play-button" onClick={togglePlay}>
                {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <div className="progress-bar">
                <div className="progress" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="duration">
                <FaVolumeUp />
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <audio ref={audioRef} src={audioUrl} preload="metadata" />
        </div>
    );
};

const Podcasts = () => {
    const [podcasts, setPodcasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, podcast: null });
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchPodcasts();
    }, []);

    const fetchPodcasts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/podcasts', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch podcasts');
            }

            const data = await response.json();
            setPodcasts(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.podcast) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/podcast/${deleteModal.podcast._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete podcast');
            }

            // Remove the podcast from the state
            setPodcasts(podcasts.filter(p => p._id !== deleteModal.podcast._id));
            setDeleteModal({ isOpen: false, podcast: null });

            // Show success toast
            setToast({
                message: 'Podcast deleted successfully',
                type: 'success'
            });

            // Clear toast after 3 seconds
            setTimeout(() => {
                setToast(null);
            }, 3000);
        } catch (err) {
            setError(err.message);
            // Show error toast
            setToast({
                message: 'Failed to delete podcast',
                type: 'error'
            });

            // Clear toast after 3 seconds
            setTimeout(() => {
                setToast(null);
            }, 3000);
        }
    };

    if (loading) {
        return (
            <div className="podcasts-container">
                <div className="loading-indicator">Loading your podcasts...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="podcasts-container">
                <div className="error-message">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="podcasts-container">
            <div className="podcasts-header">
                <h1><BiPodcast /> Your Generated Podcasts</h1>
            </div>
            <div className="podcasts-grid">
                {podcasts.length === 0 ? (
                    <div className="no-podcasts">
                        <p>You haven't generated any podcasts yet. Head over to the Home page to create your first podcast!</p>
                    </div>
                ) : (
                    podcasts.map((podcast) => (
                        <div key={podcast._id} className="podcast-card">
                            <div className="podcast-icon">
                                <FaMicrophone />
                                <button
                                    className="delete-icon"
                                    onClick={() => setDeleteModal({ isOpen: true, podcast })}
                                >
                                    <FaTrash />
                                </button>
                            </div>
                            <div className="podcast-content">
                                <div className="podcast-header">
                                    <h3>{podcast.topic}</h3>
                                </div>
                                <p>{podcast.research ? podcast.research.substring(0, 150) + '...' : 'No description available'}</p>
                                <div className="podcast-meta">
                                    <span className="date">
                                        <MdDateRange />
                                        {new Date(podcast.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <AudioPlayer
                                    audioUrl={podcast.audio_url}
                                    duration={podcast.duration || 0}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <DeleteModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, podcast: null })}
                onConfirm={handleDelete}
                podcastName={deleteModal.podcast?.topic}
            />

            {toast && (
                <div className="toast-container">
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                </div>
            )}
        </div>
    );
};

export default Podcasts; 