import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './Home.css';

const Home = () => {
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  const companies = [
    { 
      name: 'All', 
      label: 'All Companies', 
      logoUrl: 'https://cdn.simpleicons.org/globe/667eea',
      fallbackIcon: '🌐'
    },
    { 
      name: 'Google', 
      label: 'Google', 
      logoUrl: 'https://cdn.simpleicons.org/google/4285F4',
      fallbackIcon: '🔍'
    },
    { 
      name: 'Amazon', 
      label: 'Amazon', 
      logoUrl: 'https://cdn.simpleicons.org/amazon/FF9900',
      fallbackIcon: '📦'
    },
    { 
      name: 'Meta', 
      label: 'Meta', 
      logoUrl: 'https://cdn.simpleicons.org/meta/0081FB',
      fallbackIcon: '👤'
    },
    { 
      name: 'Microsoft', 
      label: 'Microsoft', 
      logoUrl: 'https://cdn.simpleicons.org/microsoft/00A4EF',
      fallbackIcon: '🪟'
    },
    { 
      name: 'Apple', 
      label: 'Apple', 
      logoUrl: 'https://cdn.simpleicons.org/apple/000000',
      fallbackIcon: '🍎'
    },
    { 
      name: 'Netflix', 
      label: 'Netflix', 
      logoUrl: 'https://cdn.simpleicons.org/netflix/E50914',
      fallbackIcon: '🎬'
    },
    { 
      name: 'Uber', 
      label: 'Uber', 
      logoUrl: 'https://cdn.simpleicons.org/uber/000000',
      fallbackIcon: '🚗'
    },
    { 
      name: 'General', 
      label: 'General', 
      logoUrl: 'https://cdn.simpleicons.org/briefcase/667eea',
      fallbackIcon: '💼'
    },
  ];

  const handleStartInterview = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if token exists before making request
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You are not authenticated. Please login again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      console.log('Starting interview with difficulty:', difficulty, 'company:', selectedCompany);
      const response = await api.post('/api/interviews/start', { 
        difficulty,
        company: selectedCompany === 'All' ? null : selectedCompany
      });
      console.log('Interview started successfully:', response.data);
      const { session_id, question } = response.data;
      
      // Store session info and navigate to interview
      navigate('/interview', { 
        state: { 
          sessionId: session_id, 
          question 
        } 
      });
    } catch (err: any) {
      console.error('Error starting interview:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to start interview. Please try again.';
      setError(errorMessage);
      
      // If 401, redirect to login after showing error
      if (err.response?.status === 401) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>MockInterviews.ai</h1>
        <button onClick={logout} className="logout-button">
          Logout
        </button>
      </div>
      <div className="home-content">
        <div className="welcome-card">
          <h2>Welcome to Your Mock Interview</h2>
          <p>Practice your DSA skills with AI-powered mock interviews</p>
          
          <div className="company-selector">
            <h3>Select Company</h3>
            <div className="company-tags">
              {companies.map((company) => (
                <button
                  key={company.name}
                  className={`company-tag ${selectedCompany === company.name ? 'active' : ''}`}
                  onClick={() => setSelectedCompany(company.name)}
                >
                  <span className="company-icon">
                    <img 
                      src={company.logoUrl} 
                      alt={company.label}
                      className="company-logo"
                      onError={(e) => {
                        // Fallback to emoji if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.nextSibling) {
                          (target.nextSibling as HTMLElement).style.display = 'inline';
                        }
                      }}
                    />
                    <span className="company-logo-fallback" style={{ display: 'none' }}>
                      {company.fallbackIcon}
                    </span>
                  </span>
                  <span className="company-label">{company.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="difficulty-selector">
            <h3>Select Difficulty Level</h3>
            <div className="difficulty-buttons">
              <button
                className={`difficulty-btn ${difficulty === 'Easy' ? 'active' : ''}`}
                onClick={() => setDifficulty('Easy')}
              >
                Easy
              </button>
              <button
                className={`difficulty-btn ${difficulty === 'Medium' ? 'active' : ''}`}
                onClick={() => setDifficulty('Medium')}
              >
                Medium
              </button>
              <button
                className={`difficulty-btn ${difficulty === 'Hard' ? 'active' : ''}`}
                onClick={() => setDifficulty('Hard')}
              >
                Hard
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="action-buttons">
            <button
              onClick={handleStartInterview}
              disabled={loading}
              className="start-button"
            >
              {loading ? 'Starting...' : 'Start Interview'}
            </button>
            <button
              onClick={() => navigate('/past-interviews')}
              className="view-history-button"
            >
              View Past Interviews
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

