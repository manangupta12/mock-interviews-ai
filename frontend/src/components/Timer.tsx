import { useEffect, useState } from 'react';
import './Timer.css';

interface TimerProps {
  startTime: Date | null;
  stage: string;
}

const Timer = ({ startTime, stage }: TimerProps) => {
  const [elapsed, setElapsed] = useState(0);

  // Stage time limits in seconds
  const getStageTimeLimit = (currentStage: string): number => {
    const limits: Record<string, number> = {
      'explanation': 10 * 60, // 10 minutes
      'coding': 30 * 60, // 30 minutes
      'followup': 10 * 60, // 10 minutes
      'complexity': 10 * 60, // 10 minutes
      'optimization': 10 * 60, // 10 minutes
      'complete': 0, // No limit
    };
    return limits[currentStage] || 0;
  };

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsed(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const maxTime = getStageTimeLimit(stage);
  const isOverTime = maxTime > 0 && elapsed > maxTime;
  const remainingTime = maxTime > 0 ? Math.max(0, maxTime - elapsed) : 0;

  return (
    <div className="timer-container">
      <div className="timer-label">Time Elapsed</div>
      <div className={`timer-display ${isOverTime ? 'overtime' : ''}`}>
        {formatTime(elapsed)}
      </div>
      {maxTime > 0 && (
        <div className="timer-limit">
          Max: {formatTime(maxTime)} | Remaining: {formatTime(remainingTime)}
        </div>
      )}
    </div>
  );
};

export default Timer;

