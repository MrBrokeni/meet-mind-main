import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { RecordingLanguage, ProcessingState } from '@/types';
import { RECORDING_TIME_LIMIT_MS, AUDIO_MIME_TYPES, TIMEOUTS } from '@/constants';
import { addRecording, type RecordingData } from '@/lib/db';

export const useRecording = (
  hasMicPermission: boolean | null,
  requestMicPermission: () => Promise<boolean>,
  setProcessingState: (state: ProcessingState) => void,
  setError: (error: string | null) => void,
  meetingName: string,
  meetingDate: Date | undefined,
  recordingLanguage: RecordingLanguage,
  onTranscriptionComplete: (audioBlob: Blob, sourceName?: string) => void
) => {
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [liveDialogue, setLiveDialogue] = useState<string>('');
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingLimitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  const getAudioDuration = (blob: Blob): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.warn("getAudioDuration called outside of browser environment. Returning 0.");
        return resolve(0);
      }
      if (!blob || blob.size === 0) {
        console.warn("getAudioDuration called with empty blob. Returning 0.");
        return resolve(0);
      }

      const audio = document.createElement('audio');
      const objectUrl = URL.createObjectURL(blob);
      let timeoutId: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('error', handleError);
        URL.revokeObjectURL(objectUrl);
        audio.src = '';
      };

      const handleLoadedMetadata = () => {
        console.log(`Audio duration determined: ${audio.duration} seconds`);
        resolve(audio.duration && Number.isFinite(audio.duration) ? audio.duration : 0);
        cleanup();
      };

      const handleError = (e: Event | string) => {
        console.error("Error loading audio metadata for duration check:", e);
        resolve(0);
        cleanup();
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('error', handleError);

      audio.preload = 'metadata';
      audio.src = objectUrl;

      timeoutId = setTimeout(() => {
        console.warn("Timeout determining audio duration. Returning 0.");
        resolve(0);
        cleanup();
      }, TIMEOUTS.AUDIO_DURATION);
    });
  };

  const startRealtimeTranscription = useCallback((stream: MediaStream) => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API not supported in this browser.");
      toast({ 
        title: "Browser Support", 
        description: "Live transcription preview not available in this browser.", 
        variant: "default", 
        duration: 6000 
      });
      setLiveDialogue("(Live transcription preview not supported)");
      return;
    }

    if (recognitionRef.current) {
      console.warn("Realtime transcription already started.");
      return;
    }

    console.log(`Setting up realtime transcription in language: ${recordingLanguage}...`);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = recordingLanguage;

    let finalTranscript = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setLiveDialogue(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMsg = `Speech recognition error: ${event.error}`;
      if (event.error === 'no-speech') {
        console.warn('Speech recognition: No speech detected.', event.message);
        return;
      } else {
        console.error('Speech recognition error:', event.error, event.message);
      }

      if (event.error === 'network') {
        errorMsg = "Network error during speech recognition. Check connection.";
      } else if (event.error === 'audio-capture') {
        errorMsg = "Audio capture failed. Ensure microphone is working.";
      } else if (event.error === 'not-allowed') {
        errorMsg = "Speech recognition permission denied.";
        setError("Microphone/Speech Recognition permission denied.");
      } else if (event.error === 'language-not-supported') {
        errorMsg = `The selected language (${recognition.lang}) is not supported by the browser's Speech Recognition.`;
        toast({ title: "Language Not Supported", description: errorMsg, variant: "destructive" });
        setError(errorMsg);
        setProcessingState('error');
      }

      toast({ title: "Live Transcription Error", description: errorMsg, variant: "destructive" });

      if (recognitionRef.current && event.error !== 'no-speech') {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };

    recognition.onend = () => {
      console.log("Speech recognition service disconnected.");
      if (mediaRecorderRef.current?.state === 'recording') {
        console.log("Attempting to restart speech recognition...");
        try {
          if (mediaRecorderRef.current?.state === 'recording') {
            recognition.start();
            console.log("Speech recognition restarted.");
          } else {
            console.log("Not restarting speech recognition as media recorder is not active.");
            recognitionRef.current = null;
          }
        } catch (restartError) {
          console.error("Error restarting speech recognition:", restartError);
          recognitionRef.current = null;
        }
      } else {
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      console.log("Speech recognition started.");
    } catch (startError) {
      console.error("Error starting speech recognition:", startError);
      toast({ 
        title: "Live Transcription Error", 
        description: `Could not start live transcription. Check if the language (${recordingLanguage}) is supported.`, 
        variant: "destructive" 
      });
      recognitionRef.current = null;
    }
  }, [toast, recordingLanguage, setError, setProcessingState]);

  const saveRecording = useCallback(async (audioBlob: Blob, mimeType: string) => {
    if (!audioBlob || audioBlob.size === 0) {
      toast({ title: "Save Error", description: "No audio data to save.", variant: "destructive" });
      setProcessingState('error');
      setError('No audio data was captured to save.');
      return;
    }

    let duration = 0;
    if (recordingStartTime !== null) {
      duration = (Date.now() - recordingStartTime) / 1000;
      duration = Math.min(duration, RECORDING_TIME_LIMIT_MS / 1000);
      if (duration <= 0) {
        console.warn("Calculated duration is zero or negative.");
      }
    } else {
      console.warn("Recording start time was missing. Duration cannot be accurately calculated.");
    }

    if (!meetingName.trim()) {
      toast({ title: "Save Error", description: "Please enter a meeting name.", variant: "destructive" });
      setProcessingState('idle');
      setError('Meeting name is required to save.');
      return;
    }
    if (!meetingDate) {
      toast({ title: "Save Error", description: "Please select a meeting date.", variant: "destructive" });
      setProcessingState('idle');
      setError('Meeting date is required to save.');
      return;
    }

    setProcessingState('saving');
    const saveToast = toast({ title: "Saving recording...", duration: Infinity });

    try {
      const timestamp = meetingDate ? meetingDate.getTime() : (recordingStartTime ?? Date.now());
      const name = meetingName.trim();

      const recordingData: Omit<RecordingData, 'id'> = {
        name,
        timestamp,
        duration,
        audioBlob,
        blobMimeType: mimeType,
      };

      const newId = await addRecording(recordingData);
      console.log(`Recording saved with ID: ${newId}, duration: ${duration}s`);
      saveToast.update({
        title: "Recording Saved!",
        description: `"${name}" saved locally.`,
        variant: "default",
        duration: 5000,
      });
      
      onTranscriptionComplete(audioBlob, name);

    } catch (error) {
      console.error('Failed to save recording:', error);
      const message = error instanceof Error ? error.message : 'Unknown error.';
      saveToast.update({
        title: "Save Failed",
        description: `Could not save recording: ${message}`,
        variant: "destructive",
        duration: 8000,
      });
      setProcessingState('error');
      setError(`Failed to save recording: ${message}`);
    }
  }, [toast, recordingStartTime, meetingName, meetingDate, setProcessingState, setError, onTranscriptionComplete]);

  const handleStop = useCallback((forcedByLimit = false) => {
    if (recordingLimitTimeoutRef.current) {
      clearTimeout(recordingLimitTimeoutRef.current);
      recordingLimitTimeoutRef.current = null;
    }
    if (recordingTimerIntervalRef.current) {
      clearInterval(recordingTimerIntervalRef.current);
      recordingTimerIntervalRef.current = null;
    }
    setRemainingTime(null);

    if (recognitionRef.current) {
      console.log("Stopping speech recognition...");
      recognitionRef.current.stop();
    } else {
      console.log("Speech recognition ref already null or not started.");
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log("Stopping media recorder...");
      setProcessingState('stopping');
      mediaRecorderRef.current.stop();

      toast({
        title: forcedByLimit ? 'Time Limit Reached' : 'Recording Stopping...',
        description: forcedByLimit
          ? `Recording automatically stopped after ${RECORDING_TIME_LIMIT_MS / (60 * 1000)} minutes. Saving audio...`
          : 'Preparing to save and transcribe audio.',
        variant: forcedByLimit ? 'default' : 'default',
      });
    } else {
      console.warn("Stop called but MediaRecorder not active or already stopping.");
      if (!['stopping', 'saving', 'transcribing'].includes(mediaRecorderRef.current?.state || '')) {
        console.log(`Stop called in unexpected state, resetting.`);
      }
    }
  }, [toast, setProcessingState]);

  const handleRecord = useCallback(async () => {
    if (!meetingName.trim()) {
      toast({ title: "Missing Information", description: "Please enter a meeting name.", variant: "destructive" });
      setError("Meeting name is required to start recording.");
      return;
    }
    if (!meetingDate) {
      toast({ title: "Missing Information", description: "Please select a meeting date.", variant: "destructive" });
      setError("Meeting date is required to start recording.");
      return;
    }

    if (hasMicPermission !== true) {
      const permissionGranted = await requestMicPermission();
      if (!permissionGranted) {
        return;
      }
    }

    setError(null);
    setProcessingState('recording');
    const startTime = Date.now();
    setRecordingStartTime(startTime);
    setLiveDialogue('');
    setRemainingTime(RECORDING_TIME_LIMIT_MS / 1000);

    if (recordingLimitTimeoutRef.current) clearTimeout(recordingLimitTimeoutRef.current);
    recordingLimitTimeoutRef.current = setTimeout(() => {
      console.log("Recording time limit reached.");
      handleStop(true);
    }, RECORDING_TIME_LIMIT_MS);

    if (recordingTimerIntervalRef.current) clearInterval(recordingTimerIntervalRef.current);
    recordingTimerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const timeLeft = Math.max(0, RECORDING_TIME_LIMIT_MS - elapsed);
      setRemainingTime(Math.round(timeLeft / 1000));
      if (timeLeft <= 0) {
        clearInterval(recordingTimerIntervalRef.current!);
        recordingTimerIntervalRef.current = null;
      }
    }, 1000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = AUDIO_MIME_TYPES[0];
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = AUDIO_MIME_TYPES[1];
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = AUDIO_MIME_TYPES[2];
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }
        }
      }
      console.log("Using MIME type for recording:", mimeType || "browser default");

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: mimeType || undefined });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log("MediaRecorder stopped, chunks collected:", audioChunksRef.current.length);

        if (recordingLimitTimeoutRef.current) {
          clearTimeout(recordingLimitTimeoutRef.current);
          recordingLimitTimeoutRef.current = null;
        }
        if (recordingTimerIntervalRef.current) {
          clearInterval(recordingTimerIntervalRef.current);
          recordingTimerIntervalRef.current = null;
        }
        setRemainingTime(null);

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
          const recorderMimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          console.log("Blob created, size:", audioBlob.size, "type:", recorderMimeType);

          saveRecording(audioBlob, recorderMimeType);
        } else {
          console.warn("No audio chunks recorded.");
          setError("No audio data was recorded.");
          setProcessingState('error');
          toast({ title: "Recording Error", description: "No audio data was captured.", variant: "destructive" });
        }
        stream.getTracks().forEach(track => track.stop());
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        let errorMessage = 'Unknown recording error';
        if (event instanceof Event && 'error' in event && event.error instanceof DOMException) {
          errorMessage = event.error.message;
        } else if (typeof event === 'object' && event !== null && 'type' in event && event.type === 'error') {
          errorMessage = `MediaRecorder error event type: ${event.type}`;
        }

        if (recordingLimitTimeoutRef.current) {
          clearTimeout(recordingLimitTimeoutRef.current);
          recordingLimitTimeoutRef.current = null;
        }
        if (recordingTimerIntervalRef.current) {
          clearInterval(recordingTimerIntervalRef.current);
          recordingTimerIntervalRef.current = null;
        }
        setRemainingTime(null);

        setError(`Recording error: ${errorMessage}`);
        setProcessingState('error');
        toast({ title: "Recording Failed", description: `An error occurred during recording: ${errorMessage}`, variant: "destructive" });
        stream.getTracks().forEach(track => track.stop());
        if (recognitionRef.current) recognitionRef.current.stop();
        mediaRecorderRef.current = null;
        recognitionRef.current = null;
        setRecordingStartTime(null);
      };

      mediaRecorderRef.current.start(1000);
      toast({
        title: 'Recording started!',
        description: `Click Stop & Save when finished. Language: ${recordingLanguage}. Time limit: ${RECORDING_TIME_LIMIT_MS / (60 * 1000)} minutes.`,
      });

      startRealtimeTranscription(stream);

    } catch (err) {
      console.error('Error setting up MediaRecorder or getting stream:', err);
      let userMessage = 'Failed to initialize recorder. Please try again.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          userMessage = 'Microphone access denied. Please enable permissions.';
          setProcessingState('permission_denied');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          userMessage = 'No microphone found. Please ensure a microphone is connected and enabled.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          userMessage = 'Microphone is already in use or cannot be accessed. Try closing other apps using the mic.';
        } else {
          userMessage = `Could not start recording due to a hardware/browser issue (${err.name}).`;
        }
      } else if (err instanceof Error) {
        userMessage = `An unexpected error occurred: ${err.message}`;
      } else {
        userMessage = `An unexpected error occurred.`;
      }

      if (recordingLimitTimeoutRef.current) {
        clearTimeout(recordingLimitTimeoutRef.current);
        recordingLimitTimeoutRef.current = null;
      }
      if (recordingTimerIntervalRef.current) {
        clearInterval(recordingTimerIntervalRef.current);
        recordingTimerIntervalRef.current = null;
      }
      setRemainingTime(null);

      setError(userMessage);
      setProcessingState('error');
      toast({
        title: 'Recording Setup Failed',
        description: userMessage,
        variant: 'destructive',
      });
      setRecordingStartTime(null);
    }
  }, [hasMicPermission, requestMicPermission, toast, setError, setProcessingState, meetingName, meetingDate, recordingLanguage, startRealtimeTranscription, saveRecording, handleStop]);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast({ title: "Invalid File Type", description: "Please upload a valid audio file.", variant: "destructive" });
      return;
    }
    console.log(`Uploaded file selected: ${file.name}, Type: ${file.type}, Size: ${file.size}`);

    setProcessingState('saving');
    const uploadToast = toast({
      title: 'Processing Uploaded File...',
      description: `Preparing "${file.name}"...`,
      duration: Infinity,
    });

    try {
      const audioBlob = new Blob([file], { type: file.type });
      let duration = 0;
      try {
        duration = await getAudioDuration(audioBlob);
        if (duration === 0 && audioBlob.size > 0) {
          console.warn("Uploaded file duration is 0, but size is > 0.");
        }
      } catch (durationError) {
        console.warn("Could not determine duration of uploaded file:", durationError);
        toast({ title: "Upload Warning", description: "Could not automatically determine audio duration for the uploaded file. Duration will be 0.", variant: "default" });
        duration = 0;
      }

      const nameWithoutExtension = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const dateMatch = nameWithoutExtension.match(/(\d{4}-\d{2}-\d{2}|\d{2}[-\/]\d{2}[-\/]\d{2,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
      let parsedDate = new Date();
      if (dateMatch && dateMatch[0]) {
        try {
          const dateStr = dateMatch[0].replace(/[\/\-]/g, '/');
          const parts = dateStr.split('/');
          let potentialDate;
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              potentialDate = new Date(`${parts[0]}/${parts[1]}/${parts[2]}`);
            } else if (parts[2].length === 4) {
              potentialDate = new Date(`${parts[0]}/${parts[1]}/${parts[2]}`);
              if (isNaN(potentialDate.getTime())) {
                potentialDate = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
              }
            }
          } else {
            potentialDate = new Date(dateMatch[0]);
          }

          if (potentialDate && !isNaN(potentialDate.getTime())) {
            parsedDate = potentialDate;
          }
        } catch (dateError) {
          console.warn("Could not parse date from filename, using today.", dateError);
        }
      }

      const recordingData: Omit<RecordingData, 'id'> = {
        name: nameWithoutExtension,
        timestamp: parsedDate.getTime(),
        duration,
        audioBlob,
        blobMimeType: file.type,
      };

      const newId = await addRecording(recordingData);
      console.log(`Uploaded file saved as recording with ID: ${newId}, duration: ${duration}s`);
      uploadToast.update({
        title: "Upload Saved!",
        description: `"${file.name}" saved locally.`,
        variant: "default",
        duration: 5000,
      });

      onTranscriptionComplete(audioBlob, nameWithoutExtension);

    } catch (err) {
      console.error('Error processing uploaded file:', err);
      const message = err instanceof Error ? err.message : 'Unknown error during upload processing.';
      setError(`Upload processing failed: ${message}`);
      setProcessingState('error');
      uploadToast.update({
        title: 'Upload Processing Failed',
        description: message,
        variant: 'destructive',
        duration: 8000,
      });
    }
  }, [toast, setProcessingState, setError, onTranscriptionComplete, getAudioDuration]);

  const resetRecording = useCallback(() => {
    setRecordingStartTime(null);
    setLiveDialogue('');
    setRemainingTime(null);

    if (recordingLimitTimeoutRef.current) {
      clearTimeout(recordingLimitTimeoutRef.current);
      recordingLimitTimeoutRef.current = null;
    }
    if (recordingTimerIntervalRef.current) {
      clearInterval(recordingTimerIntervalRef.current);
      recordingTimerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      handleStop();
    } else {
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      mediaRecorderRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    audioChunksRef.current = [];
  }, [handleStop]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        console.log("Cleaned up MediaRecorder on unmount.");
      }
      mediaRecorderRef.current = null;

      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
        console.log("Cleaned up SpeechRecognition on unmount.");
      }

      if (recordingLimitTimeoutRef.current) {
        clearTimeout(recordingLimitTimeoutRef.current);
        recordingLimitTimeoutRef.current = null;
      }
      if (recordingTimerIntervalRef.current) {
        clearInterval(recordingTimerIntervalRef.current);
        recordingTimerIntervalRef.current = null;
      }
    };
  }, []);

  return {
    recordingStartTime,
    liveDialogue,
    remainingTime,
    handleRecord,
    handleStop,
    handleUpload,
    resetRecording,
    mediaRecorderRef,
    audioChunksRef,
    recognitionRef,
  };
};
