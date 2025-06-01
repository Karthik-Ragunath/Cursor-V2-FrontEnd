import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { executeCode } from '../services/api';

const EditorContainer = styled(Box)({
  flex: 1,
  height: '100vh',
  overflow: 'hidden',
  borderRight: '1px solid #2d2d2d',
  '&:last-child': {
    borderRight: 'none',
  },
  display: 'flex',
  flexDirection: 'column',
});

const ResultContainer = styled(Box)({
  padding: '8px',
  backgroundColor: '#1e1e1e',
  color: '#fff',
  fontFamily: 'monospace',
  whiteSpace: 'pre-wrap',
  maxHeight: '150px',
  overflowY: 'auto',
  borderTop: '1px solid #2d2d2d',
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  onError?: (error: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'javascript',
  onError,
}) => {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Execute code whenever language changes
    const notifyLanguageChange = async () => {
      try {
        const response = await executeCode({
          code: value,
          language: language,
        });

        if (response.error) {
          setError(response.error);
          onError?.(response.error);
        } else {
          setResult(response.result);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    notifyLanguageChange();
  }, [language, value, onError]);

  return (
    <EditorContainer>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={onChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
          }}
        />
      </Box>
      {(result || error) && (
        <ResultContainer>
          {error ? (
            <span style={{ color: '#ff6b6b' }}>Error: {error}</span>
          ) : (
            <span style={{ color: '#69db7c' }}>{result}</span>
          )}
        </ResultContainer>
      )}
    </EditorContainer>
  );
};

export default CodeEditor; 