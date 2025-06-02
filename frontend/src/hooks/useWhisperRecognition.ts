import { useState, useRef, useCallback } from 'react';

interface WhisperRecognitionProps {
  onTranscript: (transcript: string) => void;
  serverUrl?: string;
  language?: string | null;
}

interface TranscriptionResponse {
  text: string;
  language: string;
  success: boolean;
  error?: string;
  processing_time?: number;
}

export const useWhisperRecognition = ({
  onTranscript,
  serverUrl = 'http://localhost:8000',
  language = null
}: WhisperRecognitionProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check browser support for audio recording
  const checkSupport = useCallback(() => {
    const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    const supported = !!(hasMediaDevices && hasMediaRecorder);
    setIsSupported(supported);
    return supported;
  }, []);

  // Start audio recording
  const startRecording = useCallback(async () => {
    if (!checkSupport()) {
      setError('Audio recording not supported in this browser');
      return;
    }

    if (isRecording || isProcessing) {
      return;
    }

    try {
      setError(null);
      console.log('🎤 Starting audio recording...');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle recorded data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        console.log('🛑 Recording stopped, processing audio...');
        setIsRecording(false);
        setIsProcessing(true);

        try {
          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: 'audio/webm;codecs=opus' 
          });

          console.log(`📦 Audio blob created: ${audioBlob.size} bytes`);

          // Send to Whisper API
          await transcribeAudio(audioBlob);

        } catch (error) {
          console.error('❌ Error processing audio:', error);
          setError(`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setIsProcessing(false);
          cleanupStream();
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      console.log('✅ Recording started');

    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setError(`Microphone access denied: ${error instanceof Error ? error.message : 'Unknown error'}`);
      cleanupStream();
    }
  }, [isRecording, isProcessing, checkSupport]);

  // Stop audio recording
  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) {
      return;
    }

    console.log('🛑 Stopping recording...');
    mediaRecorderRef.current.stop();
  }, [isRecording]);

  // Clean up media stream
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Send audio to Whisper API for transcription
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    try {
      console.log('🚀 Sending audio to Whisper API...');

      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');
      
      if (language) {
        formData.append('language', language);
      }

      const response = await fetch(`${serverUrl}/whisper/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: TranscriptionResponse = await response.json();
      console.log('📝 Transcription result:', result);

      if (result.success && result.text.trim()) {
        console.log(`✅ Transcription successful (${result.processing_time?.toFixed(2)}s): "${result.text}"`);
        onTranscript(result.text.trim());
        setError(null);
      } else {
        const errorMsg = result.error || 'No speech detected';
        console.warn(`⚠️ Transcription failed: ${errorMsg}`);
        setError(errorMsg);
      }

    } catch (error) {
      const errorMsg = `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌', errorMsg);
      setError(errorMsg);
    }
  }, [serverUrl, language, onTranscript]);

  // Test Whisper service availability
  const testWhisperService = useCallback(async () => {
    try {
      const response = await fetch(`${serverUrl}/whisper/health`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Whisper service status:', result);
        return result.status === 'healthy';
      }
      return false;
    } catch {
      return false;
    }
  }, [serverUrl]);

  return {
    isRecording,
    isProcessing,
    isSupported,
    error,
    startRecording,
    stopRecording,
    testWhisperService,
    // For compatibility with existing code
    isListening: isRecording || isProcessing,
    startListening: startRecording,
    stopListening: stopRecording
  };
}; 