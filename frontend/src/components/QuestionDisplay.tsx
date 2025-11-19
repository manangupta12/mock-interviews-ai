import { Question } from '../contexts/InterviewContext';
import './QuestionDisplay.css';

interface QuestionDisplayProps {
  question: Question;
}

const QuestionDisplay = ({ question }: QuestionDisplayProps) => {
  return (
    <div className="question-display">
      <div className="question-header">
        <h2 className="question-title">{question.title}</h2>
        <span className={`difficulty-badge ${question.difficulty.toLowerCase()}`}>
          {question.difficulty}
        </span>
      </div>
      
      <div className="question-description">
        {question.description.split('\n').map((line, idx) => (
          <p key={idx}>{line}</p>
        ))}
      </div>

      {question.examples && question.examples.length > 0 && (
        <div className="question-examples">
          <h3>Examples:</h3>
          {question.examples.map((example, idx) => (
            <div key={idx} className="example">
              <div className="example-input">
                <strong>Input:</strong> <code>{example.input}</code>
              </div>
              <div className="example-output">
                <strong>Output:</strong> <code>{example.output}</code>
              </div>
              {example.explanation && (
                <div className="example-explanation">
                  <strong>Explanation:</strong> {example.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {question.constraints && (
        <div className="question-constraints">
          <h3>Constraints:</h3>
          <pre>{question.constraints}</pre>
        </div>
      )}
    </div>
  );
};

export default QuestionDisplay;

