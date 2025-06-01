import React, { useState, useEffect } from 'react';
import { Box, TextField, Typography, IconButton, Tooltip, Select, MenuItem, FormControl, InputLabel, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { styled } from '@mui/material/styles';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import SendIcon from '@mui/icons-material/Send';
import CodeIcon from '@mui/icons-material/Code';
import PreviewIcon from '@mui/icons-material/Visibility';
import Editor from '@monaco-editor/react';
import { notifyComparisonCount, compareCode } from '../services/api';
import { ErrorOutline } from '@mui/icons-material';

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
  '& > *': {
    flex: '1 1 0',
  }
});

const EditorWrapper = styled(Box)({
  position: 'relative',
  height: '100%',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#1e1e1e',
  minWidth: '150px',
  overflow: 'hidden',
});

const EditorContainer = styled(Box)({
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
  '& .monaco-editor': {
    height: '100% !important',
    width: '100% !important',
  },
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
  position: 'relative',
  fontSize: '1rem',
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  fontWeight: 400,
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
  padding: theme.spacing(1),
  backgroundColor: '#1e293b',
  borderBottom: '1px solid #3d3d3d',
  display: 'flex',
  gap: theme.spacing(1),
  alignItems: 'flex-start',
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  flex: 1,
  '& .MuiInputBase-root': {
    color: 'white',
    fontSize: '0.875rem',
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: '#4d4d4d',
    },
    '&:hover fieldset': {
      borderColor: '#6d6d6d',
    },
  },
}));

const LoadingOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
});

const PreviewFrame = styled('iframe')({
  width: '100%',
  height: '100%',
  border: 'none',
  backgroundColor: 'white',
});

const ViewToggle = styled(ToggleButtonGroup)(({ theme }) => ({
  position: 'absolute',
  right: theme.spacing(6),
  '& .MuiToggleButton-root': {
    color: '#9d9d9d',
    borderColor: '#4d4d4d',
    '&.Mui-selected': {
      color: '#fff',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
  },
}));

const languageModels = [
  { value: 'claude-3.5', label: 'Claude-3.5' },
  { value: 'claude-3-haiku', label: 'Claude-3 Haiku' },
  { value: 'deepseek', label: 'Deepseek Coder' }
];

interface CodeResult {
  model: string;
  code: string | null;
  language: string;
  prompt: string;
  timestamp: string;
  error: string | null;
}

interface CompareResponse {
  results: CodeResult[];
  error: string | null;
}

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
  firstDropdownValue: string;
}

interface EditorMountParameters {
  editor: any;
  monaco: any;
}

interface SelectChangeEvent {
  target: {
    value: string;
  };
}

interface CodeExecuteRequest {
  code: string;
  language: string;
  model?: string;
  prompt?: string;
}

