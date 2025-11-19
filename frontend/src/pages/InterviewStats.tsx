import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './InterviewStats.css';

interface StageStats {
  stage: string;
  timeSpent: number;
  formattedTime: string;
}

const InterviewStats = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [stageTimes, setStageTimes] = useState<Record<string, number>>({});
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState<number | null>(null);

  useEffect(() => {
    if (location.state?.sessionId) {
      setSessionId(location.state.sessionId);
      // Use stageTimes from state if available, otherwise will use from backend
      if (location.state?.stageTimes) {
        setStageTimes(location.state.stageTimes);
      }
      fetchSessionData(location.state.sessionId);
    } else {
      navigate('/home');
    }
  }, [location, navigate]);

  const fetchSessionData = async (sid: number) => {
    try {
      const response = await api.get(`/api/interviews/session/${sid}`);
      setSessionData(response.data);
      
      // Use stage_statistics from backend if available (more reliable)
      if (response.data?.session?.stage_statistics) {
        setStageTimes(response.data.session.stage_statistics);
      }
      
      // Use stored feedback if available, otherwise fetch it
      if (response.data?.session?.status === 'completed') {
        if (response.data?.session?.feedback) {
          // Use stored feedback
          setFeedback(response.data.session.feedback);
          setLoadingFeedback(false);
        } else {
          // Fetch feedback if not stored yet
          fetchFeedback(sid);
        }
      }
    } catch (error) {
      console.error('Failed to fetch session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async (sid: number) => {
    setLoadingFeedback(true);
    try {
      const response = await api.get(`/api/interviews/session/${sid}/feedback`);
      setFeedback(response.data.feedback);
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
      setFeedback('Unable to generate feedback at this time.');
    } finally {
      setLoadingFeedback(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getStageLabel = (stage: string): string => {
    const labels: Record<string, string> = {
      'explanation': 'Explanation Stage',
      'coding': 'Coding Stage',
      'followup': 'Follow-up Questions',
      'complexity': 'Complexity Analysis',
      'optimization': 'Optimization',
    };
    return labels[stage] || stage;
  };

  const calculateStats = (): StageStats[] => {
    // Use stage_statistics from backend if available, otherwise use stageTimes from state
    const statsToUse = sessionData?.session?.stage_statistics || stageTimes;
    const stages = ['explanation', 'coding', 'followup', 'complexity', 'optimization'];
    return stages.map(stage => ({
      stage,
      timeSpent: statsToUse[stage] || 0,
      formattedTime: formatTime(statsToUse[stage] || 0),
    })).filter(stat => stat.timeSpent > 0);
  };

  const getTotalTime = (): number => {
    // Use stage_statistics from backend if available, otherwise use stageTimes from state
    const statsToUse = sessionData?.session?.stage_statistics || stageTimes;
    const total = Object.values(statsToUse).reduce((sum, time) => sum + time, 0);
    return total;
  };

  const stats = calculateStats();
  const totalTime = getTotalTime();

  if (loading) {
    return <div className="stats-container">Loading statistics...</div>;
  }

  return (
    <div className="stats-container">
      <div className="stats-header">
        <h1>MockInterviews.ai</h1>
        <button onClick={logout} className="logout-button">
          Logout
        </button>
      </div>

      <div className="stats-content">
        <div className="stats-card">
          <h2>Interview Statistics</h2>
          
          {sessionData?.question && (
            <div className="question-info">
              <h3>Question: {sessionData.question.title}</h3>
              <p className="difficulty">Difficulty: {sessionData.question.difficulty}</p>
            </div>
          )}

          <div className="total-time">
            <h3>Total Interview Time</h3>
            <div className="time-display">{formatTime(totalTime)}</div>
          </div>

          {/* Test Case Results */}
          {sessionData?.session?.test_results && sessionData.session.test_results.total > 0 && (
            <div className="test-results-summary">
              <h3>Test Case Results</h3>
              <div className="test-results-display">
                <div className="test-result-item passed">
                  <span className="test-result-label">Passed:</span>
                  <span className="test-result-value">{sessionData.session.test_results.passed || 0}</span>
                </div>
                <div className="test-result-item failed">
                  <span className="test-result-label">Failed:</span>
                  <span className="test-result-value">{sessionData.session.test_results.failed || 0}</span>
                </div>
                <div className="test-result-item total">
                  <span className="test-result-label">Total:</span>
                  <span className="test-result-value">{sessionData.session.test_results.total || 0}</span>
                </div>
              </div>
            </div>
          )}

          <div className="stage-stats">
            <h3>Time Spent Per Stage</h3>
            <div className="stats-list">
              {stats.map((stat, index) => (
                <div key={stat.stage} className="stat-item">
                  <div className="stat-stage">
                    <span className="stat-number">{index + 1}</span>
                    <span className="stat-label">{getStageLabel(stat.stage)}</span>
                  </div>
                  <div className="stat-time">{stat.formattedTime}</div>
                  <div className="stat-bar-container">
                    <div 
                      className="stat-bar" 
                      style={{ width: `${(stat.timeSpent / totalTime) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interview Feedback Section */}
          {sessionData?.session?.status === 'completed' && (
            <div className="session-feedback-preview">
              <div 
                className="feedback-preview-header"
                onClick={() => setExpandedFeedback(expandedFeedback === sessionId ? null : sessionId)}
              >
                <h4>📝 Interview Feedback</h4>
                <span className="feedback-toggle">
                  {expandedFeedback === sessionId ? '▼' : '▶'}
                </span>
              </div>
              {expandedFeedback === sessionId && (
                <div className="feedback-preview-content">
                  {loadingFeedback ? (
                    <div className="feedback-loading">
                      <p>Generating comprehensive feedback...</p>
                    </div>
                  ) : feedback ? (
                    <div 
                      className="feedback-preview-text"
                      dangerouslySetInnerHTML={{ 
                        __html: (() => {
                          let html = feedback;
                          const lines = html.split('\n');
                          let result = [];
                          let inList = false;
                          let currentList = [];
                          
                          for (let i = 0; i < lines.length; i++) {
                            const line = lines[i].trim();
                            if (!line) continue;
                            
                            if (line.startsWith('## ')) {
                              if (inList) {
                                result.push(`<ul class="feedback-list">${currentList.join('')}</ul>`);
                                currentList = [];
                                inList = false;
                              }
                              const headerText = line.replace('## ', '').trim();
                              result.push(`<h4>${headerText}</h4>`);
                            }
                            else if (line.startsWith('- ') || line.startsWith('* ')) {
                              if (!inList) {
                                inList = true;
                              }
                              const listItem = line.replace(/^[-*] /, '').trim();
                              const withBold = listItem.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                              currentList.push(`<li>${withBold}</li>`);
                            }
                            else {
                              if (inList) {
                                result.push(`<ul class="feedback-list">${currentList.join('')}</ul>`);
                                currentList = [];
                                inList = false;
                              }
                              const withBold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                              result.push(`<p>${withBold}</p>`);
                            }
                          }
                          
                          if (inList) {
                            result.push(`<ul class="feedback-list">${currentList.join('')}</ul>`);
                          }
                          
                          return result.join('');
                        })()
                      }} 
                    />
                  ) : (
                    <div className="feedback-error">
                      <p>Unable to load feedback. Please try again later.</p>
                      <button onClick={() => fetchFeedback(sessionId!)} className="retry-feedback-button">
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="stats-actions">
            <button onClick={() => navigate('/home')} className="home-button">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewStats;

