const API_BASE_URL = 'http://localhost:8000';

interface CodeExecuteRequest {
  code: string;
  language: string;
  model?: string;
  prompt?: string;
}

interface CodeExecuteResponse {
  result: string;
  error: string | null;
}

interface CompareResponse {
  results: any[];
  error: string;
}

const checkServerConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.ok;
  } catch (error) {
    console.error('Server connection check failed:', error);
    return false;
  }
};

export const executeCode = async (request: CodeExecuteRequest): Promise<CodeExecuteResponse> => {
  try {
    const isConnected = await checkServerConnection();
    if (!isConnected) {
      throw new Error('Backend server is not running. Please start the server and try again.');
    }

    const response = await fetch(`${API_BASE_URL}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.detail || 
        errorData?.error || 
        `HTTP error! status: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error executing code:', error);
    return {
      result: '',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
};

export const compareCode = async (requests: CodeExecuteRequest[]): Promise<CompareResponse> => {
  try {
    const response = await fetch('http://localhost:8000/compare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        requests.map(req => ({
          ...req,
          model: getModelKey(req.model || '')
        }))
      ),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error comparing code:', error);
    return {
      results: [],
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
};

// Helper function to get model key for API
const getModelKey = (modelValue: string): string => {
  const [family, variant] = modelValue.split('-');
  if (family === 'claude') {
    return modelValue;  // Return the full model identifier (e.g., 'claude-3.5' or 'claude-haiku')
  }
  if (family === 'deepseek') {
    return variant === 'coder' ? 'coder' : 'base';
  }
  if (family === 'manim') {
    return 'finetuned';
  }
  return modelValue;
};

export const notifyComparisonCount = async (count: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/notify-comparison-count`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ count }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.detail || 
        errorData?.error || 
        `HTTP error! status: ${response.status}`
      );
    }
  } catch (error) {
    console.error('Error notifying comparison count:', error);
    // Don't throw here as this is not critical functionality
  }
}; 