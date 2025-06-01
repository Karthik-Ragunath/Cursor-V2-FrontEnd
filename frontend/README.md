# Code Editor UI

A modern code editor interface with AI model integration and real-time code comparison features.

## Features

- Real-time code editing with Monaco Editor
- AI model integration (Claude-3.5 and Deepseek)
- Split-screen code comparison
- Live preview for HTML, CSS, and JavaScript
- Prompt history management
- WebSocket-based real-time updates

## Prerequisites

- Node.js (v16.0.0 or higher)
- npm (v7.0.0 or higher)

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd code-editor-ui/frontend
```

2. Install dependencies:
```bash
npm install
```

## Required Dependencies

```json
{
  "dependencies": {
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "@monaco-editor/react": "^4.6.0",
    "@mui/icons-material": "^5.11.16",
    "@mui/material": "^5.13.0",
    "re-resizable": "^6.9.9",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^5.59.0",
    "@typescript-eslint/parser": "^5.59.0",
    "@vitejs/plugin-react": "^4.0.0",
    "eslint": "^8.38.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.3.4",
    "typescript": "^5.0.0",
    "vite": "^4.3.0"
  }
}
```

## Environment Setup

Create a `.env` file in the frontend directory:

```env
VITE_BACKEND_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Building for Production

```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── CodeEditor.tsx
│   │   ├── ComparisonEditors.tsx
│   │   ├── LeftPane.tsx
│   │   └── Logger.tsx
│   ├── services/
│   │   └── api.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
└── package.json
```

## Component Overview

- `CodeEditor`: Main code editing component using Monaco Editor
- `ComparisonEditors`: Split-screen view for code comparison
- `LeftPane`: Navigation and settings panel
- `Logger`: Prompt history management

## Notes

- The Monaco Editor is used for code editing and requires additional configuration for optimal performance
- WebSocket connection is used for real-time updates of prompt history
- Material-UI (MUI) is used for the user interface components
- TypeScript is used for type safety and better development experience

## Troubleshooting

1. If you see Monaco Editor loading issues:
   - Make sure you have the correct version of `@monaco-editor/react`
   - Check if the editor container has proper dimensions

2. If WebSocket connection fails:
   - Verify the backend server is running
   - Check if the WebSocket URL in the environment variables is correct

3. For styling issues:
   - Ensure all Material-UI dependencies are correctly installed
   - Check for proper theme configuration
