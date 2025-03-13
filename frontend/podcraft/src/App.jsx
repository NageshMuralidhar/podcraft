import { useState } from 'react'
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate, Link } from 'react-router-dom'
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse } from "react-icons/tb";
import { AiFillHome } from "react-icons/ai";
import { BiPodcast } from "react-icons/bi";
import { FaMicrophoneAlt } from "react-icons/fa";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { ImPodcast } from "react-icons/im";
import { RiChatVoiceAiFill } from "react-icons/ri";
import { FaUser, FaSignOutAlt } from "react-icons/fa";
import { PiGooglePodcastsLogo } from "react-icons/pi";

import Home from './pages/Home'
import Podcasts from './pages/Podcasts'
import Studio from './pages/Studio'
import WorkflowEditor from './components/WorkflowEditor'
import UserModal from './components/UserModal'
import './App.css'

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const toggleTheme = (e) => {
    e.preventDefault();
    setIsDark(!isDark);
    document.body.style.backgroundColor = !isDark ? '#040511' : '#ffffff';
    document.body.style.color = !isDark ? '#ffffff' : '#000000';
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');

    try {
      const response = await fetch(`http://localhost:8000/${isLogin ? 'login' : 'signup'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        setIsAuthenticated(true);
      } else {
        const error = await response.json();
        alert(error.detail);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred during authentication');
    }
  };

  return (
    <Router>
      <>
        <div className={`${isAuthenticated && 'simple-bg'}`}>
        </div>
        <div className={`app-container ${isDark ? 'dark' : 'light'} ${!isAuthenticated && isDark ? 'bg-login' : ''} `} >
          <nav className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
            <div className='product-name'>
              <span><PiGooglePodcastsLogo /> PodCraft <sup>©</sup> <sub>Beta</sub></span>
            </div>
            <span className="toggle-btn" onClick={toggleSidebar}>
              {isOpen ? <TbLayoutSidebarLeftCollapse /> : <TbLayoutSidebarRightCollapse />}
            </span>

            <div className="nav-links">
              {isAuthenticated && (
                <>
                  <Link to="/home" className="nav-link">
                    <AiFillHome />
                    <span className={`link-text ${!isOpen && 'hidden'}`}>Home</span>
                  </Link>

                  <Link to="/podcasts" className="nav-link">
                    <BiPodcast />
                    <span className={`link-text ${!isOpen && 'hidden'}`}>Podcasts</span>
                  </Link>

                  <Link to="/studio" className="nav-link">
                    <FaMicrophoneAlt />
                    <span className={`link-text ${!isOpen && 'hidden'}`}>Studio</span>
                  </Link>

                  <div className="nav-divider"></div>

                  <a href="#" className="nav-link" onClick={() => setIsModalOpen(true)}>
                    <FaUser />
                    <span className={`link-text ${!isOpen && 'hidden'}`}>Profile</span>
                  </a>

                  <a href="#" className="nav-link" onClick={handleLogout}>
                    <FaSignOutAlt />
                    <span className={`link-text ${!isOpen && 'hidden'}`}>Logout</span>
                  </a>
                </>
              )}

              <a href="#" className="nav-link theme-toggle" onClick={toggleTheme}>
                {isDark ? <MdDarkMode /> : <MdLightMode />}
                <span className={`link-text ${!isOpen && 'hidden'}`}>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </span>
              </a>
            </div>
          </nav>

          <main className={`main-content ${!isOpen ? 'expanded' : ''}`}>
            {!isAuthenticated ? (
              <div className="auth-container">
                <div className="hero-section">
                  <div className="hero-content">
                    <div className="hero-logo">
                      <ImPodcast />
                      <h1>PodCraft</h1>
                    </div>
                    <p className="hero-tagline">One prompt <RiChatVoiceAiFill /> to Podcast <BiPodcast /></p>
                  </div>
                </div>
                <div className="auth-form-container">
                  <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
                  <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                      <input type="text" name="username" placeholder="Username" required />
                    </div>
                    <div className="form-group">
                      <input type="password" name="password" placeholder="Password" required />
                    </div>
                    <button type="submit" className="submit-btn">
                      {isLogin ? 'Login' : 'Sign Up'}
                    </button>
                  </form>
                  <p className="form-switch">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <a href="#" onClick={toggleForm}>
                      {isLogin ? 'Sign Up' : 'Login'}
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <Routes>
                <Route path="/home" element={<Home />} />
                <Route path="/podcasts" element={<Podcasts />} />
                <Route path="/studio" element={<Studio />} />
                <Route path="/studio/workflow/:workflowId" element={<WorkflowEditor />} />
                <Route path="/" element={<Navigate to="/home" replace />} />
              </Routes>
            )}
          </main>

          <UserModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            token={localStorage.getItem('token')}
          />
        </div>
      </>
    </Router>
  )
}

export default App
