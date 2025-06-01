import { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { Resizable } from 're-resizable'
import LeftPane from './components/LeftPane'
import CodeEditor from './components/CodeEditor'
import ComparisonEditors from './components/ComparisonEditors'
import type { PromptHistoryEntry } from './components/Logger'

const AppContainer = styled(Box)({
  display: 'flex',
  width: '100%',
  height: '100vh',
  overflow: 'hidden',
})

const EditorsSection = styled(Box)({
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
})

const MainEditorContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
})

const ResizeHandle = styled(Box)({
  width: '4px',
  cursor: 'col-resize',
  backgroundColor: '#2d2d2d',
  '&:hover': {
    backgroundColor: '#4d4d4d',
  },
})

const EditorTitle = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: '#2d2d2d',
  color: 'white',
  borderBottom: '1px solid #3d3d3d',
  height: '64px',
  display: 'flex',
  alignItems: 'center',
}))

function App() {
  const [firstDropdownValue, setFirstDropdownValue] = useState('html')
  const [secondRadioValue, setSecondRadioValue] = useState('none')
  const [codes, setCodes] = useState<string[]>(Array(4).fill(''))
  const [prompt, setPrompt] = useState('')
  const [currentEditorIndex, setCurrentEditorIndex] = useState(0)
  const [mainEditorWidth, setMainEditorWidth] = useState(window.innerWidth - 250)
  const [promptHistory, setPromptHistory] = useState<PromptHistoryEntry[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [wsError, setWsError] = useState<string | null>(null)

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const totalWidth = window.innerWidth - 250;
      if (secondRadioValue === 'none' || !firstDropdownValue) {
        setMainEditorWidth(totalWidth);
      } else {
        const numComparisons = parseInt(secondRadioValue);
        setMainEditorWidth(Math.max(300, totalWidth / (numComparisons + 1)));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [secondRadioValue, firstDropdownValue]);

  // Initialize WebSocket connection
  useEffect(() => {
    let reconnectTimeout: number;
    
    const connectWebSocket = () => {
      try {
        const websocket = new WebSocket('ws://localhost:8000/ws');
        
        websocket.onopen = () => {
          console.log('Connected to WebSocket');
          setWsError(null);
          // Request initial history
          websocket.send('get_history');
        };

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'history_update' && Array.isArray(data.data)) {
              console.log('Received history update:', data.data);
              setPromptHistory(data.data);
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
            setWsError('Failed to process WebSocket message');
          }
        };

        websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsError('WebSocket connection error');
        };

        websocket.onclose = () => {
          console.log('Disconnected from WebSocket');
          setWsError('WebSocket disconnected, attempting to reconnect...');
          reconnectTimeout = window.setTimeout(connectWebSocket, 5000);
        };

        return websocket;
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setWsError('Failed to create WebSocket connection');
        reconnectTimeout = window.setTimeout(connectWebSocket, 5000);
        return null;
      }
    };

    const websocket = connectWebSocket();
    if (websocket) {
      setWs(websocket);
    }

    return () => {
      window.clearTimeout(reconnectTimeout);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // Fetch initial history when component mounts
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('http://localhost:8000/prompt-history');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.history && Array.isArray(data.history)) {
          setPromptHistory(data.history);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
      }
    };

    fetchHistory();
  }, []);

  const clearHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/clear-history', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setPromptHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const restorePrompt = (entry: PromptHistoryEntry) => {
    setFirstDropdownValue(entry.language);
    setPrompt(entry.prompt);
    // Restore the code to main editor
    handleCodeChange(0)(entry.code);
    // Reset comparison view
    setSecondRadioValue('none');
  };

  useEffect(() => {
    const totalWidth = window.innerWidth - 250;
    if (secondRadioValue === 'none' || !firstDropdownValue) {
      setMainEditorWidth(totalWidth);
    } else {
      const numComparisons = parseInt(secondRadioValue);
      setMainEditorWidth(Math.max(300, totalWidth / (numComparisons + 1)));
    }
  }, [secondRadioValue, firstDropdownValue]);

  const handleCodeChange = (index: number) => (newValue: string | undefined) => {
    const newCodes = [...codes];
    newCodes[index] = newValue || '';
    setCodes(newCodes);
  };

  const handleEditorSelect = (index: number) => {
    const newCodes = [...codes];
    const temp = newCodes[0] || '';
    newCodes[0] = newCodes[index] || '';
    newCodes[index] = temp;
    setCodes(newCodes);
    setCurrentEditorIndex(index);
    setSecondRadioValue('none');
  };

  const resizeHandle = secondRadioValue !== 'none' ? <ResizeHandle /> : undefined;

  return (
    <AppContainer>
      <LeftPane
        firstDropdownValue={firstDropdownValue}
        secondRadioValue={secondRadioValue}
        onFirstDropdownChange={setFirstDropdownValue}
        onSecondRadioChange={(value) => {
          // Allow 'none', '1', or '2' as values
          if (value === 'none' || value === '1' || value === '2') {
            setSecondRadioValue(value);
          }
        }}
        history={promptHistory}
        onClearHistory={clearHistory}
        onRestorePrompt={restorePrompt}
      />
      <EditorsSection>
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {wsError && (
            <Box sx={{ 
              padding: 1, 
              backgroundColor: 'rgba(255, 0, 0, 0.1)', 
              color: '#ff6b6b',
              fontSize: '0.875rem'
            }}>
              {wsError}
            </Box>
          )}
          <Box sx={{ display: 'flex', flex: 1 }}>
            <Resizable
              size={{ width: mainEditorWidth, height: '100%' }}
              onResizeStop={(e, direction, ref, d) => {
                setMainEditorWidth(Math.max(300, mainEditorWidth + d.width));
              }}
              minWidth={300}
              maxWidth={secondRadioValue === 'none' ? window.innerWidth - 250 : window.innerWidth - 550}
              enable={{ right: secondRadioValue !== 'none' }}
              handleComponent={{ right: resizeHandle }}
            >
              <MainEditorContainer>
                <EditorTitle variant="subtitle1">Current Editor</EditorTitle>
                <CodeEditor
                  value={codes[0] || ''}
                  onChange={handleCodeChange(0)}
                  language={firstDropdownValue}
                />
              </MainEditorContainer>
            </Resizable>
            {secondRadioValue !== 'none' && (
              <ComparisonEditors
                count={parseInt(secondRadioValue)}
                codes={codes}
                onCodeChange={handleCodeChange}
                prompt={prompt}
                onPromptChange={setPrompt}
                onEditorSelect={handleEditorSelect}
                secondRadioValue={secondRadioValue}
                onSecondRadioChange={setSecondRadioValue}
                remainingWidth={window.innerWidth - 250 - mainEditorWidth}
                firstDropdownValue={firstDropdownValue}
              />
            )}
          </Box>
        </Box>
      </EditorsSection>
    </AppContainer>
  );
}

export default App
