import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, RadioGroup, FormControlLabel, Radio, Typography, FormLabel } from '@mui/material';
import { styled } from '@mui/material/styles';
import Logger from './Logger';
import type { PromptHistoryEntry as PromptHistoryEntryType } from './Logger';

const Container = styled(Box)({
  width: '250px',
  height: '100vh',
  backgroundColor: '#1e1e1e',
  borderRight: '1px solid #3d3d3d',
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
    background: '#2d2d2d',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#4d4d4d',
    borderRadius: '4px',
  },
});

const StyledFormControl = styled(FormControl)({
  marginBottom: '20px',
  width: '100%',
});

const StyledRadioGroup = styled(RadioGroup)({
  '& .MuiFormControlLabel-root': {
    marginBottom: '8px',
  },
  '& .MuiRadio-root': {
    color: '#9d9d9d',
    '&.Mui-checked': {
      color: '#fff',
    },
  },
  '& .MuiFormControlLabel-label': {
    color: '#fff',
  },
});

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
  return (
    <Container>
      <ScrollableSection>
        <Typography variant="h6" sx={{ color: '#fff', marginBottom: '20px' }}>
          Settings
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: 'white', '&.Mui-focused': { color: 'white' } }}>Language</InputLabel>
          <Select
            value={firstDropdownValue}
            onChange={(e) => onFirstDropdownChange(e.target.value)}
            label="Language"
            sx={{
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#4d4d4d',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#6d6d6d',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#8d8d8d',
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
                      backgroundColor: 'rgba(255, 255, 255, 0.08)'
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(255, 255, 255, 0.16)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.24)'
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
        
        <Typography variant="subtitle1" sx={{ color: '#fff', mb: 2 }}>
          Model Comparisons
        </Typography>
        <FormControl>
        <RadioGroup
  value={secondRadioValue}
  onChange={(e) => onSecondRadioChange(e.target.value)}
>
  <FormControlLabel
    value="none"
    control={
      <Radio
        sx={{
          color: '#9d9d9d',
          '&.Mui-checked': { color: '#fff' }
        }}
      />
    }
    label="No Comparison"
    sx={{ color: '#fff' }}
  />
  <FormControlLabel
    value="1"
    control={
      <Radio
        sx={{
          color: '#9d9d9d',
          '&.Mui-checked': { color: '#fff' }
        }}
      />
    }
    label="1 Model"
    sx={{ color: '#fff' }}
  />
  <FormControlLabel
    value="2"
    control={
      <Radio
        sx={{
          color: '#9d9d9d',
          '&.Mui-checked': { color: '#fff' }
        }}
      />
    }
    label="2 Models"
    sx={{ color: '#fff' }}
  />
</RadioGroup>

        </FormControl>

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