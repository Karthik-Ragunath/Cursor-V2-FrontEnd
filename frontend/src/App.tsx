import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import LeftPane from './components/LeftPane';
import ComparisonEditors from './components/ComparisonEditors';
import { notifyComparisonCount } from './services/api';
import type { PromptHistoryEntry } from './components/Logger';

const AppContainer = styled(Box)({
  display: 'flex',
  height: '100vh',
  backgroundColor: '#1e1e1e',
  overflow: 'hidden',
});

const MainContent = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

function App() {
  const [firstDropdownValue, setFirstDropdownValue] = useState<string>('html');
  const [secondRadioValue, setSecondRadioValue] = useState<string>('none');
  const [codes, setCodes] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [history, setHistory] = useState<PromptHistoryEntry[]>([]);

  const calculateCount = () => {
    switch (secondRadioValue) {
      case '1':
        return 2;
      case '2':
        return 3;
      default:
        return 1;
    }
  };

  const count = calculateCount();

  useEffect(() => {
    const newCodes = Array(count).fill('');
    setCodes(newCodes);
  }, [count]);

  useEffect(() => {
    notifyComparisonCount(count);
  }, [count]);

  const handleCodeChange = (index: number) => (value: string | undefined) => {
    setCodes(prev => {
      const newCodes = [...prev];
      newCodes[index] = value || '';
      return newCodes;
    });
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
  };

  const handleEditorSelect = (index: number) => {
    console.log(`Editor ${index} selected`);
  };

  const handleFirstDropdownChange = (value: string) => {
    setFirstDropdownValue(value);
  };

  const handleSecondRadioChange = (value: string) => {
    setSecondRadioValue(value);
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleRestorePrompt = (entry: PromptHistoryEntry) => {
    setPrompt(entry.prompt);
    setFirstDropdownValue(entry.language);
  };

  const remainingWidth = window.innerWidth - 250; // 250px is the width of LeftPane

  return (
    <AppContainer>
      <LeftPane
        firstDropdownValue={firstDropdownValue}
        secondRadioValue={secondRadioValue}
        onFirstDropdownChange={handleFirstDropdownChange}
        onSecondRadioChange={handleSecondRadioChange}
        history={history}
        onClearHistory={handleClearHistory}
        onRestorePrompt={handleRestorePrompt}
      />
      <MainContent>
        <ComparisonEditors
          count={count}
          codes={codes}
          onCodeChange={handleCodeChange}
          prompt={prompt}
          onPromptChange={handlePromptChange}
          onEditorSelect={handleEditorSelect}
          secondRadioValue={secondRadioValue}
          onSecondRadioChange={handleSecondRadioChange}
          remainingWidth={remainingWidth}
          firstDropdownValue={firstDropdownValue}
        />
      </MainContent>
    </AppContainer>
  );
}

export default App;
