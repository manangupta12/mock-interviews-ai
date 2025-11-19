import { useState, useEffect, useRef } from 'react';
import { Message } from '../contexts/InterviewContext';
import './ChatInterface.css';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isRecording: boolean;
  transcript: string;
  disabled?: boolean;
}

const ChatInterface = ({ messages, onSendMessage, isRecording, transcript, disabled }: ChatInterfaceProps) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !disabled) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.speaker}`}>
            <div className="message-header">
              <strong>{msg.speaker === 'user' ? 'You' : 'Interviewer'}</strong>
            </div>
            <div className="message-content">{msg.message}</div>
          </div>
        ))}
        {isRecording && transcript && (
          <div className="message user interim">
            <div className="message-header">
              <strong>You (speaking...)</strong>
            </div>
            <div className="message-content">{transcript}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={disabled ? "Please wait for interviewer..." : "Type your message..."}
          disabled={disabled}
          className="chat-input"
        />
        <button type="submit" disabled={disabled || !inputMessage.trim()} className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;

