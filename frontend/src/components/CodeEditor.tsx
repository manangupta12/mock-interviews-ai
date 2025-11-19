import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';
import './CodeEditor.css';

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (code: string) => void;
  onLanguageChange: (language: string) => void;
  disabled?: boolean;
}

const CodeEditor = ({ code, language, onChange, onLanguageChange, disabled }: CodeEditorProps) => {
  const languageMap: { [key: string]: string } = {
    python: 'python',
    javascript: 'javascript',
    java: 'java',
    cpp: 'c_cpp',
    c: 'c_cpp',
  };

  return (
    <div className={`code-editor-container ${disabled ? 'disabled' : ''}`}>
      <div className="code-editor-header">
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={disabled}
          className="language-selector"
        >
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>
      </div>
      <AceEditor
        mode={languageMap[language] || 'python'}
        theme="monokai"
        value={code}
        onChange={onChange}
        name="code-editor"
        editorProps={{ $blockScrolling: true }}
        width="100%"
        height="400px"
        fontSize={14}
        showPrintMargin={false}
        readOnly={disabled}
        setOptions={{
          enableBasicAutocompletion: !disabled,
          enableLiveAutocompletion: !disabled,
          enableSnippets: !disabled,
          showLineNumbers: true,
          tabSize: 2,
        }}
      />
      {disabled && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          pointerEvents: 'none',
          zIndex: 10,
          fontSize: '1rem',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          border: '2px solid rgba(255, 193, 7, 0.5)'
        }}>
          🔒 Code editor is locked
        </div>
      )}
    </div>
  );
};

export default CodeEditor;

