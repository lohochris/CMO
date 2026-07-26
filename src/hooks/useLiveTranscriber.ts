import { useState, useEffect, useRef, useCallback } from 'react';

// Web Speech API Type Declarations for TypeScript
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export type TranscriberStatus = 'idle' | 'listening' | 'paused' | 'error';

export interface UseLiveTranscriberReturn {
  status: TranscriberStatus;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  pauseListening: () => void;
  resumeListening: () => void;
  resetTranscript: () => void;
}

export function useLiveTranscriber(
  onTranscriptChange?: (text: string) => void
): UseLiveTranscriberReturn {
  const [status, setStatus] = useState<TranscriberStatus>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const baseTranscriptRef = useRef<string>('');
  const transcriptRef = useRef<string>('');
  const onTranscriptChangeRef = useRef(onTranscriptChange);

  // Keep callback ref updated
  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  // Keep transcriptRef synchronized with transcript state
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Stop active media stream tracks
  const stopMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  // Safely stop recognition completely
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    isPausedRef.current = false;
    stopMediaStream();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Handle case where recognition was already stopped
      }
      recognitionRef.current = null;
    }

    setStatus('idle');
    setInterimTranscript('');
  }, [stopMediaStream]);

  // Pause recognition temporarily without terminating session context
  const pauseListening = useCallback(() => {
    isListeningRef.current = false;
    isPausedRef.current = true;
    stopMediaStream();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
      recognitionRef.current = null;
    }

    setStatus('paused');
    setInterimTranscript('');
  }, [stopMediaStream]);

  // Reset transcripts and buffer state
  const resetTranscript = useCallback(() => {
    baseTranscriptRef.current = '';
    transcriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    if (!isListeningRef.current) {
      setStatus('idle');
    }
    onTranscriptChangeRef.current?.('');
  }, []);

  // Initialize and start recognition instance
  const initAndStartRecognition = useCallback(async () => {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setError('Web Speech API is not supported in this browser.');
      setStatus('error');
      return;
    }

    // Acquire media stream to ensure microphone access
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Microphone permission denied';
      setError(`Microphone access error: ${errMsg}`);
      setStatus('error');
      isListeningRef.current = false;
      isPausedRef.current = false;
      return;
    }

    // Clean up existing recognition instance if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-NG'; // Nigerian English compatibility (falls back gracefully)

    recognition.onstart = () => {
      setStatus('listening');
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let sessionFinal = '';
      let currentInterim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript?.trim() || '';
        if (result.isFinal) {
          sessionFinal += (sessionFinal ? ' ' : '') + text;
        } else {
          currentInterim += (currentInterim ? ' ' : '') + text;
        }
      }

      const base = baseTranscriptRef.current;
      const updatedFinal = base
        ? sessionFinal
          ? `${base} ${sessionFinal}`
          : base
        : sessionFinal;

      setTranscript(updatedFinal);
      setInterimTranscript(currentInterim);

      const combinedLiveText = updatedFinal
        ? currentInterim
          ? `${updatedFinal} ${currentInterim}`
          : updatedFinal
        : currentInterim;

      onTranscriptChangeRef.current?.(combinedLiveText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Don't treat transient no-speech or aborted as fatal error if still listening or paused
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      setError(`Speech recognition error: ${event.error}`);
      setStatus('error');
      isListeningRef.current = false;
      isPausedRef.current = false;
      stopMediaStream();
    };

    recognition.onend = () => {
      // Auto-reconnect on silent gaps while user has not explicitly stopped or paused listening
      if (isListeningRef.current) {
        baseTranscriptRef.current = transcriptRef.current;
        try {
          recognition.start();
        } catch {
          // If restart fails, attempt full re-init after brief delay
          setTimeout(() => {
            if (isListeningRef.current) {
              initAndStartRecognition();
            }
          }, 300);
        }
      } else if (isPausedRef.current) {
        setStatus('paused');
        setInterimTranscript('');
        stopMediaStream();
      } else {
        setStatus('idle');
        setInterimTranscript('');
        stopMediaStream();
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Failed to start speech recognition';
      setError(errMsg);
      setStatus('error');
      isListeningRef.current = false;
      isPausedRef.current = false;
      stopMediaStream();
    }
  }, [stopMediaStream]);

  // Public startListening trigger
  const startListening = useCallback(() => {
    setError(null);
    isListeningRef.current = true;
    isPausedRef.current = false;
    baseTranscriptRef.current = transcriptRef.current;
    initAndStartRecognition();
  }, [initAndStartRecognition]);

  // Public resumeListening trigger from paused state
  const resumeListening = useCallback(() => {
    setError(null);
    isListeningRef.current = true;
    isPausedRef.current = false;
    baseTranscriptRef.current = transcriptRef.current;
    initAndStartRecognition();
  }, [initAndStartRecognition]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      isPausedRef.current = false;
      stopMediaStream();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [stopMediaStream]);

  return {
    status,
    isListening: status === 'listening',
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    resetTranscript,
  };
}

export default useLiveTranscriber;
