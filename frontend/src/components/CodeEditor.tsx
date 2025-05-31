import React from 'react';
import Editor from '@monaco-editor/react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const EditorContainer = styled(Box)({
  flex: 1,
  height: '100vh',
  overflow: 'hidden',
  borderRight: '1px solid #2d2d2d',
  '&:last-child': {
    borderRight: 'none',
  },
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'javascript',
}) => {
  return (
    <EditorContainer>
      <Editor
        height="100%"
        defaultLanguage={language}
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
    </EditorContainer>
  );
};

export default CodeEditor; 