const extractCodeAndExplanation = (text: string | null | undefined, language: string): { code: string; explanation: string } => {
  if (!text) return { code: '', explanation: '' };
  
  let explanation = '';
  let codeContent = '';

  // First try to extract code from code blocks
  const codeBlockRegex = new RegExp(`\`\`\`(?:${language})?\\s*\\n?([\\s\\S]*?)\\n?\`\`\``, 'gi');
  const matches = text.matchAll(codeBlockRegex);
  const codeBlocks = Array.from(matches);
  
  if (codeBlocks.length > 0) {
    // Get any text before the first code block as explanation
    explanation = text.substring(0, text.indexOf('```'))
      .split('\n')
      .filter(line => line.trim())
      .join('\n');
    
    // Combine all code blocks, ensuring match[1] exists
    codeContent = codeBlocks
      .map(match => (match && match[1] ? match[1].trim() : ''))
      .filter(Boolean)
      .join('\n\n');
  } else {
    // If no code blocks found, try to extract based on language syntax
    const lines = text.split('\n');
    const codeLines: string[] = [];
    const explanationLines: string[] = [];
    let isInCode = false;

    for (let line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;

      // Check if line looks like code based on language
      const isCodeLine = (
        language === 'html' ? (
          trimmedLine.startsWith('<') || 
          trimmedLine.startsWith('</') ||
          trimmedLine.endsWith('>') ||
          trimmedLine.includes('/>') ||
          /^[\s]*[<{\w]/.test(trimmedLine)
        ) :
        language === 'css' ? (
          trimmedLine.includes('{') ||
          trimmedLine.includes('}') ||
          trimmedLine.includes(':') ||
          /^[\s]*[\w\-#.[]/.test(trimmedLine)
        ) :
        language === 'javascript' ? (
          trimmedLine.includes('function') ||
          trimmedLine.includes('=>') ||
          trimmedLine.includes('var ') ||
          trimmedLine.includes('let ') ||
          trimmedLine.includes('const ') ||
          trimmedLine.includes('class ') ||
          trimmedLine.includes('return ') ||
          trimmedLine.includes('if ') ||
          trimmedLine.includes('else ') ||
          trimmedLine.includes('for ') ||
          trimmedLine.includes('while ') ||
          /^[\s]*[\w$_]/.test(trimmedLine) ||
          /^[\s]*[{}\[\]();]/.test(trimmedLine)
        ) :
        // For other languages, assume it's code if it's not clearly a comment or text
        /^[\s]*[\w$_({[<]/.test(trimmedLine)
      );

      // Handle code comments
      const isComment = (
        trimmedLine.startsWith('//') || 
        trimmedLine.startsWith('/*') || 
        trimmedLine.startsWith('*') ||
        (language === 'html' && trimmedLine.startsWith('<!--'))
      );

      if (isCodeLine) {
        isInCode = true;
        codeLines.push(line);
      } else if (isComment && isInCode) {
        // Only keep comments that are within code blocks
        codeLines.push(line);
      } else if (!isComment && !isCodeLine && trimmedLine) {
        // If it's not code and not a comment, it's explanation text
        explanationLines.push(trimmedLine);
      }
    }

    codeContent = codeLines.join('\n').trim();
    explanation = explanationLines.join('\n').trim();
  }

  // Clean up the code to remove any non-code content
  codeContent = codeContent
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      // Keep only code and code comments that are part of the code
      return trimmed && (
        /^[\s]*[a-zA-Z0-9_$({[<]/.test(trimmed) || // Code lines
        (trimmed.startsWith('//') && /^\/\/\s*[@\w]/.test(trimmed)) || // JSDoc and meaningful comments
        (trimmed.startsWith('/*') && /^\/\*\s*[@\w]/.test(trimmed)) || // Multi-line JSDoc start
        (trimmed.startsWith('*') && /^\*\s*[@\w]/.test(trimmed)) || // Multi-line JSDoc middle
        (trimmed.startsWith('*/') && /^\*\/\s*$/.test(trimmed)) || // Multi-line comments end
        (language === 'html' && trimmed.startsWith('<!--') && /<!--\s*[@\w]/.test(trimmed)) // HTML comments
      );
    })
    .join('\n')
    .trim();

  return {
    code: codeContent,
    explanation
  };
};

const getPreviewContent = (code: string, language: string): string => {
  if (!code) return '';
  
  // Clean the code to ensure only code is displayed
  const { code: extractedCode } = extractCodeAndExplanation(code, language);
  console.log("Extracted code:", extractedCode);
  switch (language.toLowerCase()) {
    case 'html':
      const isCompleteHTML = extractedCode.trim().toLowerCase().includes('<!doctype') || 
                            extractedCode.trim().toLowerCase().includes('<html');
      
      if (isCompleteHTML) {
        // Use the code as-is since it's already a complete HTML document
        console.log("Extracted code is complete HTML:", "YAYYYYYYY !!!");
        const blobUrl = URL.createObjectURL(new Blob([extractedCode], { type: 'text/html' }));
        console.log("Generated blob URL:", blobUrl);
        return blobUrl;
      } else {
        // Wrap partial HTML content in a document structure
        return URL.createObjectURL(new Blob([`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
              ${extractedCode}
            </body>
          </html>
        `], { type: 'text/html' }));
      }
      
    case 'css':
      return URL.createObjectURL(new Blob([`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${extractedCode}</style>
          </head>
          <body>
            <div class="preview-container">
              <h1>Sample Heading</h1>
              <p>Sample paragraph text</p>
              <button>Sample Button</button>
              <div class="sample-div">Sample Div</div>
              <a href="#">Sample Link</a>
            </div>
          </body>
        </html>
      `], { type: 'text/html' }));
      
    case 'javascript':
      const jsPreview = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              #output { 
                font-family: monospace;
                white-space: pre-wrap;
                padding: 10px;
                background: #f5f5f5;
              }
              .error { color: red; }
            </style>
          </head>
          <body>
            <div id="output"></div>
            <script>
              // Redirect console.log to output div
              const output = document.getElementById('output');
              const originalLog = console.log;
              console.log = function(...args) {
                if (output) {
                  output.innerHTML += args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                  ).join(' ') + '\\n';
                }
                originalLog.apply(console, args);
              };
              
              // Add error handling
              window.onerror = function(msg) {
                if (output) {
                  output.innerHTML += '<div class="error">Error: ' + msg + '</div>\\n';
                }
                return false;
              };

              // Execute the extracted code
              try {
                ${extractedCode}
              } catch (err) {
                console.log('Error:', err.message);
              }
            </script>
          </body>
        </html>
      `;
      return URL.createObjectURL(new Blob([jsPreview], { type: 'text/html' }));
      
    default:
      return '';
  }
};

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
  firstDropdownValue = 'html',
}) => {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewModes, setViewModes] = useState<('code' | 'preview')[]>(Array(count).fill('code'));
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>(Array(count).fill(null));
  const [explanations, setExplanations] = useState<string[]>(Array(count).fill(''));
  const [editorInstances, setEditorInstances] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Ensure firstDropdownValue is always a string
  const language = firstDropdownValue || 'html';

  useEffect(() => {
    if (secondRadioValue !== 'none') {
      notifyComparisonCount(parseInt(secondRadioValue));
    }
  }, [secondRadioValue]);

  useEffect(() => {
    if (secondRadioValue === 'none') {
      setSelectedModels([]);
      setViewModes(Array(1).fill('code'));
      return;
    }

    const modelCount = parseInt(secondRadioValue);
    
    // Set up default models based on comparison mode
    console.log('Model count:', modelCount);
    if (modelCount === 1) {
      setSelectedModels(['claude-3.5']);
      setViewModes(Array(1).fill('code'));
    } else if (modelCount === 2) {
      // Set both models by default
      setSelectedModels(['claude-3.5', 'claude-3-haiku']);
      setViewModes(Array(2).fill('code'));
    } else if (modelCount === 3) {
      setSelectedModels(['claude-3.5', 'claude-3-haiku', 'deepseek']);
      setViewModes(Array(3).fill('code'));
    }

    // Ensure view modes array matches the model count

    setViewModes(prev => {
      if (prev.length !== modelCount) {
        return Array(modelCount).fill('code');
      }
      return prev;
    });
  }, [secondRadioValue]);

  const handleModelChange = (index: number) => (event: SelectChangeEvent) => {
    const newModels = [...selectedModels];
    newModels[index] = event.target.value;
    setSelectedModels(newModels);
    console.log('Models updated:', newModels); // Debug log
  };

  const handleEditorDidMount = (editor: EditorMountParameters['editor'], monaco: EditorMountParameters['monaco'], index: number) => {
    const newEditorInstances = [...editorInstances];
    newEditorInstances[index] = editor;
    setEditorInstances(newEditorInstances);
    
    editor.updateOptions({
      minimap: { enabled: true },
      fontSize: 14,
      wordWrap: 'on',
      automaticLayout: true,
      readOnly: true,
      scrollBeyondLastLine: true,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 12,
        horizontalScrollbarSize: 12,
      },
    });
  };

  const handleViewModeChange = (index: number) => (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'code' | 'preview',
  ) => {
    if (newMode !== null) {
      const newViewModes = [...viewModes];
      newViewModes[index] = newMode;
      setViewModes(newViewModes);
      
      // Update preview content
      const codeContent = codes[index + 1];
      if (newMode === 'preview' && codeContent) {
        try {
          // The code will be extracted again in getPreviewContent
          const newUrl = getPreviewContent(codeContent, language);
          const newPreviewUrls = [...previewUrls];
          
          // Clean up old URL if it exists
          if (previewUrls[index]) {
            URL.revokeObjectURL(previewUrls[index]!);
          }
          
          newPreviewUrls[index] = newUrl;
          setPreviewUrls(newPreviewUrls);
        } catch (error) {
          console.error('Error updating preview:', error);
          setError('Failed to update preview');
        }
      } else if (newMode === 'code' && previewUrls[index]) {
        // Clean up URL when switching back to code view
        URL.revokeObjectURL(previewUrls[index]!);
        const newPreviewUrls = [...previewUrls];
        newPreviewUrls[index] = null;
        setPreviewUrls(newPreviewUrls);
      }
    }
  };

  const handleImportClick = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    
    try {
      const modelLabel = languageModels.find(model => model.value === selectedModels[index - 1])?.label || 'Unknown';
      const codeToImport = codes[index];
      
      if (!codeToImport) {
        console.error('No code to import');
        return;
      }

      await fetch('http://localhost:8000/save-imported-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toLocaleTimeString(),
          prompt: prompt,
          language: firstDropdownValue,
          model: selectedModels[index - 1],
          code: codeToImport,
          description: `Imported code from ${modelLabel}`
        }),
      });

      onCodeChange(0)(codeToImport);
      onEditorSelect(index);
    } catch (error) {
      console.error('Error saving code history:', error);
    }
  };

  const handlePromptSubmit = async () => {
    if (!prompt.trim() || isSubmitting) return;
    
    const activeModels = selectedModels.filter(model => model);
    if (activeModels.length === 0) {
      setError('Please select at least one model');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      // Create requests for all selected models
      console.log('Selected models:', selectedModels);
      const requests = activeModels.map((model) => ({
        code: codes[0] || '',  // Ensure code is never undefined
        language: firstDropdownValue?.toLowerCase() || 'html',
        prompt: prompt,
        model: model
      }));
      
      console.log('Sending requests:', requests);
      const data = await compareCode(requests);
      console.log('Received response:', data);

      if (data.error) {
        console.error('Error from API:', data.error);
        setError(data.error);
        return;
      }

      if (data.results && Array.isArray(data.results)) {
        console.log('Processing results:', data.results);
        let errorOccurred = false;
        data.results.forEach((result: CodeResult, index: number) => {
          if (result.error) {
            errorOccurred = true;
            console.error(`Error for ${result.model}:`, result.error);
            setError(`Error for ${result.model}: ${result.error}`);
          } else if (result.code) {
            console.log(`Processing code for ${result.model}`);
            const extractedResult = extractCodeAndExplanation(result.code || '', firstDropdownValue);
            onCodeChange(index + 1)(extractedResult.code);
            
            const newExplanations = [...explanations];
            newExplanations[index + 1] = extractedResult.explanation;
            setExplanations(newExplanations);
            
            if (editorInstances[index]) {
              console.log(`Updating editor instance ${index} for ${result.model}`);
              editorInstances[index].setValue(extractedResult.code);
            }
          }
        });
        
        if (!errorOccurred) {
          setError(null);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error executing code:', error);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeChange = (index: number) => (newCode: string | undefined) => {
    if (onCodeChange && typeof onCodeChange === 'function' && newCode !== undefined) {
      onCodeChange(index)(newCode);
    }
  };

  // Update preview URLs and explanations when codes change
  useEffect(() => {
    const newPreviewUrls = codes.map((code, index) => {
      if (viewModes[index - 1] === 'preview' && code) {
        const { code: extractedCode } = extractCodeAndExplanation(code, firstDropdownValue);
        return getPreviewContent(extractedCode, firstDropdownValue);
      }
      return null;
    });

    // Clean up old URLs
    previewUrls.forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });

    setPreviewUrls(newPreviewUrls);

    // Update explanations
    const newExplanations = codes.map(code => {
      const { explanation } = extractCodeAndExplanation(code, firstDropdownValue);
      return explanation;
    });

    setExplanations(newExplanations);

    // Cleanup on unmount
    return () => {
      newPreviewUrls.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [codes, viewModes, firstDropdownValue]);

  return (
    <Container>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {secondRadioValue !== 'none' && (
          <>
            <Box sx={{ p: 2, backgroundColor: '#2d2d2d', borderBottom: '1px solid #3d3d3d' }}>
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                mb: 2,
                flexWrap: 'wrap', // Allow wrapping for small screens
                justifyContent: 'flex-start' 
              }}>
                {Array.from({ length: parseInt(secondRadioValue) }).map((_, index) => (
                  <FormControl key={index} size="small" sx={{ minWidth: 180, flex: '1 1 auto' }}>
                    <InputLabel sx={{ color: 'white' }}>Model {index + 1}</InputLabel>
                    <Select
                      value={selectedModels[index] || ''}
                      onChange={handleModelChange(index)}
                      sx={{ 
                        color: 'white',
                        maxWidth: '100%'
                      }}
                    >
                      {languageModels.map((model) => (
                        <MenuItem key={model.value} value={model.value}>
                          {model.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <StyledTextField
                  multiline
                  minRows={2}
                  maxRows={4}
                  placeholder="Enter your prompt here... (Shift+Enter for new line, Enter to submit)"
                  value={prompt}
                  onChange={(e) => onPromptChange(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handlePromptSubmit();
                    }
                  }}
                  variant="outlined"
                  error={!!error}
                  fullWidth
                />
                <IconButton
                  onClick={handlePromptSubmit}
                  disabled={isSubmitting}
                  sx={{
                    color: '#9d9d9d',
                    alignSelf: 'flex-start',
                    mt: 1,
                    '&:hover': { color: '#fff' },
                    '&.Mui-disabled': { color: '#4d4d4d' },
                  }}
                >
                  {isSubmitting ? <CircularProgress size={24} /> : <SendIcon />}
                </IconButton>
              </Box>
              {error && (
                <Box sx={{ 
                  mt: 1,
                  p: 1,
                  backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  color: '#ff6b6b',
                  borderRadius: 1,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}>
                  <ErrorOutline sx={{ fontSize: '1rem' }} />
                  {error}
                </Box>
              )}
            </Box>
          </>
        )}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {secondRadioValue !== 'none' && Array.from({ length: parseInt(secondRadioValue) }).map((_, index) => (
            <React.Fragment key={index}>
              <EditorWrapper>
                <EditorTitle>
                  {!selectedModels[index] || selectedModels[index] === '' ? 
                    'Model Output' : 
                    languageModels.find(model => model.value === selectedModels[index])?.label || 'Unknown'}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {['html', 'css', 'javascript'].includes(firstDropdownValue) && (
                      <ViewToggle
                        value={viewModes[index]}
                        exclusive
                        onChange={handleViewModeChange(index)}
                        aria-label="view mode"
                        size="small"
                      >
                        <ToggleButton value="code" aria-label="code view">
                          <CodeIcon fontSize="small" />
                        </ToggleButton>
                        <ToggleButton value="preview" aria-label="preview">
                          <PreviewIcon fontSize="small" />
                        </ToggleButton>
                      </ViewToggle>
                    )}
                    <Tooltip title="Import to Current Editor" placement="left">
                      <ImportButton onClick={(e) => handleImportClick(e, index + 1)}>
                        <KeyboardDoubleArrowLeftIcon />
                      </ImportButton>
                    </Tooltip>
                  </Box>
                </EditorTitle>
                {explanations[index + 1] && (
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: '#2d2d2d',
                    borderBottom: '1px solid #3d3d3d',
                    color: '#9d9d9d',
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {explanations[index + 1]}
                  </Box>
                )}
                <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  {isSubmitting && (
                    <LoadingOverlay>
                      <CircularProgress />
                    </LoadingOverlay>
                  )}
                  {viewModes[index] === 'code' ? (
                    <Editor
                      height="100%"
                      defaultLanguage={firstDropdownValue}
                      value={codes[index + 1] || ''}
                      onChange={(value) => handleCodeChange(index + 1)(value)}
                      onMount={(editor, monaco) => handleEditorDidMount(editor, monaco, index)}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: true },
                        fontSize: 14,
                        wordWrap: 'on',
                        automaticLayout: true,
                      }}
                    />
                  ) : previewUrls[index + 1] ? (
                    <PreviewFrame
                      src={previewUrls[index+1] || ''}
                      title={`Preview ${index + 1}`}
                      sandbox="allow-scripts allow-same-origin"
                    />
                  ) : null}
                </Box>
              </EditorWrapper>
              {index < parseInt(secondRadioValue) - 1 && <ResizeHandle />}
            </React.Fragment>
          ))}
        </Box>
      </Box>
    </Container>
  );
};

export default ComparisonEditors; 