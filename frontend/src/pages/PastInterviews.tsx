import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import './PastInterviews.css';

interface InterviewSession {
  id: number;
  question_title: string;
  difficulty: string;
  status: string;
  current_stage: string;
  started_at: string;
  completed_at: string | null;
  total_time_seconds: number;
  stage_statistics: Record<string, number>;
  language: string | null;
  feedback: string | null;
  test_results: { passed: number; failed: number; total: number } | null;
}

const PastInterviews = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedFeedback, setExpandedFeedback] = useState<number | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/interviews/sessions');
      setSessions(response.data.sessions || []);
    } catch (err: any) {
      console.error('Failed to fetch sessions:', err);
      setError(err.response?.data?.detail || 'Failed to load interview history');
    } finally {
      setLoading(false);
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

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Get local timezone name
    const timeZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getStageLabel = (stage: string): string => {
    const labels: Record<string, string> = {
      'explanation': 'Explanation',
      'coding': 'Coding',
      'followup': 'Follow-up',
      'complexity': 'Complexity',
      'optimization': 'Optimization',
      'complete': 'Complete',
      'in_progress': 'In Progress',
    };
    return labels[stage] || stage;
  };

  const getTotalTimeFromStats = (stats: Record<string, number>): number => {
    return Object.values(stats).reduce((sum, time) => sum + time, 0);
  };

  const handleViewDetails = (sessionId: number) => {
    navigate(`/interview-stats`, { 
      state: { 
        sessionId,
        stageTimes: sessions.find(s => s.id === sessionId)?.stage_statistics || {}
      } 
    });
  };

  if (loading) {
    return (
      <div className="past-interviews-container">
        <div className="past-interviews-header">
          <h1>MockInterviews.ai</h1>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
        <div className="loading-message">Loading interview history...</div>
      </div>
    );
  }

  return (
    <div className="past-interviews-container">
      <Navbar />

      <div className="past-interviews-content">
        <div className="past-interviews-card">
          <div className="page-header">
            <h2>Past Interview Statistics</h2>
            <button onClick={() => navigate('/home')} className="back-button">
              ← Back to Home
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {sessions.length === 0 ? (
            <div className="no-interviews">
              <p>You haven't completed any interviews yet.</p>
              <button onClick={() => navigate('/home')} className="start-interview-button">
                Start Your First Interview
              </button>
            </div>
          ) : (
            <div className="sessions-list">
              {sessions.map((session) => {
                const totalTime = session.total_time_seconds || getTotalTimeFromStats(session.stage_statistics);
                const isCompleted = session.status === 'completed';
                
                return (
                  <div key={session.id} className="session-card">
                    <div className="session-header">
                      <div className="session-title-section">
                        <h3>{session.question_title}</h3>
                        <div className="session-meta">
                          <span className={`difficulty-badge ${session.difficulty.toLowerCase()}`}>
                            {session.difficulty}
                          </span>
                          {session.language && (
                            <span className="language-badge">{session.language}</span>
                          )}
                          <span className={`status-badge ${isCompleted ? 'completed' : 'in-progress'}`}>
                            {isCompleted ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleViewDetails(session.id)}
                        className="view-details-button"
                      >
                        View Details
                      </button>
                    </div>

                    <div className="session-info">
                      <div className="info-row">
                        <span className="info-label">Started:</span>
                        <span className="info-value">{formatDate(session.started_at)}</span>
                      </div>
                      {session.completed_at && (
                        <div className="info-row">
                          <span className="info-label">Completed:</span>
                          <span className="info-value">{formatDate(session.completed_at)}</span>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="info-label">Total Time:</span>
                        <span className="info-value time-value">{formatTime(totalTime)}</span>
                      </div>
                      {session.current_stage && (
                        <div className="info-row">
                          <span className="info-label">Final Stage:</span>
                          <span className="info-value">{getStageLabel(session.current_stage)}</span>
                        </div>
                      )}
                    </div>

                    {(Object.keys(session.stage_statistics || {}).length > 0 || session.total_time_seconds > 0) && (
                      <div className="session-stats-preview">
                        <h4>Stage Breakdown:</h4>
                        <div className="stage-preview-list">
                          {Object.keys(session.stage_statistics || {}).length > 0 ? (
                            Object.entries(session.stage_statistics)
                              .sort((a, b) => b[1] - a[1]) // Sort by time descending
                              .slice(0, 3) // Show top 3 stages
                              .map(([stage, time]) => (
                                <div key={stage} className="stage-preview-item">
                                  <span className="stage-name">{getStageLabel(stage)}</span>
                                  <span className="stage-time">{formatTime(time)}</span>
                                </div>
                              ))
                          ) : (
                            <div className="stage-preview-item">
                              <span className="stage-name">Total Time</span>
                              <span className="stage-time">{formatTime(session.total_time_seconds)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Test Results */}
                    {session.test_results && session.test_results.total > 0 && (
                      <div className="session-test-results">
                        <h4>Test Cases: <span className="test-passed">{session.test_results.passed}</span> passed / <span className="test-failed">{session.test_results.failed}</span> failed / <span className="test-total">{session.test_results.total}</span> total</h4>
                      </div>
                    )}

                      {/* Feedback Section */}
                    {isCompleted && session.feedback && (
                      <div className="session-feedback-preview">
                        <div 
                          className="feedback-preview-header"
                          onClick={() => setExpandedFeedback(expandedFeedback === session.id ? null : session.id)}
                        >
                          <h4>📝 Interview Feedback</h4>
                          <span className="feedback-toggle">
                            {expandedFeedback === session.id ? '▼' : '▶'}
                          </span>
                        </div>
                        {expandedFeedback === session.id && (
                          <div className="feedback-preview-content">
                            <div 
                              className="feedback-preview-text"
                              dangerouslySetInnerHTML={{ 
                                __html: (() => {
                                  let html = session.feedback;
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
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PastInterviews;

