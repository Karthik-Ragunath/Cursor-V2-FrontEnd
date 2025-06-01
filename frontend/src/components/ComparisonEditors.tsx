import React, { useState, useEffect, useRef } from 'react';
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
  transform: 'scale(0.99)',
  transformOrigin: 'top left',
  display: 'block',
  margin: '0',
  padding: '0',
  overflow: 'auto'
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
  explanation: string | null;
  cleanCode: string | null;
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

const getPreviewContent = (code: string | null, language: string): string => {
  if (!code) {
    console.warn('No code provided to getPreviewContent');
    return '';
  }
  
  const codeToRender = code.trim();
  console.log('Generating preview content:', {
    language,
    codeLength: codeToRender.length,
    firstLines: codeToRender.split('\n').slice(0, 3)
  });
  
  let content = '';
  switch (language.toLowerCase()) {
    case 'html':
      content = codeToRender;
      break;
      
    case 'css':
      content = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              /* Reset default styles */
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
              
              /* Preview container styles */
              .preview-container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
              }
              
              /* Default spacing for demo elements */
              .preview-container > * { margin-bottom: 20px; }
              
              /* User's CSS */
              ${codeToRender}
            </style>
          </head>
          <body>
            <div class="preview-container">
              <header>
                <h1>CSS Preview</h1>
                <nav>
                  <a href="#">Link 1</a>
                  <a href="#">Link 2</a>
                  <a href="#">Link 3</a>
                </nav>
              </header>
              
              <main>
                <section class="section-1">
                  <h2>Section 1</h2>
                  <p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
                  <button class="primary-button">Primary Button</button>
                  <button class="secondary-button">Secondary Button</button>
                </section>
                
                <section class="section-2">
                  <h3>Form Elements</h3>
                  <form>
                    <input type="text" placeholder="Text input">
                    <input type="checkbox" id="check1"><label for="check1">Checkbox</label>
                    <select><option>Dropdown</option></select>
                  </form>
                </section>
                
                <div class="card">
                  <h3>Card Title</h3>
                  <p>Card content with some text.</p>
                </div>
                
                <div class="grid">
                  <div class="grid-item">Grid Item 1</div>
                  <div class="grid-item">Grid Item 2</div>
                  <div class="grid-item">Grid Item 3</div>
                </div>
                
                <footer>
                  <p>Footer content</p>
                  <div class="social-icons">
                    <span class="icon">🌟</span>
                    <span class="icon">💫</span>
                    <span class="icon">✨</span>
                  </div>
                </footer>
              </main>
            </div>
          </body>
        </html>
      `;
      break;
      
    case 'javascript':
      content = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: system-ui, -apple-system, sans-serif;
                margin: 0;
                padding: 20px;
                background: #f8f9fa;
              }
              #output { 
                font-family: 'Consolas', 'Monaco', monospace;
                white-space: pre-wrap;
                padding: 15px;
                background: #fff;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                margin-bottom: 15px;
                max-height: 400px;
                overflow-y: auto;
              }
              #controls {
                margin-bottom: 15px;
              }
              .error { 
                color: #dc3545;
                background: #ffe9e9;
                padding: 10px;
                border-radius: 4px;
                margin: 10px 0;
              }
              .log { color: #0d6efd; }
              .info { color: #198754; }
              .warn { color: #ffc107; }
              .error-msg { color: #dc3545; }
              button {
                background: #0d6efd;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
              }
              button:hover {
                background: #0b5ed7;
              }
              #interactive-area {
                background: white;
                padding: 15px;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                margin-top: 15px;
              }
            </style>
          </head>
          <body>
            <div id="controls">
              <button onclick="clearOutput()">Clear Console</button>
            </div>
            <div id="output"></div>
            <div id="interactive-area">
              <h3>Interactive Area</h3>
              <p>This area can be manipulated by your JavaScript code.</p>
            </div>
            <script>
              // Create output element reference
              const output = document.getElementById('output');
              const interactiveArea = document.getElementById('interactive-area');
              
              // Clear output function
              function clearOutput() {
                if (output) output.innerHTML = '';
              }
              
              // Console overrides
              const originalConsole = {
                log: console.log,
                info: console.info,
                warn: console.warn,
                error: console.error
              };
              
              // Helper to format values
              function formatValue(value) {
                if (value === undefined) return 'undefined';
                if (value === null) return 'null';
                if (typeof value === 'object') {
                  try {
                    return JSON.stringify(value, null, 2);
                  } catch (err) {
                    return String(value);
                  }
                }
                return String(value);
              }
              
              // Override console methods
              console.log = function(...args) {
                if (output) {
                  const formattedArgs = args.map(formatValue).join(' ');
                  output.innerHTML += \`<div class="log">\${formattedArgs}</div>\`;
                }
                originalConsole.log.apply(console, args);
              };
              
              console.info = function(...args) {
                if (output) {
                  const formattedArgs = args.map(formatValue).join(' ');
                  output.innerHTML += \`<div class="info">ℹ️ \${formattedArgs}</div>\`;
                }
                originalConsole.info.apply(console, args);
              };
              
              console.warn = function(...args) {
                if (output) {
                  const formattedArgs = args.map(formatValue).join(' ');
                  output.innerHTML += \`<div class="warn">⚠️ \${formattedArgs}</div>\`;
                }
                originalConsole.warn.apply(console, args);
              };
              
              console.error = function(...args) {
                if (output) {
                  const formattedArgs = args.map(formatValue).join(' ');
                  output.innerHTML += \`<div class="error-msg">🚫 \${formattedArgs}</div>\`;
                }
                originalConsole.error.apply(console, args);
              };
              
              // Error handling
              window.onerror = function(msg, url, line, col, error) {
                if (output) {
                  output.innerHTML += \`<div class="error">🚫 Error: \${msg}\\nLine: \${line}, Column: \${col}</div>\`;
                }
                return false;
              };
              
              // Add error boundary
              try {
                // User's code
                ${codeToRender}
              } catch (err) {
                console.error('Runtime Error:', err.message);
              }
            </script>
          </body>
        </html>
      `;
      break;
      
    default:
      console.warn('Unsupported language:', language);
      return '';
  }

  console.log('Created preview content:', {
    contentLength: content.length,
    hasDoctype: content.includes('<!DOCTYPE html>'),
    hasBody: content.includes('<body>'),
    hasScript: content.includes('<script>')
  });

  return URL.createObjectURL(new Blob([content], { type: 'text/html' }));
};

