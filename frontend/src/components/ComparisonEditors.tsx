import React, { useState, useEffect } from 'react';
import { Box, TextField, Typography, IconButton, Tooltip, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Resizable } from 're-resizable';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import SendIcon from '@mui/icons-material/Send';
import CodeEditor from './CodeEditor';

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#1e1e1e',
  flex: 1,
});

const EditorsContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  flex: 1,
  gap: '4px',
  overflow: 'hidden',
  padding: '4px',
});

const EditorWrapper = styled(Box)({
  position: 'relative',
  height: '100%',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#1e1e1e',
  minWidth: '200px',
});

const EditorTitle = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: '#2d2d2d',
  color: 'white',
  borderBottom: '1px solid #3d3d3d',
  height: '64px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}));

const ResizeHandle = styled(Box)({
  width: '4px',
  cursor: 'col-resize',
  backgroundColor: '#2d2d2d',
  '&:hover': {
    backgroundColor: '#4d4d4d',
  },
});

const ImportButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '12px',
  right: '12px',
  zIndex: 10,
  color: '#9d9d9d',
  padding: '4px',
  backgroundColor: 'rgba(45, 45, 45, 0.8)',
  '&:hover': {
    backgroundColor: 'rgba(77, 77, 77, 0.9)',
    color: '#fff',
  },
  '& .MuiSvgIcon-root': {
    fontSize: '20px',
  },
}));

const PromptContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: '#1e293b',
  borderBottom: '1px solid #3d3d3d',
  height: '64px',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const languageModels = [
  { value: 'gpt4', label: 'GPT-4.0' },
  { value: 'claude', label: 'Claude Sonnet 3.5' },
  { value: 'gemini', label: 'Gemini-2.5' },
];

interface ComparisonEditorsProps {
  count: number;
  codes: string[];
  onCodeChange: (index: number) => (value: string | undefined) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  onEditorSelect: (index: number) => void;
  secondRadioValue: string;
  onSecondRadioChange: (value: string) => void;
  remainingWidth: number;
}

const ComparisonEditors: React.FC<ComparisonEditorsProps> = ({
  count,
  codes,
  onCodeChange,
  prompt,
  onPromptChange,
  onEditorSelect,
  secondRadioValue,
  onSecondRadioChange,
  remainingWidth,
}) => {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  useEffect(() => {
    if (secondRadioValue === 'none') {
      setSelectedModels([]);
      return;
    }

    const numEditors = parseInt(secondRadioValue);
    const availableModels = languageModels.map(m => m.value);
    
    // Update selected models
    const newModels = Array(numEditors).fill('').map((_, index) => {
      if (selectedModels[index] && availableModels.includes(selectedModels[index])) {
        return selectedModels[index];
      }
      const availableModel = availableModels.find(model => 
        !selectedModels.slice(0, index).includes(model)
      );
      return availableModel || availableModels[0];
    });
    setSelectedModels(newModels);
  }, [secondRadioValue]);

  const handleModelChange = (index: number) => (event: any) => {
    const newModels = [...selectedModels];
    newModels[index] = event.target.value;
    setSelectedModels(newModels);
  };

  const getAvailableModels = (currentIndex: number) => {
    return languageModels.filter(model => 
      !selectedModels.some((selected, idx) => selected === model.value && idx !== currentIndex)
    );
  };

  const handleImportClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    onEditorSelect(index);
  };

  const handlePromptSubmit = async () => {
    try {
      const requests = selectedModels.map((model, index) => ({
        code: codes[index + 1],
        language: firstDropdownValue.toLowerCase(),
        model: model,
        prompt: prompt
      }));

      const response = await fetch('http://localhost:8000/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requests),
      });

      const data = await response.json();
      
      if (data.error) {
        console.error('Error:', data.error);
        return;
      }

      // Update the editors with the results
      data.results.forEach((result: any, index: number) => {
        if (result.code) {
          onCodeChange(index + 1)(result.code);
        }
      });
    } catch (error) {
      console.error('Error submitting prompt:', error);
    }
  };

  if (secondRadioValue === 'none') {
    return null;
  }

  const editorWidth = remainingWidth / count;

  return (
    <Container>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: 2, 
        backgroundColor: '#2d2d2d',
        gap: 2,
        flexWrap: 'wrap'
      }}>
        {Array.from({ length: count }, (_, index) => (
          <FormControl key={index} size="small" sx={{ minWidth: 200 }}>
            <InputLabel sx={{ color: 'white' }}>Model {index + 1}</InputLabel>
            <Select
              value={selectedModels[index] || ''}
              onChange={handleModelChange(index)}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#4d4d4d',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#6d6d6d',
                },
              }}
              label={`Model ${index + 1}`}
            >
              {getAvailableModels(index).map((model) => (
                <MenuItem key={model.value} value={model.value}>
                  {model.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}
      </Box>
      <PromptContainer>
        <TextField
          fullWidth
          placeholder="Enter your prompt here..."
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          variant="standard"
          sx={{
            '& .MuiInputBase-root': {
              color: 'white',
              fontSize: '14px',
              '&::before': {
                borderColor: '#4d4d4d',
              },
              '&:hover:not(.Mui-disabled)::before': {
                borderColor: '#6d6d6d',
              },
            },
            '& .MuiInputBase-input': {
              padding: '4px 0',
            },
          }}
        />
        <IconButton
          onClick={handlePromptSubmit}
          sx={{
            color: '#9d9d9d',
            '&:hover': { color: '#fff' },
          }}
        >
          <SendIcon />
        </IconButton>
      </PromptContainer>
      <EditorsContainer>
        {Array.from({ length: count }).map((_, index) => (
          <React.Fragment key={index}>
            <EditorWrapper style={{ width: `${editorWidth}px` }}>
              <EditorTitle>
                {selectedModels[index] ? 
                  languageModels.find(model => model.value === selectedModels[index])?.label : 
                  'Unknown'}
                <Tooltip title="Import to Current Editor" placement="left">
                  <ImportButton
                    onClick={(e) => handleImportClick(e, index + 1)}
                    size="small"
                  >
                    <KeyboardDoubleArrowLeftIcon />
                  </ImportButton>
                </Tooltip>
              </EditorTitle>
              <Box sx={{ flex: 1, position: 'relative' }}>
                <CodeEditor
                  value={codes[index + 1]}
                  onChange={onCodeChange(index + 1)}
                  language="javascript"
                />
              </Box>
            </EditorWrapper>
            {index < count - 1 && (
              <ResizeHandle />
            )}
          </React.Fragment>
        ))}
      </EditorsContainer>
    </Container>
  );
};

export default ComparisonEditors; 