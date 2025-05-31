import { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { Resizable } from 're-resizable'
import LeftPane from './components/LeftPane'
import CodeEditor from './components/CodeEditor'
import ComparisonEditors from './components/ComparisonEditors'

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
  const [firstDropdownValue, setFirstDropdownValue] = useState('option1')
  const [secondRadioValue, setSecondRadioValue] = useState('none')
  const [codes, setCodes] = useState<string[]>(Array(4).fill('// Start coding here...'))
  const [prompt, setPrompt] = useState('')
  const [currentEditorIndex, setCurrentEditorIndex] = useState(0)
  const [mainEditorWidth, setMainEditorWidth] = useState(window.innerWidth - 250) // Full width minus left pane

  useEffect(() => {
    const totalWidth = window.innerWidth - 250 // Total width minus left pane
    if (secondRadioValue === 'none') {
      setMainEditorWidth(totalWidth)
    } else {
      const numComparisons = parseInt(secondRadioValue)
      setMainEditorWidth(totalWidth / (numComparisons + 1)) // Divide space equally
    }
  }, [secondRadioValue])

  const handleCodeChange = (index: number) => (newValue: string | undefined) => {
    const newCodes = [...codes]
    newCodes[index] = newValue || ''
    setCodes(newCodes)
  }

  const handleEditorSelect = (index: number) => {
    const newCodes = [...codes]
    const temp = newCodes[0]
    newCodes[0] = newCodes[index]
    newCodes[index] = temp
    setCodes(newCodes)
    setCurrentEditorIndex(index)
    setSecondRadioValue('none')
  }

  const resizeHandle = secondRadioValue !== 'none' ? <ResizeHandle /> : undefined;

  return (
    <AppContainer>
      <LeftPane
        firstDropdownValue={firstDropdownValue}
        secondRadioValue={secondRadioValue}
        onFirstDropdownChange={setFirstDropdownValue}
        onSecondRadioChange={setSecondRadioValue}
      />
      <EditorsSection>
        <Resizable
          size={{ width: mainEditorWidth, height: '100%' }}
          onResizeStop={(e, direction, ref, d) => {
            setMainEditorWidth(mainEditorWidth + d.width)
          }}
          minWidth={300}
          maxWidth={secondRadioValue === 'none' ? window.innerWidth - 250 : window.innerWidth - 550}
          enable={{ right: secondRadioValue !== 'none' }}
          handleComponent={{ right: resizeHandle }}
        >
          <MainEditorContainer>
            <EditorTitle variant="subtitle1">Current Editor</EditorTitle>
            <CodeEditor
              value={codes[0]}
              onChange={handleCodeChange(0)}
              language="javascript"
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
          />
        )}
      </EditorsSection>
    </AppContainer>
  )
}

export default App