const formatCodeWithExplanation = (code: string | null, explanation: string | null, language: string): string => {
  if (!code) return '';
  
  // Format the explanation as comments based on the language
  const formatExplanation = (exp: string | null): string => {
    if (!exp) return '';
    
    const commentStart = language.toLowerCase() === 'html' ? '<!--' : 
                        language.toLowerCase() === 'css' ? '/*' :
                        '//';
    const commentEnd = language.toLowerCase() === 'html' ? '-->' : 
                      language.toLowerCase() === 'css' ? '*/' :
                      '';
    
    // Split explanation into lines and add comment markers
    const expLines = exp.split('\n').map(line => line.trim()).filter(Boolean);
    const commentedExp = expLines.map(line => {
      if (language.toLowerCase() === 'html' || language.toLowerCase() === 'css') {
        return `${commentStart} ${line} ${commentEnd}`;
      } else {
        return `${commentStart} ${line}`;
      }
    }).join('\n');

    return `\n\n"""Exp:\n${commentedExp}\n"""\n\n`;
  };

  return `${formatExplanation(explanation)}${code}`;
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
  const editorInstancesMapRef = useRef<Map<string, any>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [cleanCodes, setCleanCodes] = useState<(string | null)[]>(Array(count).fill(null));

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
    // Store editor instance with index as key to ensure we have all editors
    const editorIndex = index + 1;
    editorInstancesMapRef.current.set(editorIndex.toString(), editor);
    console.log(`Editor mounted for index ${editorIndex}, Current map keys:`, Array.from(editorInstancesMapRef.current.keys()));
    
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
      try {
        // Create new URL before updating view mode or cleaning up old URL
        if (newMode === 'preview') {
          // Get the code directly from the codes array using the same index
          const currentCode = codes[index];
          console.log('Switching to preview mode:', {
            index,
            hasCode: !!currentCode,
            codeLength: currentCode?.length,
            viewMode: newMode,
            allCodes: codes.map(c => !!c),  // Log all code slots
            viewModes,
            previewUrls: previewUrls.map(u => !!u)  // Log all preview URLs
          });

          if (!currentCode) {
            console.error('No code found for preview at index:', index);
            setError('No code available for preview');
            return;
          }

          // Extract clean code and create URL before any state updates
          const { code: cleanCode } = extractCodeAndExplanation(currentCode, firstDropdownValue);
          console.log('Extracted clean code:', {
            cleanCodeLength: cleanCode?.length,
            firstLines: cleanCode?.split('\n').slice(0, 3),
            language: firstDropdownValue,
            hasExplanation: currentCode.includes('"""Exp:')
          });

          if (!cleanCode) {
            console.error('No clean code extracted');
            setError('Failed to extract code for preview');
            return;
          }

          const newUrl = getPreviewContent(cleanCode, firstDropdownValue);
          console.log('Created preview URL:', {
            hasUrl: !!newUrl,
            urlLength: newUrl?.length,
            language: firstDropdownValue
          });

          if (!newUrl) {
            console.error('Failed to create preview URL');
            setError('Failed to create preview');
            return;
          }

          // Only after new URL is created, update states
          const updatedViewModes = [...viewModes];
          updatedViewModes[index] = newMode;
          
          const updatedPreviewUrls = [...previewUrls];
          // Clean up old URL only after new one is created
          if (previewUrls[index]) {
            console.log('Cleaning up old URL for index:', index);
            URL.revokeObjectURL(previewUrls[index]!);
          }
          updatedPreviewUrls[index] = newUrl;
          
          // Batch state updates
          setViewModes(updatedViewModes);
          setPreviewUrls(updatedPreviewUrls);

          // Verify state updates
          console.log('State updated:', {
            newViewMode: updatedViewModes[index],
            hasNewUrl: !!updatedPreviewUrls[index],
            totalUrls: updatedPreviewUrls.filter(u => !!u).length
          });
        } else {
          // For code view, update view mode first
          const updatedViewModes = [...viewModes];
          updatedViewModes[index] = newMode;
          setViewModes(updatedViewModes);
          
          // Then clean up URL
          if (previewUrls[index]) {
            const updatedPreviewUrls = [...previewUrls];
            URL.revokeObjectURL(previewUrls[index]!);
            updatedPreviewUrls[index] = null;
            setPreviewUrls(updatedPreviewUrls);
          }
        }
      } catch (error) {
        console.error('Error updating preview:', error);
        setError('Failed to update preview');
      }
    }
  };

  const handleImportClick = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    
    try {
      const modelLabel = languageModels.find(model => model.value === selectedModels[index])?.label || 'Unknown';
      // Get code directly from the current index, not index + 1
      const codeToImport = codes[index];
      
      if (!codeToImport) {
        console.error('No code to import');
        setError('No code available to import');
        return;
      }

      // When importing, we want just the code without the explanation
      const { code: cleanCode } = extractCodeAndExplanation(codeToImport, firstDropdownValue);
      if (!cleanCode) {
        setError('Failed to extract code for import');
        return;
      }

      // Import directly to the current editor
      onCodeChange(0)(cleanCode);
      onEditorSelect(0); // Select the main editor

      // Show success message
      setError('Code imported successfully');
      
      // Log the import for debugging
      console.log('Code imported:', {
        from: index,
        model: modelLabel,
        codeLength: cleanCode.length
      });
    } catch (error) {
      console.error('Error importing code:', error);
      setError('Failed to import code');
    }
  };

  const handlePromptSubmit = async () => {
    if (!prompt.trim() || isSubmitting) return;
    
    const activeModels = selectedModels.filter(Boolean);
    if (activeModels.length === 0) {
      setError('Please select at least one model');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      const requests: CodeExecuteRequest[] = activeModels.map((model) => ({
        code: codes[0] || '',
        language: firstDropdownValue?.toLowerCase() || 'html',
        prompt: prompt,
        model: model
      }));
      
      const response = await compareCode(requests);

      if (response.error) {
        console.error('Error from API:', response.error);
        setError(response.error);
        return;
      }

      if (response.results && Array.isArray(response.results)) {
        let errorOccurred = false;

        // Create a map of results by model
        const resultsByModel = new Map<string, CodeResult>(
          response.results.map((result: CodeResult) => [result.model, result])
        );
        
        // Process results in the same order as selectedModels
        const newCleanCodes = [...cleanCodes];
        
        selectedModels.forEach((model, index) => {
          if (!model) return; // Skip empty model slots
          
          const result = resultsByModel.get(model);
          if (!result) {
            errorOccurred = true;
            console.error(`No result found for model ${model}`);
            setError(`No result found for model ${model}`);
            return;
          }

          if (result.error) {
            errorOccurred = true;
            console.error(`Error for ${result.model}:`, result.error);
            setError(`Error for ${result.model}: ${result.error}`);
          } else if (result.code) {
            // Format code with explanation
            const formattedCode = formatCodeWithExplanation(result.code, result.explanation, firstDropdownValue);
            
            // Store the clean code for preview
            newCleanCodes[index] = result.code;
            
            // Update the code for the correct editor index
            onCodeChange(index)(formattedCode);
            
            const editorInstance = editorInstancesMapRef.current.get(index.toString());
            if (editorInstance) {
              editorInstance.setValue(formattedCode);
            } else {
              console.error(`No editor instance found for index ${index}`);
            }
          }
        });
        
        setCleanCodes(newCleanCodes);
        
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
    // Keep track of the latest effect run to prevent stale updates
    let isLatestEffect = true;
    const activePreviewUrls = new Set<string>();

    const updatePreviews = async () => {
      try {
        const newPreviewUrls = await Promise.all(codes.map(async (code, index) => {
          if (!isLatestEffect) return null;
          
          if (viewModes[index] === 'preview' && code) {
            try {
              const { code: cleanCode } = extractCodeAndExplanation(code, firstDropdownValue);
              if (!cleanCode) {
                console.warn('No clean code extracted for preview', { index });
                return null;
              }

              // Create new URL before cleaning up old one
              const newUrl = getPreviewContent(cleanCode, firstDropdownValue);
              if (!newUrl) {
                console.warn('Failed to create preview URL', { index });
                return null;
              }

              activePreviewUrls.add(newUrl);
              return newUrl;
            } catch (error) {
              console.error('Error creating preview for index', index, error);
              return null;
            }
          }
          return null;
        }));

        if (!isLatestEffect) return;

        // Clean up old URLs that are no longer active
        previewUrls.forEach(url => {
          if (url && !activePreviewUrls.has(url)) {
            URL.revokeObjectURL(url);
          }
        });

        setPreviewUrls(newPreviewUrls);

        // Update explanations
        const newExplanations = codes.map(code => {
          if (!code) return '';
          const { explanation } = extractCodeAndExplanation(code, firstDropdownValue);
          return explanation || '';
        });

        if (!isLatestEffect) return;
        setExplanations(newExplanations);
      } catch (error) {
        console.error('Error updating previews:', error);
        if (isLatestEffect) {
          setError('Failed to update previews');
        }
      }
    };

    updatePreviews();

    return () => {
      isLatestEffect = false;
      // Clean up all URLs when unmounting
      previewUrls.forEach(url => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [codes, viewModes, firstDropdownValue]);

  // Update the preview component to handle rendering
  const PreviewComponent = ({ src, title, index }: { src: string, title: string, index: number }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
      console.log('Preview frame mounted:', {
        index,
        hasSource: !!src,
        sourceLength: src?.length
      });
    }, [src, index]);

    const handleLoad = () => {
      console.log('Preview frame loaded:', {
        index,
        hasContent: !!iframeRef.current?.contentWindow?.document.body.innerHTML,
        contentLength: iframeRef.current?.contentWindow?.document.body.innerHTML.length
      });
      setIsLoading(false);
      setHasError(false);
    };

    const handleError = () => {
      console.error('Preview frame failed to load:', { index, src });
      setIsLoading(false);
      setHasError(true);
    };

    return (
      <Box sx={{ 
        height: '100%', 
        width: '100%', 
        position: 'relative',
        backgroundColor: 'white',
        overflow: 'hidden'
      }}>
        {isLoading && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)'
          }}>
            <CircularProgress />
          </Box>
        )}
        {hasError && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2,
            backgroundColor: 'white'
          }}>
            <ErrorOutline color="error" />
            <Typography color="error">Failed to load preview</Typography>
          </Box>
        )}
        <PreviewFrame
          ref={iframeRef}
          src={src}
          title={title}
          sandbox="allow-scripts allow-same-origin"
          onLoad={handleLoad}
          onError={handleError}
        />
      </Box>
    );
  };

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
                      <ImportButton onClick={(e) => handleImportClick(e, index)}>
                        <KeyboardDoubleArrowLeftIcon />
                      </ImportButton>
                    </Tooltip>
                  </Box>
                </EditorTitle>
                {explanations[index] && (
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: '#2d2d2d',
                    borderBottom: '1px solid #3d3d3d',
                    color: '#9d9d9d',
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {explanations[index]}
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
                      key={`editor-${index}-${viewModes[index]}`}
                      height="100%"
                      defaultLanguage={firstDropdownValue}
                      value={codes[index] || ''}
                      onChange={(value) => handleCodeChange(index)(value)}
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
                  ) : previewUrls[index] ? (
                    <Box sx={{ height: '100%', width: '100%', position: 'relative', bgcolor: 'white' }}>
                      <PreviewComponent
                        src={previewUrls[index] || ''}
                        title={`Preview ${index + 1}`}
                        index={index}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#666',
                      flexDirection: 'column',
                      gap: 2
                    }}>
                      <Typography variant="body1" color="inherit">
                        No preview available
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {error || 'No code to preview'}
                      </Typography>
                    </Box>
                  )}
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