import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

// Extended Web Speech API interfaces for cross-browser TypeScript compatibility
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
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
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
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  }
}

/**
 * Mobile-compatible MIME Type Detector for MediaRecorder / WebAudio chunk encoding
 */
export const getSupportedAudioMimeType = (): string => {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidateTypes = [
    'audio/mp4',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/aac',
    'audio/ogg',
    'audio/wav'
  ];
  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
};

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

/**
 * Mobile-Sanitized Audio Constraints for iOS Safari & Android Chrome
 */
const MOBILE_AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }
};

export function useLiveTranscriber(
  onTranscriptChange?: (text: string) => void
): UseLiveTranscriberReturn {
  const [status, setStatus] = useState<TranscriberStatus>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  const baseTranscriptRef = useRef<string>('');
  const transcriptRef = useRef<string>('');
  transcriptRef.current = transcript;

  const onTranscriptChangeRef = useRef(onTranscriptChange);
  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  /**
   * Unlocks AudioContext directly inside user touch/click gesture
   * Required for iOS Safari & Android Chrome autoplay/audio policies
   */
  const unlockAudioContextOnGesture = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioCtx();
        }
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch((e) => console.warn('AudioContext resume catch:', e));
        }
      }
    } catch (err) {
      console.warn('AudioContext unlock gesture attempt:', err);
    }
  }, []);

  // Stop active media stream tracks
  const stopMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  // Stop recognition completely
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    isPausedRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors on stop
      }
    }
    stopMediaStream();
    setStatus('idle');
    setInterimTranscript('');
  }, [stopMediaStream]);

  // Pause listening session
  const pauseListening = useCallback(() => {
    isListeningRef.current = false;
    isPausedRef.current = true;
    baseTranscriptRef.current = transcriptRef.current;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors on pause
      }
    }
    stopMediaStream();
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
      const noSupportMsg = 'Speech Recognition is not supported in this browser. Please try Chrome or Safari.';
      setError(noSupportMsg);
      setStatus('error');
      toast.error(noSupportMsg);
      return;
    }

    // Acquire media stream with sanitized mobile audio constraints
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(MOBILE_AUDIO_CONSTRAINTS);
        } catch (constraintErr: any) {
          if (constraintErr.name === 'OverconstrainedError') {
            console.warn('Mobile audio overconstrained, falling back to default audio constraint');
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } else {
            throw constraintErr;
          }
        }
        mediaStreamRef.current = stream;
      }
    } catch (err: any) {
      let friendlyError = 'Microphone access denied or unavailable.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        friendlyError = 'Microphone permission denied. Please allow microphone access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyError = 'No microphone detected on your device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        friendlyError = 'Microphone is currently in use by another app.';
      } else if (err.message) {
        friendlyError = `Microphone error: ${err.message}`;
      }

      console.error('getUserMedia mobile error:', err);
      toast.error(friendlyError);
      setError(friendlyError);
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
    recognition.lang = 'en-US';

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
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      let errText = `Speech recognition error: ${event.error}`;
      if (event.error === 'not-allowed') {
        errText = 'Microphone access was blocked or denied.';
      }
      toast.error(errText);
      setError(errText);
      setStatus('error');
      isListeningRef.current = false;
      isPausedRef.current = false;
      stopMediaStream();
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        baseTranscriptRef.current = transcriptRef.current;
        try {
          recognition.start();
        } catch {
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
      toast.error(errMsg);
      setError(errMsg);
      setStatus('error');
      isListeningRef.current = false;
      isPausedRef.current = false;
      stopMediaStream();
    }
  }, [stopMediaStream]);

  // Public startListening trigger (executes AudioContext unlock synchronously on touch gesture)
  const startListening = useCallback(() => {
    unlockAudioContextOnGesture();
    setError(null);
    isListeningRef.current = true;
    isPausedRef.current = false;
    baseTranscriptRef.current = transcriptRef.current;
    initAndStartRecognition();
  }, [unlockAudioContextOnGesture, initAndStartRecognition]);

  // Public resumeListening trigger from paused state
  const resumeListening = useCallback(() => {
    unlockAudioContextOnGesture();
    setError(null);
    isListeningRef.current = true;
    isPausedRef.current = false;
    baseTranscriptRef.current = transcriptRef.current;
    initAndStartRecognition();
  }, [unlockAudioContextOnGesture, initAndStartRecognition]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      isPausedRef.current = false;
      stopMediaStream();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch {
          // Ignore close errors
        }
      }
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
