import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, RadioGroup, FormControlLabel, Radio, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const Container = styled(Box)({
  width: '250px',
  height: '100%',
  backgroundColor: '#1e1e1e',
  borderRight: '1px solid #3d3d3d',
  padding: '20px',
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

interface LeftPaneProps {
  firstDropdownValue: string;
  secondRadioValue: string;
  onFirstDropdownChange: (value: string) => void;
  onSecondRadioChange: (value: string) => void;
}

const LeftPane: React.FC<LeftPaneProps> = ({
  firstDropdownValue,
  secondRadioValue,
  onFirstDropdownChange,
  onSecondRadioChange,
}) => {
  return (
    <Container>
      <Typography variant="h6" sx={{ color: '#fff', marginBottom: '20px' }}>
        Settings
      </Typography>
      <StyledFormControl>
        <InputLabel sx={{ color: '#9d9d9d' }}>Language</InputLabel>
        <Select
          value={firstDropdownValue}
          onChange={(e) => onFirstDropdownChange(e.target.value)}
          sx={{
            color: '#fff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3d3d3d',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#6d6d6d',
            },
          }}
          label="Language"
        >
          <MenuItem value="option1">HTML</MenuItem>
          <MenuItem value="option2">CSS</MenuItem>
          <MenuItem value="option3">JavaScript</MenuItem>
          <MenuItem value="option4">Manim</MenuItem>
        </Select>
      </StyledFormControl>
      <Typography variant="subtitle1" sx={{ color: '#fff', marginBottom: '10px' }}>
        Model Comparisons
      </Typography>
      <StyledRadioGroup
        value={secondRadioValue}
        onChange={(e) => onSecondRadioChange(e.target.value)}
      >
        <FormControlLabel value="none" control={<Radio />} label="None" />
        <FormControlLabel value="1" control={<Radio />} label="1 Model" />
        <FormControlLabel value="2" control={<Radio />} label="2 Models" />
        <FormControlLabel value="3" control={<Radio />} label="3 Models" />
      </StyledRadioGroup>
    </Container>
  );
};

export default LeftPane; 