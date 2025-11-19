import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useInterview, InterviewStage } from '../contexts/InterviewContext';
import { useAuth } from '../contexts/AuthContext';
import { TranscriptionService } from '../services/transcription';
import api from '../services/api';
import VideoPreview from '../components/VideoPreview';
import QuestionDisplay from '../components/QuestionDisplay';
import Timer from '../components/Timer';
import ChatInterface from '../components/ChatInterface';
import CodeEditor from '../components/CodeEditor';
import Navbar from '../components/Navbar';
import './Interview.css';

const Interview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    sessionId,
    question,
    stage,
    messages,
    code,
    language,
    setSessionId,
    setQuestion,
    setStage,
    addMessage,
    setCode,
    setLanguage,
    setStartTime,
    reset,
  } = useInterview();
  const { logout } = useAuth();

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [codeEditorCollapsed, setCodeEditorCollapsed] = useState(false);
  const [executionResultsCollapsed, setExecutionResultsCollapsed] = useState(false);
  const [tabSwitchWarning, setTabSwitchWarning] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [videoPosition, setVideoPosition] = useState({ x: window.innerWidth - 250, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [stageStartTime, setStageStartTime] = useState<Date | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [stageTimes, setStageTimes] = useState<Record<string, number>>({});
  const [screenRecording, setScreenRecording] = useState<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLDivElement>(null);
  const videoPreviewHandleRef = useRef<{ stopStream: () => void } | null>(null);
  const transcriptionServiceRef = useRef<TranscriptionService | null>(null);
  const previousStageRef = useRef<InterviewStage>('explanation');
  const switchDetectedRef = useRef<boolean>(false);
  const screenRecordingStartedRef = useRef<boolean>(false); // Track if screen recording has been started
  const welcomeMessageAddedRef = useRef<boolean>(false); // Track if welcome message has been added

  // Define screen recording functions before useEffect
  const startScreenRecording = async () => {
    // Prevent multiple calls - check and set atomically
    if (screenRecordingStartedRef.current) {
      console.log('Screen recording already started or in progress, skipping...');
      return;
    }
    
    // Set the flag immediately to prevent race conditions from React StrictMode
    screenRecordingStartedRef.current = true;
    
    try {
      console.log('Requesting screen capture...');
      // Request screen capture
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      } as MediaStreamConstraints);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(displayStream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });

      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Recording stopped - discard the data for now until S3 is implemented
        console.log('Screen recording stopped and discarded (S3 storage not yet implemented)');
        
        // Stop all tracks
        displayStream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setScreenRecording(mediaRecorder);
      
      // Handle if user stops sharing screen
      displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      });
    } catch (error) {
      console.error('Failed to start screen recording:', error);
      // Reset flag if screen recording fails so user can try again
      screenRecordingStartedRef.current = false;
      // Don't block interview if recording fails
    }
  };

  const stopScreenRecording = () => {
    if (screenRecording && screenRecording.state !== 'inactive') {
      screenRecording.stop();
      setScreenRecording(null);
    }
    screenRecordingStartedRef.current = false;
  };

  useEffect(() => {
    // Initialize from location state
    if (location.state?.sessionId && location.state?.question) {
      setSessionId(location.state.sessionId);
      setQuestion(location.state.question);
      const now = new Date();
      setStartTime(now);
      setStageStartTime(now); // Initialize stage start time
      
      // Start screen recording - use setTimeout to avoid React StrictMode double execution
      // This ensures only one prompt appears even in development mode
      const timer = setTimeout(() => {
        if (!screenRecordingStartedRef.current) {
          startScreenRecording();
        }
      }, 100);
      
      // Add welcome message when interview starts - only once to avoid React StrictMode duplicate
      if (!welcomeMessageAddedRef.current) {
        welcomeMessageAddedRef.current = true;
        addMessage({
          speaker: 'interviewer',
          message: 'Welcome! The interview has started. You are now in the Explanation Stage. Please explain your approach to solve the given problem. You can type your explanation in the chat or use the "Start Speaking" button to explain verbally.',
          timestamp: now,
        });
      }
      
      // Cleanup timer if component unmounts before it fires
      return () => clearTimeout(timer);
    } else {
      navigate('/home');
    }

    // Initialize transcription service
    transcriptionServiceRef.current = new TranscriptionService();

    return () => {
      if (transcriptionServiceRef.current) {
        transcriptionServiceRef.current.stop();
      }
      // Stop screen recording and webcam on unmount
      stopScreenRecording();
      if (videoPreviewHandleRef.current) {
        videoPreviewHandleRef.current.stopStream();
      }
      reset();
    };
  }, [stage, sessionId]);

  // Tab switch detection - separate useEffect to ensure it always runs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !switchDetectedRef.current && stage !== 'complete') {
        // Tab switched or window minimized
        switchDetectedRef.current = true;
        console.log('Tab switch detected!');
        
        setTabSwitchCount(prev => prev + 1);
        setTabSwitchWarning(true);
      } else if (!document.hidden) {
        // Tab is visible again, reset the flag
        switchDetectedRef.current = false;
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    console.log('Tab switch detection enabled');

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stage]); // Only depend on stage to check if interview is complete

  // Beforeunload warning - separate useEffect
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (stage !== 'complete' && sessionId) {
        e.preventDefault();
        e.returnValue = 'Your interview is still in progress. Are you sure you want to leave? Your progress will be lost.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [stage, sessionId]);

  // Play chime sound for new messages
  const playChimeSound = () => {
    try {
      // Create audio context and play a chime sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a pleasant chime sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play chime sound:', error);
    }
  };

  // Read message aloud using text-to-speech
  const readMessageAloud = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Try to use a more natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Samantha') || 
        voice.name.includes('Alex')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Video preview drag handlers
  const handleVideoMouseDown = (e: React.MouseEvent) => {
    if (videoPreviewRef.current) {
      const rect = videoPreviewRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
      e.preventDefault();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setVideoPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Watch for stage changes and stop recording/webcam when interview ends
  useEffect(() => {
    if (stage === 'complete') {
      // Stop screen recording
      stopScreenRecording();
      // Stop webcam
      if (videoPreviewHandleRef.current) {
        videoPreviewHandleRef.current.stopStream();
      }
    }
  }, [stage]);

  const handleStartRecording = () => {
    if (!transcriptionServiceRef.current?.isSupported()) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    setIsRecording(true);
    setTranscript('');
    transcriptionServiceRef.current.start((text) => {
      setTranscript(text);
    });
  };

  const handleStopRecording = async () => {
    if (transcriptionServiceRef.current) {
      transcriptionServiceRef.current.stop();
      setIsRecording(false);

      if (transcript.trim()) {
        const transcriptText = transcript.trim();
        setTranscript(''); // Clear transcript immediately
        await sendMessage(transcriptText);
      }
    }
  };

  const sendMessage = async (message: string) => {
    if (!sessionId || !message.trim()) return;

    const userMessage = message.trim();
    
    // Add user message immediately for instant feedback
    addMessage({ speaker: 'user', message: userMessage, timestamp: new Date() });

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/interviews/chat', {
        session_id: sessionId,
        message: userMessage,
      });

      // Add AI response after receiving it
      const aiMessage = {
        speaker: 'interviewer' as const,
        message: response.data.message,
        timestamp: new Date(),
      };
      addMessage(aiMessage);
      
      // Play chime sound for new AI message
      playChimeSound();
      
      // Read message aloud if TTS is enabled
      if (ttsEnabled) {
        readMessageAloud(response.data.message);
      }

      const nextStage = response.data.next_stage as InterviewStage;
      
      // Track time spent in previous stage BEFORE changing stages
      if (stage !== nextStage && stageStartTime) {
        const timeSpent = Math.floor((new Date().getTime() - stageStartTime.getTime()) / 1000);
        if (timeSpent > 0) {
          setStageTimes(prev => {
            const updated = {
              ...prev,
              [stage]: (prev[stage] || 0) + timeSpent
            };
            console.log(`Stage ${stage} time tracked: ${timeSpent}s. Updated stageTimes:`, updated);
            return updated;
          });
          previousStageRef.current = stage;
        }
      }
      
      // Reset stage timer when stage changes
      if (nextStage !== stage) {
        const newStageStartTime = new Date();
        setStageStartTime(newStageStartTime);
        console.log(`Stage changed from ${stage} to ${nextStage} at ${newStageStartTime.toISOString()}`);
      }
      setStage(nextStage);

          // If stage is complete, save statistics and navigate to stats page
          if (nextStage === 'complete') {
            // Track final stage time
            if (stageStartTime) {
              const timeSpent = Math.floor((new Date().getTime() - stageStartTime.getTime()) / 1000);
              if (timeSpent > 0) {
                setStageTimes(prev => {
                  const updated = {
                    ...prev,
                    [stage]: (prev[stage] || 0) + timeSpent
                  };
                  console.log(`Final stage ${stage} time tracked: ${timeSpent}s. Final stageTimes:`, updated);
                  return updated;
                });
              }
            }
            
            // Get the latest stageTimes before saving
            const finalStageTimes = stageTimes;
            
            // Stop screen recording and webcam IMMEDIATELY before any async operations
            console.log('Interview complete - stopping screen recording and webcam NOW');
            if (screenRecording && screenRecording.state !== 'inactive') {
              console.log('Stopping screen recording directly...');
              screenRecording.stop();
            }
            if (videoPreviewHandleRef.current) {
              console.log('Stopping webcam stream directly...');
              videoPreviewHandleRef.current.stopStream();
            }
            
            // Save statistics and navigate
            setTimeout(async () => {
              await saveStatistics();
              
              // Navigate to stats
              setTimeout(() => {
                reset();
                navigate('/interview-stats', { state: { sessionId, stageTimes: finalStageTimes } });
              }, 100);
            }, 300);
          }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send message');
      // Optionally remove the user message if there was an error
      // Or keep it and show error message
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!sessionId || !code.trim()) return;

    setLoading(true);
    setError('');

    try {
      await api.post('/api/interviews/submit-code', {
        session_id: sessionId,
        code: code.trim(),
        language: language,
      });

      await sendMessage('I have completed coding the solution.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit code');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteCode = async () => {
    if (!sessionId || !code.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/interviews/execute-code', {
        session_id: sessionId,
        code: code.trim(),
        language: language,
      });

      setExecutionResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to execute code');
    } finally {
      setLoading(false);
    }
  };

  if (!question || !sessionId) {
    return <div>Loading interview...</div>;
  }

  // Code editor is always visible but disabled until coding stage
  const canCode = true; // Always show code editor
  const canEditCode = stage === 'coding'; // Can ONLY edit during coding stage
  const canSubmit = stage === 'coding'; // Can only submit during coding stage

  const getStageLabel = (currentStage: InterviewStage) => {
    const stageLabels: Record<InterviewStage, string> = {
      'explanation': 'Explanation Stage',
      'coding': 'Coding Stage',
      'followup': 'Follow-up Questions',
      'complexity': 'Complexity Analysis',
      'optimization': 'Optimization',
      'complete': 'Interview Complete'
    };
    return stageLabels[currentStage] || 'Interview';
  };

  const saveStatistics = async () => {
    if (!sessionId) return;
    
    // Stop screen recording before saving statistics
    stopScreenRecording();
    
    // Wait a bit for recording to finish processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Use the current stageTimes state
    const currentStageTimes = stageTimes;
    console.log('Saving statistics with stageTimes:', currentStageTimes);
    
    try {
      await api.post('/api/interviews/save-statistics', {
        session_id: sessionId,
        stage_times: currentStageTimes,
      });
      console.log('Statistics saved successfully');
    } catch (error) {
      console.error('Failed to save statistics:', error);
    }
  };

  const getStageOrder = (): InterviewStage[] => {
    return ['explanation', 'coding', 'followup', 'complexity', 'optimization', 'complete'];
  };

  const getCurrentStageIndex = (): number => {
    const index = getStageOrder().indexOf(stage);
    // If stage not found, return -1 to handle edge cases
    return index >= 0 ? index : 0;
  };

  const handleEndInterview = async () => {
    if (window.confirm('Are you sure you want to end the interview? This action cannot be undone.')) {
      // Track final stage time if still in progress
      let finalStageTimes = { ...stageTimes };
      if (stageStartTime && stage !== 'complete') {
        const timeSpent = Math.floor((new Date().getTime() - stageStartTime.getTime()) / 1000);
        if (timeSpent > 0) {
          finalStageTimes = {
            ...finalStageTimes,
            [stage]: (finalStageTimes[stage] || 0) + timeSpent
          };
          setStageTimes(finalStageTimes);
        }
      }
      
      // Stop screen recording and webcam IMMEDIATELY - synchronously, before any async operations
      console.log('End interview clicked - stopping screen recording and webcam NOW');
      if (screenRecording && screenRecording.state !== 'inactive') {
        console.log('Stopping screen recording directly...');
        screenRecording.stop();
      }
      if (videoPreviewHandleRef.current) {
        console.log('Stopping webcam stream directly...');
        videoPreviewHandleRef.current.stopStream();
      }
      
      // Save statistics with the final stage times
      try {
        await api.post('/api/interviews/save-statistics', {
          session_id: sessionId,
          stage_times: finalStageTimes,
        });
        console.log('Statistics saved successfully on end interview');
      } catch (error) {
        console.error('Failed to save statistics:', error);
      }
      
      // Mark as complete and navigate to stats
      reset();
      navigate('/interview-stats', { state: { sessionId, stageTimes: finalStageTimes } });
    }
  };

  const handleLogoClick = () => {
    if (stage !== 'complete' && sessionId) {
      const confirmed = window.confirm(
        'Your interview is still in progress. Are you sure you want to leave? Your progress may be lost.'
      );
      return confirmed;
    }
    return true;
  };

  return (
    <div className="interview-container">
      <div className="navbar-wrapper">
        <Navbar showLogout={false} onLogoClick={handleLogoClick} />
        <div className="navbar-overlays">
          <div className="interview-stage-badge">
            {getStageLabel(stage)}
          </div>
          {stageStartTime && (
            <div className="timer-overlay">
              <Timer startTime={stageStartTime} stage={stage} />
            </div>
          )}
          <button onClick={logout} className="logout-button-overlay">
            Logout
          </button>
        </div>
      </div>

      {/* Stage Flow Diagram */}
      <div className="stage-flow-wrapper">
        <div className="stage-flow-container">
          {getStageOrder().slice(0, -1).map((stageName, index) => {
            const currentStageIndex = getCurrentStageIndex();
            const stageNameIndex = getStageOrder().indexOf(stageName);
            
            // Determine stage status
            const isCurrent = stageName === stage;
            const isCompleted = currentStageIndex > stageNameIndex;
            
            // Determine CSS classes - priority: current > completed > upcoming
            let dotClasses = 'stage-flow-dot';
            if (isCurrent) {
              dotClasses += ' current';
            } else if (isCompleted) {
              dotClasses += ' completed';
            } else {
              dotClasses += ' upcoming';
            }
            
            return (
              <div key={stageName} className="stage-flow-item">
                <div className={dotClasses}>
                  {isCompleted && !isCurrent && '✓'}
                  {isCurrent && <div className="glow-effect"></div>}
                </div>
                <div className={`stage-flow-label ${isCurrent ? 'current' : ''}`}>
                  {getStageLabel(stageName)}
                </div>
                {index < getStageOrder().slice(0, -1).length - 1 && (
                  <div className={`stage-flow-arrow ${isCompleted || isCurrent ? 'completed' : ''}`}>→</div>
                )}
              </div>
            );
          })}
        </div>
        <button 
          onClick={handleEndInterview} 
          className="end-interview-button"
          disabled={stage === 'complete'}
        >
          🛑 End Interview
        </button>
      </div>

          {/* Movable Video Preview */}
          {stage !== 'complete' && (
            <div
              ref={videoPreviewRef}
              className="movable-video-preview"
              style={{
                left: `${videoPosition.x}px`,
                top: `${videoPosition.y}px`,
              }}
              onMouseDown={handleVideoMouseDown}
            >
              <VideoPreview ref={videoPreviewHandleRef} disabled={false} />
            </div>
          )}

      <div className="interview-content">
        <div className="interview-left">
          <div className="question-section">
            <QuestionDisplay question={question} />
          </div>
        </div>

        <div className="interview-right">
          <div className={`right-panel-grid ${
            chatCollapsed && !codeEditorCollapsed ? 'chat-collapsed' :
            codeEditorCollapsed && !chatCollapsed ? 'code-collapsed' :
            'both-expanded'
          }`}>
            <div className={`chat-section ${chatCollapsed ? 'collapsed' : ''}`}>
              <div className="section-header" onClick={() => setChatCollapsed(!chatCollapsed)}>
                <h3>Chat with Interviewer</h3>
                <button className="collapse-button">
                  {chatCollapsed ? '▼' : '▲'}
                </button>
              </div>
              {!chatCollapsed && (
                <div className="chat-content-wrapper">
                  <div className="chat-header-controls">
                    <label className="tts-toggle">
                      <input
                        type="checkbox"
                        checked={ttsEnabled}
                        onChange={(e) => {
                          setTtsEnabled(e.target.checked);
                          if (e.target.checked && messages.length > 0) {
                            const lastMessage = messages[messages.length - 1];
                            if (lastMessage.speaker === 'interviewer') {
                              readMessageAloud(lastMessage.message);
                            }
                          } else {
                            if ('speechSynthesis' in window) {
                              window.speechSynthesis.cancel();
                            }
                          }
                        }}
                      />
                      <span>🔊 Read Messages Aloud</span>
                    </label>
                  </div>
                  <ChatInterface
                    messages={messages}
                    onSendMessage={sendMessage}
                    isRecording={isRecording}
                    transcript={transcript}
                    disabled={loading || stage === 'complete'}
                  />

                  {stage !== 'complete' && (
                    <div className="recording-controls">
                      {!isRecording ? (
                        <button 
                          onClick={handleStartRecording} 
                          className="record-button"
                          disabled={loading}
                        >
                          🎤 Start Speaking
                        </button>
                      ) : (
                        <button onClick={handleStopRecording} className="stop-button">
                          ⏹ Stop Recording
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {canCode && (
              <div className={`code-section ${codeEditorCollapsed ? 'collapsed' : ''}`}>
                <div className="section-header" onClick={() => setCodeEditorCollapsed(!codeEditorCollapsed)}>
                  <h3>Code Editor</h3>
                  <button className="collapse-button">
                    {codeEditorCollapsed ? '▼' : '▲'}
                  </button>
                </div>
                {!codeEditorCollapsed && (
                  <>
                    {!canEditCode && stage === 'explanation' && (
                      <div className="code-editor-placeholder">
                        <p>Code editor will be enabled once you explain your approach and the interviewer approves.</p>
                      </div>
                    )}
                    <CodeEditor
                      code={code}
                      language={language}
                      onChange={setCode}
                      onLanguageChange={setLanguage}
                      disabled={stage !== 'coding'}
                    />
                    <div className="code-actions">
                      <button
                        onClick={handleExecuteCode}
                        disabled={loading || !code.trim() || !canEditCode}
                        className="execute-button"
                      >
                        Run Code
                      </button>
                      {canSubmit && (
                        <button
                          onClick={handleSubmitCode}
                          disabled={loading || !code.trim()}
                          className="submit-button"
                        >
                          Complete Coding
                        </button>
                      )}
                    </div>

                    {executionResult && (
                      <div className="execution-results">
                        <div className="execution-results-header" onClick={() => setExecutionResultsCollapsed(!executionResultsCollapsed)}>
                          <h4>Execution Results</h4>
                          <button className="collapse-button-small">
                            {executionResultsCollapsed ? '▼' : '▲'}
                          </button>
                        </div>
                        {!executionResultsCollapsed && (
                          <div className="execution-results-content">
                            <div className={`result-summary ${executionResult.all_passed ? 'passed' : 'failed'}`}>
                              {executionResult.passed_tests} / {executionResult.total_tests} test cases passed
                            </div>
                                <div className="test-results-container">
                                  {executionResult.results.map((result: any, idx: number) => (
                                    <div key={idx} className="test-result">
                                      <div className={`test-status ${result.passed ? 'passed' : 'failed'}`}>
                                        Test {result.test_case}: {result.passed ? '✓ Passed' : '✗ Failed'}
                                      </div>
                                      {result.error && (
                                        <div className="test-error">{result.error}</div>
                                      )}
                                      {result.actual_output !== undefined && (
                                        <div className="test-output">
                                          <strong>Input:</strong> {result.input || 'N/A'}<br/>
                                          <strong>Expected:</strong> {result.expected_output}<br/>
                                          <strong>Got:</strong> {result.actual_output}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          {stage === 'complete' && (
            <div className="completion-message">
              <h2>Interview Complete!</h2>
              <p>Thank you for completing the interview. Redirecting to home...</p>
            </div>
          )}
        </div>
      </div>

      {/* Tab Switch Warning Modal */}
      {tabSwitchWarning && (
        <div className="tab-switch-overlay" onClick={() => setTabSwitchWarning(false)}>
          <div className="tab-switch-warning" onClick={(e) => e.stopPropagation()}>
            <div className="warning-icon">⚠️</div>
            <h2>Tab Switch Detected</h2>
            <p>You have switched away from the interview tab.</p>
            <p className="warning-count">
              Tab switches detected: <strong>{tabSwitchCount}</strong>
            </p>
            <p className="warning-note">
              Please stay on this tab during the interview. Multiple tab switches may be flagged.
            </p>
            <button 
              className="warning-acknowledge"
              onClick={() => setTabSwitchWarning(false)}
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interview;

