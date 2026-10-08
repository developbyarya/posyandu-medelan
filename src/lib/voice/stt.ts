import { useState, useCallback, useRef } from 'react';
import { useOnline } from '../pwa';

// Chrome/WebKit type extension
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useStt() {
  const isOnline = useOnline();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isOnline) {
      setError('Fitur suara membutuhkan koneksi internet (karena kebijakan Android/Chrome).');
      return;
    }
    if (!isSupported) {
      setError('Browser ini tidak mendukung fitur pengenalan suara.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setError('Izin mikrofon ditolak.');
      } else if (event.error === 'network') {
        setError('Layanan suara browser gagal (sering terjadi di Microsoft Edge). Mohon gunakan Google Chrome.');
      } else {
        setError(`Error suara: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e: any) {
      setError(e.message);
      setIsListening(false);
    }
  }, [isOnline, isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    isSupported,
    isOnline,
    isListening,
    transcript,
    error,
    startListening,
    stopListening
  };
}
