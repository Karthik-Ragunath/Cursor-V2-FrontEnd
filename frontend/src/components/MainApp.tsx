import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Resizable } from 're-resizable';
import LeftPane from './LeftPane';
import CodeEditor from './CodeEditor';
import ComparisonEditors from './ComparisonEditors';
import LoadingBar from './LoadingBar';
import type { PromptHistoryEntry } from './Logger';

const AppContainer = styled(Box)({
  display: 'flex',
  width: '100%',
  height: '100vh',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at center, rgba(96, 239, 255, 0.03) 0%, rgba(0, 255, 135, 0.02) 100%)',
    pointerEvents: 'none'
  }
});

const EditorsSection = styled(Box)({
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
  position: 'relative',
  transition: 'all 0.3s ease-in-out',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, #00ff87 0%, #60efff 100%)',
    opacity: 0.2
  }
});

const MainEditorContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: 'rgba(30, 30, 30, 0.6)',
  backdropFilter: 'blur(10px)',
  transition: 'width 0.3s ease-in-out'
});

const ResizeHandle = styled(Box)({
  width: '4px',
  cursor: 'col-resize',
  background: 'linear-gradient(180deg, #00ff87 0%, #60efff 100%)',
  opacity: 0.2,
  transition: 'opacity 0.3s ease',
  '&:hover': {
    opacity: 0.4,
  },
});

const EditorTitle = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(2),
  color: '#ffffff',
  borderBottom: '1px solid rgba(96, 239, 255, 0.1)',
  height: '64px',
  display: 'flex',
  alignItems: 'center',
  fontSize: '1.1rem',
  fontWeight: 500,
  letterSpacing: '0.5px',
  background: 'linear-gradient(90deg, rgba(0, 255, 135, 0.1) 0%, rgba(96, 239, 255, 0.1) 100%)',
  backdropFilter: 'blur(10px)',
}));

const ErrorBox = styled(Box)({
  padding: '8px 16px',
  backgroundColor: 'rgba(255, 0, 0, 0.1)',
  color: '#ff6b6b',
  fontSize: '0.875rem',
  borderLeft: '3px solid #ff6b6b',
  margin: '8px',
  borderRadius: '4px',
  backdropFilter: 'blur(10px)',
});

const MainApp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [firstDropdownValue, setFirstDropdownValue] = useState('html');
  const [secondRadioValue, setSecondRadioValue] = useState('none');
  const [codes, setCodes] = useState<string[]>(Array(4).fill(''));
  const [prompt, setPrompt] = useState('');
  const [currentEditorIndex, setCurrentEditorIndex] = useState(0);
  const [mainEditorWidth, setMainEditorWidth] = useState(window.innerWidth - 250);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryEntry[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [wsError, setWsError] = useState<string | null>(null);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const totalWidth = window.innerWidth - 250; // Left pane width
      if (secondRadioValue === 'none' || !firstDropdownValue) {
        setMainEditorWidth(totalWidth);
      } else {
        const numComparisons = parseInt(secondRadioValue);
        const minComparisonWidth = 400; // Minimum width per comparison editor
        const minMainWidth = 400; // Minimum width for main editor
        const totalMinWidth = minMainWidth + (numComparisons * minComparisonWidth);
        
        if (totalWidth >= totalMinWidth) {
          // If we have enough space, distribute proportionally
          setMainEditorWidth(Math.max(minMainWidth, totalWidth * 0.4)); // Main editor gets 40% of space
        } else {
          // If not enough space, maintain minimum widths and allow scroll
          setMainEditorWidth(minMainWidth);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call once on mount
    return () => window.removeEventListener('resize', handleResize);
  }, [secondRadioValue, firstDropdownValue]);

  // Initialize WebSocket connection with loading state
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: number;
    let pingInterval: number;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 3000;
    
    const connectWebSocket = () => {
      try {
        const newWs = new WebSocket('ws://localhost:8000/ws');
        ws = newWs;
        
        newWs.onopen = () => {
          console.log('Connected to WebSocket');
          setWsError(null);
          reconnectAttempts = 0;
          
          pingInterval = window.setInterval(() => {
            if (newWs?.readyState === WebSocket.OPEN) {
              newWs.send('ping');
            }
          }, 30000);
          
          newWs.send('get_history');
        };

        newWs.onmessage = (event) => {
          try {
            if (event.data === 'pong') {
              return; // Ignore pong responses
            }
            
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

        newWs.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsError('WebSocket connection error');
        };

        newWs.onclose = () => {
          console.log('Disconnected from WebSocket');
          clearInterval(pingInterval);
          
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            setWsError(`WebSocket disconnected, attempting to reconnect... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
            reconnectTimeout = window.setTimeout(connectWebSocket, RECONNECT_DELAY);
          } else {
            setWsError('WebSocket disconnected. Maximum reconnection attempts reached. Please refresh the page.');
          }
        };

        setWs(newWs);
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setWsError('Failed to create WebSocket connection');
        setIsLoading(false);
        
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          reconnectTimeout = window.setTimeout(connectWebSocket, RECONNECT_DELAY);
        }
      }
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(pingInterval);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // Fetch initial history with loading state
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
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
    handleCodeChange(0)(entry.code);
    setSecondRadioValue('none');
  };

  const handleCodeChange = (index: number) => (newValue: string | undefined) => {
    setCodes(prevCodes => {
      const newCodes = [...prevCodes];
      newCodes[index] = newValue || '';
      return newCodes;
    });
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
      {isLoading && <LoadingBar />}
      <LeftPane
        firstDropdownValue={firstDropdownValue}
        secondRadioValue={secondRadioValue}
        onFirstDropdownChange={(value) => {
          setFirstDropdownValue(value);
        }}
        onSecondRadioChange={(value) => {
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
            <ErrorBox>
              {wsError}
            </ErrorBox>
          )}
          <Box sx={{ display: 'flex', flex: 1 }}>
            <Resizable
              size={{ width: mainEditorWidth, height: '100%' }}
              onResizeStop={(e, direction, ref, d) => {
                const newWidth = Math.max(400, mainEditorWidth + d.width);
                const maxWidth = secondRadioValue === 'none' ? 
                  window.innerWidth - 250 : 
                  window.innerWidth - (parseInt(secondRadioValue) * 400) - 250;
                setMainEditorWidth(Math.min(newWidth, maxWidth));
              }}
              minWidth={400}
              maxWidth={secondRadioValue === 'none' ? 
                window.innerWidth - 250 : 
                window.innerWidth - (parseInt(secondRadioValue) * 400) - 250}
              enable={{ right: secondRadioValue !== 'none' }}
              handleComponent={{ right: resizeHandle }}
            >
              <MainEditorContainer>
                <EditorTitle variant="subtitle1">Current Workspace</EditorTitle>
                <CodeEditor
                  value={codes[0] || ''}
                  onChange={(newValue) => {
                    handleCodeChange(0)(newValue);
                  }}
                  language={firstDropdownValue}
                />
              </MainEditorContainer>
            </Resizable>
            {secondRadioValue !== 'none' && (
              <Box sx={{ 
                display: 'flex', 
                flex: 1,
                minWidth: secondRadioValue === '1' ? '400px' : `${parseInt(secondRadioValue) * 400}px`,
                transition: 'all 0.3s ease-in-out',
                overflow: 'auto'
              }}>
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
              </Box>
            )}
          </Box>
        </Box>
      </EditorsSection>
    </AppContainer>
  );
};

export default MainApp; 