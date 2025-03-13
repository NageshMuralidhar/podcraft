import React, { useState } from 'react';
import { FaMicrophone, FaPlay, FaPause, FaVolumeUp } from 'react-icons/fa';
import { BiPodcast } from 'react-icons/bi';
import { MdDateRange } from 'react-icons/md';
import './Podcasts.css';

const SAMPLE_PODCASTS = [
    {
        id: 1,
        title: "The Future of AI",
        description: "Exploring the latest developments in artificial intelligence and its impact on society",
        duration: "25:30",
        date: "2024-03-15",
        audioUrl: "sample.mp3"
    },
    {
        id: 2,
        title: "Tech Trends 2024",
        description: "A deep dive into emerging technologies and their potential impact on our daily lives",
        duration: "32:15",
        date: "2024-03-14",
        audioUrl: "sample.mp3"
    },
    {
        id: 3,
        title: "Digital Innovation Today",
        description: "Understanding the latest digital transformations and their effects on business",
        duration: "28:45",
        date: "2024-03-13",
        audioUrl: "sample.mp3"
    }
];

const AudioPlayer = ({ duration }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
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
                <span>{duration}</span>
            </div>
        </div>
    );
};

const Podcasts = () => {
    return (
        <div className="podcasts-container">
            <div className="podcasts-header">
                <h1><BiPodcast /> Your Generated Podcasts</h1>
            </div>
            <div className="podcasts-grid">
                {SAMPLE_PODCASTS.map((podcast) => (
                    <div key={podcast.id} className="podcast-card">
                        <div className="podcast-icon">
                            <FaMicrophone />
                        </div>
                        <div className="podcast-content">
                            <h3>{podcast.title}</h3>
                            <p>{podcast.description}</p>
                            <div className="podcast-meta">
                                <span className="date">
                                    <MdDateRange />
                                    {podcast.date}
                                </span>
                            </div>
                            <AudioPlayer duration={podcast.duration} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Podcasts; 