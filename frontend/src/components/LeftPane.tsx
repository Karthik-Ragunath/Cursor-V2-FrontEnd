import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Typography, IconButton, TextField } from '@mui/material';
import { styled } from '@mui/material/styles';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Logger from './Logger';
import type { PromptHistoryEntry as PromptHistoryEntryType } from './Logger';

const Container = styled(Box)({
  width: '250px',
  height: '100vh',
  background: 'linear-gradient(180deg, #1e1e1e 0%, #2d2d2d 100%)',
  borderRight: '1px solid rgba(96, 239, 255, 0.1)',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const ScrollableSection = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'rgba(45, 45, 45, 0.5)',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'linear-gradient(180deg, #00ff87 0%, #60efff 100%)',
    borderRadius: '4px',
    opacity: 0.3,
    '&:hover': {
      opacity: 0.5,
    },
  },
});

const StyledFormControl = styled(FormControl)({
  marginBottom: '20px',
  width: '100%',
});

const ComparisonControl = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  background: 'rgba(45, 45, 45, 0.5)',
  borderRadius: '8px',
  border: '1px solid rgba(96, 239, 255, 0.1)',
}));

const ArrowButton = styled(IconButton)(({ theme }) => ({
  padding: '4px',
  color: '#fff',
  background: 'linear-gradient(135deg, rgba(0, 255, 135, 0.1) 0%, rgba(96, 239, 255, 0.1) 100%)',
  border: '1px solid rgba(96, 239, 255, 0.2)',
  borderRadius: '4px',
  '&:hover': {
    background: 'linear-gradient(135deg, rgba(0, 255, 135, 0.2) 0%, rgba(96, 239, 255, 0.2) 100%)',
  },
  '&:disabled': {
    opacity: 0.3,
    background: 'rgba(45, 45, 45, 0.5)',
  },
}));

const ValueDisplay = styled(Typography)(({ theme }) => ({
  minWidth: '100px',
  padding: '6px 12px',
  background: 'rgba(30, 30, 30, 0.6)',
  borderRadius: '4px',
  color: '#fff',
  textAlign: 'center',
  fontWeight: 500,
}));

const languageOptions = [
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'manim', label: 'Manim' }
];

interface LeftPaneProps {
  firstDropdownValue: string;
  secondRadioValue: string;
  onFirstDropdownChange: (value: string) => void;
  onSecondRadioChange: (value: string) => void;
  history: PromptHistoryEntryType[];
  onClearHistory: () => void;
  onRestorePrompt: (entry: PromptHistoryEntryType) => void;
}

const LeftPane: React.FC<LeftPaneProps> = ({
  firstDropdownValue,
  secondRadioValue,
  onFirstDropdownChange,
  onSecondRadioChange,
  history,
  onClearHistory,
  onRestorePrompt,
}) => {
  const handleIncrement = () => {
    const currentValue = secondRadioValue === 'none' ? 0 : parseInt(secondRadioValue);
    if (currentValue < 2) {
      onSecondRadioChange((currentValue + 1).toString());
    }
  };

  const handleDecrement = () => {
    const currentValue = secondRadioValue === 'none' ? 0 : parseInt(secondRadioValue);
    if (currentValue > 0) {
      onSecondRadioChange(currentValue - 1 === 0 ? 'none' : (currentValue - 1).toString());
    }
  };

  const getCurrentValue = () => {
    return secondRadioValue === 'none' ? 'None' : `${secondRadioValue} Model${secondRadioValue === '1' ? '' : 's'}`;
  };

  return (
    <Container>
      <ScrollableSection>
        <Typography variant="h6" sx={{ 
          color: '#fff', 
          marginBottom: '20px',
          background: 'linear-gradient(90deg, #00ff87 0%, #60efff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 600
        }}>
          Settings
        </Typography>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel sx={{ 
            color: 'white', 
            '&.Mui-focused': { 
              background: 'linear-gradient(90deg, #00ff87 0%, #60efff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            } 
          }}>
            Language
          </InputLabel>
          <Select
            value={firstDropdownValue}
            onChange={(e) => onFirstDropdownChange(e.target.value)}
            label="Language"
            sx={{
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(96, 239, 255, 0.1)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(96, 239, 255, 0.2)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(96, 239, 255, 0.3)',
              }
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: '#2d2d2d',
                  color: 'white',
                  '& .MuiMenuItem-root': {
                    padding: '8px 16px',
                    '&:hover': {
                      background: 'linear-gradient(90deg, rgba(0, 255, 135, 0.1) 0%, rgba(96, 239, 255, 0.1) 100%)',
                    },
                    '&.Mui-selected': {
                      background: 'linear-gradient(90deg, rgba(0, 255, 135, 0.2) 0%, rgba(96, 239, 255, 0.2) 100%)',
                      '&:hover': {
                        background: 'linear-gradient(90deg, rgba(0, 255, 135, 0.3) 0%, rgba(96, 239, 255, 0.3) 100%)',
                      }
                    }
                  }
                }
              }
            }}
          >
            {languageOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Typography variant="subtitle1" sx={{ 
          color: '#fff', 
          mb: 2,
          fontWeight: 500,
          letterSpacing: '0.5px',
        }}>
          Model Comparisons
        </Typography>
        
        <ComparisonControl>
          <ArrowButton 
            onClick={handleDecrement}
            disabled={secondRadioValue === 'none'}
            size="small"
          >
            <KeyboardArrowDownIcon />
          </ArrowButton>
          <ValueDisplay variant="body1">
            {getCurrentValue()}
          </ValueDisplay>
          <ArrowButton 
            onClick={handleIncrement}
            disabled={secondRadioValue === '2'}
            size="small"
          >
            <KeyboardArrowUpIcon />
          </ArrowButton>
        </ComparisonControl>

        <Logger 
          history={history} 
          onClear={onClearHistory} 
          onRestore={onRestorePrompt}
        />
      </ScrollableSection>
    </Container>
  );
};

export default LeftPane; 