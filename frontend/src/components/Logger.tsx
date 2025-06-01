import React from 'react';
import { Box, Typography, IconButton, List, ListItem, Paper, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import HistoryIcon from '@mui/icons-material/History';

const LoggerContainer = styled(Paper)(({ theme }) => ({
  backgroundColor: '#1e1e1e',
  color: '#fff',
  padding: theme.spacing(1),
  marginTop: theme.spacing(2),
  maxHeight: '300px',
  overflow: 'auto',
  border: '1px solid #3d3d3d',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#2d2d2d',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#4d4d4d',
    borderRadius: '4px',
  },
}));

const HistoryEntry = styled(ListItem)(({ theme }) => ({
  padding: theme.spacing(0.5, 1),
  borderBottom: '1px solid #3d3d3d',
  fontSize: '12px',
  fontFamily: 'monospace',
  display: 'flex',
  alignItems: 'flex-start',
  '&:last-child': {
    borderBottom: 'none',
  },
}));

const LogHeader = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
});

export interface PromptHistoryEntry {
  timestamp: string;
  prompt: string;
  language: string;
  model: string;
  code: string;
  description: string;
}

interface LoggerProps {
  history: PromptHistoryEntry[];
  onClear: () => void;
  onRestore: (entry: PromptHistoryEntry) => void;
}

const Logger: React.FC<LoggerProps> = ({ history, onClear, onRestore }) => {
  return (
    <Box>
      <LogHeader>
        <Typography variant="subtitle2" sx={{ color: '#fff' }}>
          Prompt History
        </Typography>
        <Box>
          <Tooltip title="Clear History">
            <IconButton size="small" onClick={onClear} sx={{ color: '#9d9d9d' }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </LogHeader>
      <LoggerContainer>
        <List dense disablePadding>
          {history.map((entry, index) => (
            <HistoryEntry key={`${entry.timestamp}-${index}`}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                <HistoryIcon fontSize="small" sx={{ color: '#4dabf7', marginRight: 1 }} />
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#9d9d9d' }}>
                      {entry.timestamp}
                    </Typography>
                    <Tooltip title="Restore this prompt">
                      <IconButton 
                        size="small" 
                        onClick={() => onRestore(entry)}
                        sx={{ color: '#69db7c', padding: '2px' }}
                      >
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: '#fff'
                    }}
                  >
                    Language: {entry.language}
                    {entry.prompt && (
                      <>
                        <br />
                        Prompt: {entry.prompt.length > 50 ? `${entry.prompt.substring(0, 50)}...` : entry.prompt}
                      </>
                    )}
                    <br />
                    Model: {entry.model}
                  </Typography>
                </Box>
              </Box>
            </HistoryEntry>
          ))}
          {history.length === 0 && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#9d9d9d',
                textAlign: 'center',
                padding: 2
              }}
            >
              No prompt history available
            </Typography>
          )}
        </List>
      </LoggerContainer>
    </Box>
  );
};

export default Logger; 