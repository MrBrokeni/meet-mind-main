
// src/app/page.tsx
'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CheckCircle2,
  ClipboardList,
  HelpCircle,
  Mic,
  Target,
  Terminal,
  Timer,
  Languages,
  FileText,
  ListChecks,
  BookOpen,
  Loader2,
  Copy,
  Smile,
  Frown,
  Meh,
  Sparkles,
  Tags,
  StopCircle,
  FileAudio,
  RotateCcw,
  AlertCircle,
  Save,
  PanelLeft,
  Trash2,
  Speech,
  Download,
  FileCode,
  Presentation,
  FileDown,
  Printer,
  ChevronDown,
  CalendarDays,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  translateTranscript,
  type TranslateTranscriptInput,
  type TranslateTranscriptOutput,
} from '@/ai/flows/translate-transcript';
import {
  extractKeyPoints,
  type ExtractKeyPointsInput,
  type ExtractKeyPointsOutput,
} from '@/ai/flows/extract-key-points';
import {
  analyzeSentiment,
  type AnalyzeSentimentInput,
  type AnalyzeSentimentOutput,
} from '@/ai/flows/analyze-sentiment';
import {
  detectTopics,
  type DetectTopicsInput,
  type DetectTopicsOutput,
} from '@/ai/flows/detect-topics';
import {
  transcribeAudio,
  type TranscribeAudioInput,
  type TranscribeAudioOutput,
} from '@/ai/flows/transcribe-audio';
import {
    generateExportContent,
    type GenerateExportContentInput,
    type GenerateExportContentOutput,
} from '@/ai/flows/generate-export-content';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from '@/components/ui/input';
import {
    addRecording,
    getAllRecordingsMetadata,
    getRecording,
    deleteRecording,
    type RecordingMetadata,
    type RecordingData,
} from '@/lib/db';
import { MeetingSidebar } from '@/components/MeetingSidebar';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { marked } from 'marked';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';

type ExportFormat = 'docx' | 'pptx' | 'pdf';

type ProcessingState =
  | 'idle'
  | 'checking_permission'
  | 'permission_denied'
  | 'recording'
  | 'stopping'
  | 'transcribing'
  | 'saving'
  | 'loading_recording'
  | 'processing'
  | 'generating_export'
  | 'done'
  | 'export_ready'
  | 'error';

type Sentiment = 'positive' | 'negative' | 'neutral';
type RecordingLanguage = 'en-US' | 'sw-TZ';

const RECORDING_TIME_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

export default function App() {
  return (
     <SidebarProvider defaultOpen={true} suppressHydrationWarning={true}>
        <PageContent />
     </SidebarProvider>
  );
}

function PageContent() {
  const [transcript, setTranscript] = useState<string>('');
  const [analysisLanguage, setAnalysisLanguage] = useState<'en' | 'sw'>('en');
  const [recordingLanguage, setRecordingLanguage] = useState<RecordingLanguage>('en-US');
  const [translatedTranscript, setTranslatedTranscript] = useState<string>('');
  const [keyPoints, setKeyPoints] = useState<ExtractKeyPointsOutput | null>(null);
  const [sentimentResult, setSentimentResult] = useState<AnalyzeSentimentOutput | null>(null);
  const [topicsResult, setTopicsResult] = useState<DetectTopicsOutput | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<RecordingMetadata[]>([]);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(true);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [meetingName, setMeetingName] = useState<string>('');
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(undefined);
  const [loadedRecordingId, setLoadedRecordingId] = useState<number | null>(null);
  const [liveDialogue, setLiveDialogue] = useState<string>('');
  const [recordingNamePlaceholder, setRecordingNamePlaceholder] = useState<string>('e.g., Project Kickoff');
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportContent, setExportContent] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);


  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingLimitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toggleSidebar } = useSidebar();

  const isLoading = [
    'stopping',
    'transcribing',
    'saving',
    'loading_recording',
    'processing',
    'generating_export',
  ].includes(processingState);

   const fetchRecordings = useCallback(async () => {
      setIsLoadingRecordings(true);
      try {
        const metadata = await getAllRecordingsMetadata();
        setRecordings(metadata);
      } catch (err) {
        console.error("Failed to fetch recordings:", err);
        toast({
          title: "Error Loading Recordings",
          description: "Could not load saved recordings from local storage.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingRecordings(false);
      }
   }, [toast]);

   useEffect(() => {
      fetchRecordings();
   }, [fetchRecordings]);

   useEffect(() => {
      const today = new Date();
      setCurrentYear(today.getFullYear());
      setMeetingDate(today);
      setRecordingNamePlaceholder(`e.g., Project Kickoff ${format(today, 'dd/MM/yyyy')}`);
   }, []);


   const runTranscription = useCallback(async (audioBlob: Blob, sourceName?: string) => {
     if (!audioBlob || audioBlob.size === 0) {
       setError('No audio data found for transcription.');
       setProcessingState('error');
       toast({ title: "Transcription Error", description: "Cannot transcribe empty audio.", variant: "destructive" });
       return;
     }

     if (processingState === 'transcribing') {
         console.warn("Transcription already in progress.");
         return;
     }

     setProcessingState('transcribing');
     const transcriptionToast = toast({
       title: 'Transcribing audio...',
       description: sourceName ? `Processing ${sourceName}...` : 'Processing audio...',
       duration: Infinity,
     });
     setError(null);
     setTranscript('');

     try {
         const reader = new FileReader();
         reader.readAsDataURL(audioBlob);
         const dataUri = await new Promise<string>((resolve, reject) => {
           reader.onloadend = () => resolve(reader.result as string);
           reader.onerror = (error) => reject(error);
         });

         if (!dataUri.startsWith('data:audio/')) {
            throw new Error(`Invalid audio data URI format. Expected 'data:audio/...' but got start: ${dataUri.substring(0, 30)}`);
         }
         // Pass the determined recordingLanguage to the transcribeAudio input
         const input: TranscribeAudioInput = { audioDataUri: dataUri };
         const result: TranscribeAudioOutput = await transcribeAudio(input);

         if (result.transcript) {
           setTranscript(result.transcript);
           setProcessingState('idle');
           transcriptionToast.update({
              title: 'Transcription complete!',
              description: 'Transcript is ready for processing.',
              variant: 'default',
              duration: 5000,
           });
         } else {
            console.warn('Transcription returned empty string.');
            setError('Transcription result was empty.');
            setProcessingState('error');
            transcriptionToast.update({
               title: 'Transcription Issue',
               description: 'The transcription result was empty.',
               variant: 'destructive',
               duration: 8000,
            });
         }

     } catch (err) {
         console.error('Transcription error:', err);
         const message = err instanceof Error ? err.message : 'Unknown transcription error.';
         setError(`Transcription failed: ${message}`);
         setProcessingState('error');
         transcriptionToast.update({
            title: 'Transcription Failed',
            description: message,
            variant: 'destructive',
            duration: 8000,
         });
     }
   }, [toast, processingState, recordingLanguage]); // Added recordingLanguage dependency


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
         if (!['stopping', 'saving', 'transcribing'].includes(processingState)) {
             console.log(`Stop called in unexpected state (${processingState}), resetting.`);
         }
     }
   }, [toast, processingState]);

    const resetState = useCallback((keepPermissionState = false) => {
      setError(null);
      setKeyPoints(null);
      setTranslatedTranscript('');
      setSentimentResult(null);
      setTopicsResult(null);
      setTranscript('');
      setAnalysisLanguage('en');
      // Don't reset recordingLanguage here, let it persist unless explicitly changed by user
      // setRecordingLanguage('en-US');
      setMeetingName('');
      setMeetingDate(new Date());
      setLoadedRecordingId(null);
      setLiveDialogue('');
      setExportContent('');
      setExportFormat(null);
      setShowExportModal(false);
      setRemainingTime(null);

      if (recordingLimitTimeoutRef.current) {
         clearTimeout(recordingLimitTimeoutRef.current);
         recordingLimitTimeoutRef.current = null;
      }
       if (recordingTimerIntervalRef.current) {
         clearInterval(recordingTimerIntervalRef.current);
         recordingTimerIntervalRef.current = null;
      }

      setProcessingState(
         !keepPermissionState && hasMicPermission === false ? 'permission_denied' : 'idle'
      );
      audioChunksRef.current = [];
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
         handleStop(); // This already handles stopping stream tracks
      } else {
         // Ensure any stray streams are stopped if MediaRecorder wasn't active but a stream might exist
         if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
         }
         mediaRecorderRef.current = null;
      }


      if (recognitionRef.current) {
         recognitionRef.current.stop();
         recognitionRef.current = null;
      }

      setRecordingStartTime(null);

      if (fileInputRef.current) {
         fileInputRef.current.value = '';
      }
       if (!keepPermissionState) {
          toast({
            title: 'Reset Complete',
            description: 'Input and results have been cleared.',
          });
       }
    }, [toast, hasMicPermission, handleStop]);


  const requestMicPermission = useCallback(async (): Promise<boolean> => {
     if (hasMicPermission === null || hasMicPermission === false) {
        setProcessingState('checking_permission');
     }
     setError(null); // Clear previous permission errors

     try {
       let permissionStatus: PermissionStatus | undefined;
       // Attempt to query permission status first (modern browsers)
       try {
           permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
       } catch (queryError) {
            console.warn("Microphone permission query failed (this is common in some browsers like Firefox):", queryError);
            permissionStatus = undefined; // Proceed to getUserMedia if query fails
       }

       if (permissionStatus?.state === 'granted') {
          console.log("Microphone permission already granted.");
          setHasMicPermission(true);
          if (['checking_permission', 'permission_denied'].includes(processingState)) {
             setProcessingState('idle');
          }
          return true;
       }

        if (permissionStatus?.state === 'denied') {
          console.log("Microphone permission explicitly denied by user or policy.");
          setHasMicPermission(false);
          setProcessingState('permission_denied');
          toast({
            title: 'Microphone Access Denied',
            description: 'Please enable microphone permissions in your browser settings to record audio.',
            variant: 'destructive',
            duration: 8000,
          });
          setError('Microphone access is required to record audio.');
          return false;
        }

        // If permission is 'prompt' or query failed, try getUserMedia
        console.log("Requesting microphone permission via getUserMedia...");
        setProcessingState('checking_permission'); // Ensure state reflects we are actively asking
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop the tracks immediately after permission is granted
        console.log("Microphone permission granted via prompt.");
        setHasMicPermission(true);
        setProcessingState('idle');
        return true;

     } catch (err) {
       console.error('Error requesting microphone permission:', err);
       setHasMicPermission(false);
       setProcessingState('permission_denied');
       let message = 'Please enable microphone permissions in your browser settings to record audio.';
       if (err instanceof DOMException) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                message = 'Microphone access was denied. Please enable it in browser settings.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                message = 'No microphone found. Please ensure a microphone is connected and enabled.';
            } else {
                message = `Could not access microphone: ${err.message}. Check browser settings.`;
            }
       }
       toast({
         title: 'Microphone Access Denied',
         description: message,
         variant: 'destructive',
         duration: 8000,
       });
       setError('Microphone access is required to record audio.');
       return false;
     }
  }, [toast, hasMicPermission, processingState]);


   const saveRecording = useCallback(async (audioBlob: Blob, mimeType: string) => {
       if (!audioBlob || audioBlob.size === 0) {
           toast({ title: "Save Error", description: "No audio data to save.", variant: "destructive" });
           setProcessingState('error');
           setError('No audio data was captured to save.');
           return;
       }

        let duration = 0;
        if (recordingStartTime !== null) {
            duration = (Date.now() - recordingStartTime) / 1000; // Duration in seconds
            duration = Math.min(duration, RECORDING_TIME_LIMIT_MS / 1000); // Cap duration at time limit
            if (duration <= 0) {
                console.warn("Calculated duration is zero or negative. This might indicate an issue with timing or premature stop.");
                // Attempt to get duration from blob if possible as a fallback (more complex)
                // For now, we'll stick with the calculated duration, but this is a point for future improvement.
                // duration = await getAudioDuration(audioBlob); // Example of a fallback (ensure getAudioDuration is robust)
            }
        } else {
            console.warn("Recording start time was missing. Duration cannot be accurately calculated and will be 0 or estimated.");
            // duration = await getAudioDuration(audioBlob); // Fallback
        }


       if (!meetingName.trim()) {
          toast({ title: "Save Error", description: "Please enter a meeting name.", variant: "destructive" });
          // Don't reset processing state completely, allow user to enter name
          setProcessingState('idle'); // Or a specific state like 'awaiting_details'
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
         fetchRecordings();
         setLoadedRecordingId(newId);
         runTranscription(audioBlob, name);

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
       } finally {
          // audioChunksRef.current = []; // Clearing chunks is now part of mediaRecorder.onstop
          // setRecordingStartTime(null); // Also handled in onstop or if save fails before onstop
       }

   }, [toast, recordingStartTime, meetingName, meetingDate, fetchRecordings, runTranscription]);


   const startRealtimeTranscription = useCallback((stream: MediaStream) => {
     const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
     if (!SpeechRecognition) {
       console.warn("SpeechRecognition API not supported in this browser.");
       toast({ title: "Browser Support", description: "Live transcription preview not available in this browser.", variant: "default", duration: 6000 });
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
          // Don't show toast or set error state for 'no-speech' as it's common
          // Allow it to potentially restart or simply wait for speech
          return; // Exit early for no-speech
       } else {
          console.error('Speech recognition error:', event.error, event.message);
       }


       if (event.error === 'network') {
           errorMsg = "Network error during speech recognition. Check connection.";
       } else if (event.error === 'audio-capture') {
            errorMsg = "Audio capture failed. Ensure microphone is working.";
       } else if (event.error === 'not-allowed') {
            errorMsg = "Speech recognition permission denied.";
            setHasMicPermission(false);
            setProcessingState('permission_denied');
            setError("Microphone/Speech Recognition permission denied.");
            handleStop(); // Stop recording if permission is lost
       } else if (event.error === 'language-not-supported') {
            errorMsg = `The selected language (${recognition.lang}) is not supported by the browser's Speech Recognition.`;
            toast({ title: "Language Not Supported", description: errorMsg, variant: "destructive" });
            handleStop(); // Stop recording as live transcription won't work
            setError(errorMsg);
            setProcessingState('error');
       }


        toast({ title: "Live Transcription Error", description: errorMsg, variant: "destructive" });


        // Stop recognition service on critical errors, but not for 'no-speech'
        if (recognitionRef.current && event.error !== 'no-speech') {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        }
     };

      recognition.onend = () => {
        console.log("Speech recognition service disconnected.");
        // Only attempt to restart if we are still in 'recording' state
        // and the stop wasn't manually triggered by handleStop (which nullifies recognitionRef.current)
        if (processingState === 'recording' && recognitionRef.current === recognition) {
             console.log("Attempting to restart speech recognition...");
             try {
                // Ensure media recorder is also still active
                if (mediaRecorderRef.current?.state === 'recording') {
                   recognition.start();
                   console.log("Speech recognition restarted.");
                } else {
                     console.log("Not restarting speech recognition as media recorder is not active.");
                     recognitionRef.current = null; // Clear ref if not restarting
                }
             } catch (restartError) {
                console.error("Error restarting speech recognition:", restartError);
                recognitionRef.current = null; // Clear ref on restart error
             }
        } else {
            // If not restarting, ensure the ref is cleared
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
        toast({ title: "Live Transcription Error", description: `Could not start live transcription. Check if the language (${recordingLanguage}) is supported.`, variant: "destructive" });
        recognitionRef.current = null;
     }

   }, [toast, processingState, handleStop, recordingLanguage]);


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
            return; // requestMicPermission already handles UI updates for denial
        }
        // If permission was just granted, hasMicPermission state might not be updated yet.
        // Re-check or assume true if requestMicPermission returned true.
        // For simplicity, we'll proceed, assuming requestMicPermission sets state correctly.
    }


    resetState(true); // Keep permission state, reset other things
    setError(null);
    setProcessingState('recording');
    const startTime = Date.now();
    setRecordingStartTime(startTime);
    setLiveDialogue(''); // Clear previous live dialogue
    setRemainingTime(RECORDING_TIME_LIMIT_MS / 1000);


     // Set timeout for recording limit
     if (recordingLimitTimeoutRef.current) clearTimeout(recordingLimitTimeoutRef.current);
     recordingLimitTimeoutRef.current = setTimeout(() => {
        console.log("Recording time limit reached.");
        handleStop(true); // Forced stop due to time limit
     }, RECORDING_TIME_LIMIT_MS);

      // Interval to update remaining time display
     if (recordingTimerIntervalRef.current) clearInterval(recordingTimerIntervalRef.current);
     recordingTimerIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const timeLeft = Math.max(0, RECORDING_TIME_LIMIT_MS - elapsed);
        setRemainingTime(Math.round(timeLeft / 1000));
        if (timeLeft <= 0) {
            // This check is redundant if handleStop(true) is called by timeout,
            // but good as a fallback.
            clearInterval(recordingTimerIntervalRef.current!);
            recordingTimerIntervalRef.current = null;
        }
     }, 1000);


    try {
       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

       let mimeType = 'audio/webm;codecs=opus'; // Preferred for quality and compatibility
       if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/ogg;codecs=opus'; // Fallback
          if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'audio/mp4'; // Further fallback (might be larger or less ideal)
               if (!MediaRecorder.isTypeSupported(mimeType)) {
                   mimeType = ''; // Browser default (less predictable)
               }
          }
       }
       console.log("Using MIME type for recording:", mimeType || "browser default");

       mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: mimeType || undefined });
       audioChunksRef.current = []; // Clear any previous chunks

       mediaRecorderRef.current.ondataavailable = (event) => {
         if (event.data.size > 0) {
           audioChunksRef.current.push(event.data);
         }
       };

       mediaRecorderRef.current.onstop = () => {
         console.log("MediaRecorder stopped, chunks collected:", audioChunksRef.current.length);

         // Clear timers
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
             // runTranscription is now called within saveRecording after successful save

         } else {
              console.warn("No audio chunks recorded.");
              setError("No audio data was recorded.");
              setProcessingState('error');
              toast({ title: "Recording Error", description: "No audio data was captured.", variant: "destructive" });
         }
          stream.getTracks().forEach(track => track.stop()); // Important: stop the stream tracks
          mediaRecorderRef.current = null; // Clean up MediaRecorder instance
          audioChunksRef.current = []; // Clear chunks after processing
          // setRecordingStartTime(null); // Reset start time after processing
       };

       mediaRecorderRef.current.onerror = (event) => {
            console.error('MediaRecorder error:', event);
            let errorMessage = 'Unknown recording error';
            // Try to get a more specific error message if possible
             if (event instanceof Event && 'error' in event && event.error instanceof DOMException) {
               errorMessage = event.error.message;
             } else if (typeof event === 'object' && event !== null && 'type' in event && event.type === 'error') {
                // Generic event object
                errorMessage = `MediaRecorder error event type: ${event.type}`;
             }

             // Clear timers
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
            if (recognitionRef.current) recognitionRef.current.stop(); // Stop speech recognition if it was running
            mediaRecorderRef.current = null; // Clean up
            recognitionRef.current = null;
             setRecordingStartTime(null); // Reset start time
       };

       mediaRecorderRef.current.start(1000); // Start recording, collect data every 1s (or adjust as needed)
       toast({
         title: 'Recording started!',
         description: `Click Stop & Save when finished. Language: ${recordingLanguage}. Time limit: ${RECORDING_TIME_LIMIT_MS / (60 * 1000)} minutes.`,
       });

        startRealtimeTranscription(stream); // Start live transcription preview


     } catch (err) {
       console.error('Error setting up MediaRecorder or getting stream:', err);
       let userMessage = 'Failed to initialize recorder. Please try again.';
        if (err instanceof DOMException) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
               userMessage = 'Microphone access denied. Please enable permissions.';
               setHasMicPermission(false); // Update permission state
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

        // Clear timers if setup fails
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
       setProcessingState('error'); // Or 'permission_denied' if appropriate
       toast({
         title: 'Recording Setup Failed',
         description: userMessage,
         variant: 'destructive',
       });
       setRecordingStartTime(null); // Reset start time
     }
  }, [resetState, hasMicPermission, requestMicPermission, toast, saveRecording, startRealtimeTranscription, meetingName, meetingDate, recordingLanguage, handleStop]);


  useEffect(() => {
     // This effect handles initial permission check and listens for changes.
     const checkAndListenPermission = async () => {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.permissions) {
          try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            setHasMicPermission(permissionStatus.state === 'granted'); // Initial state

             if (permissionStatus.state === 'denied' && processingState !== 'permission_denied') {
                // If already denied, ensure UI reflects this if not already set
                setProcessingState('permission_denied');
                setError('Microphone access is required to record audio.');
             } else if (permissionStatus.state === 'granted' && processingState === 'permission_denied') {
                 // If it was denied but now granted (e.g., user changed settings), reset to idle
                 setProcessingState('idle');
                 setError(null);
             } else if (processingState === 'checking_permission' && permissionStatus.state !== 'prompt') {
                 // If we were checking and it's no longer prompt, go idle or denied
                 setProcessingState(permissionStatus.state === 'granted' ? 'idle' : 'permission_denied');
                 if (permissionStatus.state === 'denied') setError('Microphone access is required to record audio.');
             }


            permissionStatus.onchange = () => {
               const isGranted = permissionStatus.state === 'granted';
               setHasMicPermission(isGranted);
                console.log("Microphone permission changed:", permissionStatus.state);

                if(!isGranted && processingState === 'recording'){
                    // Microphone access revoked during an active recording
                    handleStop(); // Stop the recording
                    setProcessingState('permission_denied');
                    setError('Microphone access was revoked during recording.');
                    toast({title: "Permission Revoked", description: "Microphone access was revoked. Recording stopped.", variant: "destructive"});
                } else if (!isGranted && processingState !== 'permission_denied'){
                    // Permission denied/revoked when not recording but not already in denied state
                    setProcessingState('permission_denied');
                    setError('Microphone access is required to record audio.');
                } else if (isGranted && processingState === 'permission_denied') {
                    // Permission granted after being in a denied state
                    setProcessingState('idle');
                    setError(null);
                    toast({title: "Permission Granted", description: "Microphone access enabled.", variant: "default"});
                }
            };
          } catch (error) {
            console.error("Error checking/listening microphone permission:", error);
            // If permission query itself fails (e.g. Firefox throws for 'microphone'),
            // hasMicPermission remains null, user will be prompted on record attempt.
            if (error instanceof TypeError && error.message.includes("not a valid value for enumeration PermissionName")) {
                 console.warn("Browser might not support querying 'microphone' permission status proactively. Will prompt on record.");
                 // Set to null so UI shows "Request Mic Access" or similar
                 setHasMicPermission(null);
                 if (processingState === 'checking_permission' || processingState === 'permission_denied') {
                    // If we were in a specific permission-related state, fall back to idle to allow user interaction
                    // setProcessingState('idle');
                 }
            } else {
                 // For other errors, assume permission unknown
                 setHasMicPermission(null);
                  if (processingState === 'checking_permission' || processingState === 'permission_denied') {
                    // setProcessingState('idle');
                  }
            }
          }
        } else {
             console.warn("Permissions API or MediaDevices not fully supported. Proactive check/listening unavailable. Will prompt on record.");
             setHasMicPermission(null); // Assume unknown, prompt on record attempt
              if (processingState === 'checking_permission' || processingState === 'permission_denied') {
                // setProcessingState('idle');
              }
        }
     };
     checkAndListenPermission();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processingState]); // Re-run if processingState changes to handle specific UI updates


  const handleUploadClick = () => {
     if (isLoading || processingState === 'recording' || processingState === 'checking_permission') return;
     resetState(true);
     setError(null);
     fileInputRef.current?.click();
  };

   const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
       const file = event.target.files?.[0];
       if (!file) return;

       if (!file.type.startsWith('audio/')) {
           toast({ title: "Invalid File Type", description: "Please upload a valid audio file.", variant: "destructive" });
           if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input
           return;
       }
       console.log(`Uploaded file selected: ${file.name}, Type: ${file.type}, Size: ${file.size}`);

       resetState(true); // Keep permission state, reset others
       setProcessingState('saving'); // Indicate we are processing the file
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
                   console.warn("Uploaded file duration is 0, but size is > 0. This might be an issue with duration detection or a very short file.");
                }
            } catch (durationError) {
                 console.warn("Could not determine duration of uploaded file:", durationError);
                 toast({title: "Upload Warning", description: "Could not automatically determine audio duration for the uploaded file. Duration will be 0.", variant:"default"});
                 duration = 0; // Default to 0 if detection fails
            }


            // Try to set meeting name and date from file name, otherwise use defaults
            const nameWithoutExtension = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            setMeetingName(nameWithoutExtension); // Set meeting name from file

            // Attempt to parse date from filename (basic regex, can be improved)
            const dateMatch = nameWithoutExtension.match(/(\d{4}-\d{2}-\d{2}|\d{2}[-\/]\d{2}[-\/]\d{2,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
            let parsedDate = new Date(); // Default to today
             if (dateMatch && dateMatch[0]) {
                try {
                    // Normalize date string for Date constructor if needed (e.g. d/m/y to m/d/y)
                    // This is a simple attempt, more robust parsing might be needed for various formats
                    const dateStr = dateMatch[0].replace(/[\/\-]/g, '/');
                    const parts = dateStr.split('/');
                    let potentialDate;
                    if (parts.length === 3) {
                        if (parts[0].length === 4) { // yyyy/mm/dd
                            potentialDate = new Date(`${parts[0]}/${parts[1]}/${parts[2]}`);
                        } else if (parts[2].length === 4) { // mm/dd/yyyy or dd/mm/yyyy
                           // Try mm/dd/yyyy first
                           potentialDate = new Date(`${parts[0]}/${parts[1]}/${parts[2]}`);
                           if (isNaN(potentialDate.getTime())) {
                               // Try dd/mm/yyyy if mm/dd/yyyy failed
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
             setMeetingDate(parsedDate); // Set meeting date

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
             fetchRecordings(); // Refresh recordings list
             setLoadedRecordingId(newId); // Set as current loaded recording

             // Transcribe the uploaded file
             runTranscription(audioBlob, nameWithoutExtension);

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
        } finally {
            // Reset the file input so the same file can be selected again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
   }, [resetState, toast, fetchRecordings, runTranscription]);

    const getAudioDuration = (blob: Blob): Promise<number> => {
       return new Promise((resolve, reject) => {
           if (typeof window === 'undefined' || typeof document === 'undefined') {
               // Running outside browser environment (e.g., SSR)
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
                URL.revokeObjectURL(objectUrl); // Important to release resource
                audio.src = ''; // Prevent further loading
           };

           const handleLoadedMetadata = () => {
                console.log(`Audio duration determined: ${audio.duration} seconds`);
                resolve(audio.duration && Number.isFinite(audio.duration) ? audio.duration : 0);
                cleanup();
           };

           const handleError = (e: Event | string) => {
                console.error("Error loading audio metadata for duration check:", e);
                 resolve(0); // Resolve with 0 on error, as per previous behavior
                 cleanup();
           };

           audio.addEventListener('loadedmetadata', handleLoadedMetadata);
           audio.addEventListener('error', handleError);

           audio.preload = 'metadata'; // Only need metadata
           audio.src = objectUrl;

           // Timeout to prevent hanging if metadata never loads
           timeoutId = setTimeout(() => {
                console.warn("Timeout (5s) determining audio duration. Returning 0.");
                resolve(0);
                cleanup();
           }, 5000); // 5 seconds timeout
       });
    };


    const handleSelectRecording = useCallback(async (id: number) => {
        if (isLoading || processingState === 'recording' || processingState === 'checking_permission') {
            toast({ title: "Busy", description: "Please wait for the current operation to finish.", variant: "default"});
            return;
        }
        resetState(true); // Keep permission status, reset others
        setProcessingState('loading_recording');
        const loadToast = toast({ title: "Loading recording...", duration: Infinity });

        try {
            const recording = await getRecording(id);
            if (recording) {
                setLoadedRecordingId(id);
                setMeetingName(recording.name);
                setMeetingDate(new Date(recording.timestamp));
                // Attempt to infer recordingLanguage if it was stored or based on common patterns in name/type
                // This is a placeholder for a more robust language detection/storage mechanism
                const langFromMime = recording.blobMimeType.includes('sw') ? 'sw-TZ' : 'en-US';
                // You might want to store language with the recording in the future.
                // For now, we assume new recordings use the current `recordingLanguage` state.
                // When loading, we can either default, guess, or let user re-specify.
                // Setting it here allows re-transcription to potentially use it.
                setRecordingLanguage(langFromMime as RecordingLanguage); // Basic guess

                loadToast.update({ title: "Recording Loaded!", description: `"${recording.name}" ready for transcription/analysis.`, duration: 3000 });

                // Transcribe the loaded recording's audioBlob
                runTranscription(recording.audioBlob, recording.name);

            } else {
                throw new Error("Recording not found in local storage.");
            }
        } catch (err) {
            console.error(`Error loading recording ${id}:`, err);
            const message = err instanceof Error ? err.message : 'Unknown error.';
            setError(`Failed to load recording: ${message}`);
            setProcessingState('error');
            loadToast.update({ title: "Loading Failed", description: message, variant: "destructive", duration: 8000 });
             setLoadedRecordingId(null); // Clear loaded ID on error
             setMeetingName('');
             setMeetingDate(new Date());
        }
    }, [isLoading, processingState, resetState, toast, runTranscription]);


  const handleProcess = useCallback(async () => {
    if (!transcript) {
      setError('Please record, upload, or load a transcript first.');
      toast({
        title: 'Error',
        description: 'No transcript provided.',
        variant: 'destructive',
      });
      return;
    }
    if (isLoading || processingState === 'recording' || processingState === 'checking_permission') {
        console.log("Processing or recording in progress, cannot start new analysis.");
        return;
    }

    setProcessingState('processing');
    setError(null);
    setKeyPoints(null);
    setTranslatedTranscript('');
    setSentimentResult(null);
    setTopicsResult(null);
    setExportContent(''); // Clear previous export content
    const processToast = toast({
        title: 'Processing Meeting...',
        description: `Analyzing transcript in ${analysisLanguage.toUpperCase()}...`,
        duration: Infinity,
      });


    try {
      let transcriptToAnalyze = transcript;
      // Translate if the analysis language is different from English (assuming English is the base for some models or default)
      // And if the analysis language is not the same as the original recording language (if known and different)
      // For simplicity, we translate if analysisLanguage is not 'en'.
      if (analysisLanguage !== 'en') { // Assuming 'en' is the primary language of the transcription or a common target.
        processToast.update({ description: `Translating to ${analysisLanguage.toUpperCase()} for analysis...` });
        const translateInput: TranslateTranscriptInput = { transcript, language: analysisLanguage };
        const translationResult: TranslateTranscriptOutput = await translateTranscript(translateInput);
        transcriptToAnalyze = translationResult.translation;
        setTranslatedTranscript(transcriptToAnalyze);
        if (!transcriptToAnalyze) {
          throw new Error("Translation result was empty.");
        }
      } else {
        // If analysis is in English, and original transcript is already English, no translation needed.
        // Or if transcription itself was in English.
        setTranslatedTranscript(''); // Clear any previous translated transcript
      }


      processToast.update({ description: 'Analyzing sentiment and detecting topics...' });
      const sentimentInput: AnalyzeSentimentInput = { transcript: transcriptToAnalyze };
      const topicsInput: DetectTopicsInput = { transcript: transcriptToAnalyze };

      // Run analysis in parallel
      const [sentimentAnalysis, topicsDetection] = await Promise.all([
         analyzeSentiment(sentimentInput),
         detectTopics(topicsInput)
      ]);

      if (!sentimentAnalysis) throw new Error("Sentiment analysis failed.");
      if (!topicsDetection) throw new Error("Topic detection failed.");

      setSentimentResult(sentimentAnalysis);
      setTopicsResult(topicsDetection);


      processToast.update({ description: 'Extracting key points and summary...' });
      const extractInput: ExtractKeyPointsInput = { transcript: transcriptToAnalyze };
      const keyPointsResult: ExtractKeyPointsOutput = await extractKeyPoints(extractInput);

       if (!keyPointsResult) throw new Error("Key point extraction failed.");
      setKeyPoints(keyPointsResult);


      setProcessingState('done'); // Analysis complete
      processToast.update({
        title: 'Processing Complete!',
        description: 'Meeting insights generated successfully.',
        variant: 'default',
        duration: 5000,
      });
    } catch (err) {
      console.error('Processing error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Processing failed: ${errorMessage}`);
      setProcessingState('error'); // Set to error state
      processToast.update({
        title: 'Processing Error',
        description: `Failed to generate insights: ${errorMessage}`,
        variant: 'destructive',
        duration: 8000,
      });
    }
  }, [transcript, analysisLanguage, toast, isLoading, processingState]);


 const handleGenerateExport = useCallback(async (selectedFormat: ExportFormat) => {
    if (processingState !== 'done' || !keyPoints || !sentimentResult || !topicsResult) {
        toast({
            title: "Analysis Not Ready",
            description: "Please analyze the transcript first before exporting.",
            variant: "destructive",
        });
        return;
    }
    if (isLoading || processingState === 'recording' || processingState === 'checking_permission') {
        console.log("Operation already in progress, cannot generate export.");
        return;
    }

    setProcessingState('generating_export');
    setError(null);
    setExportContent('');
    setExportFormat(selectedFormat);
    const exportToast = toast({
        title: `Generating ${selectedFormat.toUpperCase()} Content...`,
        description: 'Preparing analysis results for export...',
        duration: Infinity,
    });

    try {
        const input: GenerateExportContentInput = {
            keyPoints: keyPoints,
            sentimentResult: sentimentResult,
            topicsResult: topicsResult,
            format: selectedFormat,
            originalTranscript: transcript, // The transcript used for analysis (could be original or initially translated)
            translatedTranscript: analysisLanguage !== 'en' && translatedTranscript ? translatedTranscript : undefined, // If analysis was on translated
            language: analysisLanguage, // The language of the transcript that was analyzed
        };

        const result: GenerateExportContentOutput = await generateExportContent(input);

        if (result.exportedContent) {
             setExportContent(result.exportedContent);

             if (selectedFormat === 'pdf') {
                 // Convert Markdown to HTML for printing
                 const htmlContent = await marked(result.exportedContent);
                 const printWindow = window.open('', '_blank');
                 if (printWindow) {
                   printWindow.document.write(`
                     <html>
                       <head>
                         <title>Meeting Analysis Report - ${meetingName || new Date().toLocaleString()}</title>
                         <style>
                           body { font-family: sans-serif; line-height: 1.6; padding: 2rem; }
                           h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; color: #333; }
                           h1 { border-bottom: 2px solid #eee; padding-bottom: 0.3em; font-size: 1.8em; }
                           h2 { border-bottom: 1px solid #eee; padding-bottom: 0.3em; font-size: 1.5em; }
                           h3 { font-size: 1.2em; }
                           ul, ol { padding-left: 1.5em; margin-bottom: 1em; }
                           li { margin-bottom: 0.5em; }
                           p { margin-bottom: 1em; }
                           pre { background-color: #f5f5f5; padding: 1em; border-radius: 4px; overflow-x: auto; font-family: monospace; white-space: pre-wrap; word-wrap: break-word; }
                           code { font-family: monospace; }
                           blockquote { border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0; color: #666; }
                           hr { border: none; border-top: 1px solid #eee; margin: 2em 0; }
                           table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
                           th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                           th { background-color: #f2f2f2; }
                           .page-break { page-break-before: always; }
                           @media print {
                             body { padding: 1rem; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                             h1, h2, h3, p, li { color: #000 !important; }
                             pre { background-color: #eee !important; border: 1px solid #ccc !important; }
                           }
                         </style>
                       </head>
                       <body>
                         <h1>Meeting Analysis Report</h1>
                         <p><strong>Date Generated:</strong> ${new Date().toLocaleString()}</p>
                         ${meetingName ? `<p><strong>Meeting Name:</strong> ${meetingName}</p>` : ''}
                         ${meetingDate ? `<p><strong>Meeting Date:</strong> ${format(meetingDate, 'PPP')}</p>` : ''}
                         <hr/>
                         ${htmlContent}
                       </body>
                     </html>
                   `);
                   printWindow.document.close();
                   setTimeout(() => { // Timeout to ensure content is loaded before print
                      try {
                         printWindow.focus(); // Focus the new window
                         printWindow.print();
                         // Note: Closing window after print might be too soon or blocked by browser.
                         // User usually closes it.
                      } catch (printError) {
                          console.error("Error during print operation:", printError);
                          toast({ title: "Print Error", description: "Could not initiate print dialog. Please try again or check browser settings.", variant: "destructive"});
                      }
                      // Reset state regardless of print success, as the content was generated.
                      setProcessingState('done'); // Or 'export_ready' if we don't want it to revert immediately
                      setExportFormat(null); // Reset chosen format
                   }, 500); // 500ms delay, adjust if needed

                    exportToast.update({
                        title: 'Print Dialog Opened',
                        description: `Use your browser's print dialog to save as PDF.`,
                        variant: 'default',
                        duration: 5000,
                    });
                 } else {
                     throw new Error("Could not open print window. Please check your browser's pop-up blocker settings.");
                 }

             } else { // For DOCX and PPTX, show modal with Markdown
                setProcessingState('export_ready');
                setShowExportModal(true);
                exportToast.update({
                    title: 'Export Content Ready!',
                    description: `Markdown content for ${selectedFormat.toUpperCase()} is generated.`,
                    variant: 'default',
                    duration: 5000,
                });
             }

        } else {
            throw new Error("Generated export content was empty.");
        }

    } catch (err) {
        console.error('Export generation error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error.';
        setError(`Failed to generate export content: ${message}`);
        setProcessingState('error'); // Set to error state
        setExportFormat(null); // Reset format
        exportToast.update({
            title: 'Export Generation Failed',
            description: message,
            variant: 'destructive',
            duration: 8000,
        });
    } finally {
        // If it was generating_export and not PDF, and not an error, set back to 'done'
        // For PDF, it's set to 'done' inside the print logic.
       if (processingState === 'generating_export' && selectedFormat !== 'pdf' && error === null) {
           setProcessingState('done');
       }
    }
 }, [
     processingState, keyPoints, sentimentResult, topicsResult, transcript,
     translatedTranscript, analysisLanguage, toast, isLoading,
     meetingName, meetingDate, // No direct dependency on generateExportContent, but related to content
 ]);


  useEffect(() => {
    // Cleanup function for component unmount
    return () => {
       // Stop MediaRecorder if active
       if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          // Stream tracks are stopped in onstop/onerror of MediaRecorder
          console.log("Cleaned up MediaRecorder on unmount.");
       }
       mediaRecorderRef.current = null; // Ensure ref is cleared

        // Stop SpeechRecognition if active
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null; // Ensure ref is cleared
            console.log("Cleaned up SpeechRecognition on unmount.");
        }

        // Clear any active timeouts/intervals
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


  const canProcess = transcript && !isLoading && processingState !== 'recording' && processingState !== 'stopping' && processingState !== 'saving' && processingState !== 'transcribing' && processingState !== 'loading_recording' && processingState !== 'checking_permission' && processingState !== 'processing';
  const showResults = (processingState === 'done' || processingState === 'export_ready') && keyPoints && sentimentResult && topicsResult;
  const showLoadingSkeletons = processingState === 'processing' || processingState === 'generating_export';
  const showErrorAlert = error && (processingState === 'error' || processingState === 'permission_denied') && !isLoading && processingState !== 'checking_permission';


  const copyToClipboard = (text: string, label: string) => {
     if (!text) {
         toast({ title: 'Nothing to Copy', description: `The ${label.toLowerCase()} section is empty.`, variant: 'default' });
         return;
     }
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({
          title: `${label} Copied!`,
          description: 'The text has been copied to your clipboard.',
        });
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        toast({
          title: 'Copy Failed',
          description: 'Could not copy text to the clipboard.',
          variant: 'destructive',
        });
      });
  };

    const formatTime = (seconds: number | null): string => {
        if (seconds === null || isNaN(seconds) || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };


  const renderSentiment = () => {
    if (!sentimentResult) return null;

    const { sentiment, confidence, reasoning } = sentimentResult;
    let IconComponent: React.ElementType;
    let colorClass: string;
    let text: string;

    switch (sentiment) {
      case 'positive':
        IconComponent = Smile;
        colorClass = 'text-green-600 dark:text-green-400';
        text = 'Positive';
        break;
      case 'negative':
        IconComponent = Frown;
        colorClass = 'text-red-600 dark:text-red-400';
        text = 'Negative';
        break;
      default:
        IconComponent = Meh;
        colorClass = 'text-yellow-600 dark:text-yellow-400';
        text = 'Neutral';
    }

    return (
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-accent" /> Sentiment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
           <div className="flex items-center gap-3">
             <IconComponent className={cn('h-8 w-8', colorClass)} />
             <span className={cn('text-2xl font-semibold', colorClass)}>{text}</span>
             <Badge variant="secondary" className="ml-auto text-sm">
               Confidence: {Math.round(confidence * 100)}%
             </Badge>
           </div>
           {reasoning && <p className="text-sm text-muted-foreground italic">"{reasoning}"</p>}
        </CardContent>
      </Card>
    );
  };

  const renderTopics = () => {
    if (!topicsResult || !topicsResult.topics || topicsResult.topics.length === 0) return null;

    return (
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Tags className="h-5 w-5 text-accent" /> Detected Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {topicsResult.topics.map((topic, index) => (
              <Badge key={index} variant="outline" className="text-sm px-3 py-1">
                {topic}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderKeyPoints = () => {
    if (!keyPoints) return null;

    const iconMap: { [key: string]: React.ReactNode } = {
      summary: <BookOpen className="h-5 w-5 text-primary" />,
      decisions: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />,
      tasks: <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      questions: <HelpCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
      deadlines: <Timer className="h-5 w-5 text-red-600 dark:text-red-400" />,
    };

    const pointsToShow = [
       { title: 'Summary', data: keyPoints.summary ? [keyPoints.summary] : [], icon: iconMap.summary, copyKey: 'summary', copyLabel: 'Summary' },
       { title: 'Decisions', data: keyPoints.decisions || [], icon: iconMap.decisions, copyKey: 'decisions', copyLabel: 'Decisions' },
       { title: 'Tasks', data: keyPoints.tasks || [], icon: iconMap.tasks, copyKey: 'tasks', copyLabel: 'Tasks' },
       { title: 'Questions', data: keyPoints.questions || [], icon: iconMap.questions, copyKey: 'questions', copyLabel: 'Questions' },
       { title: 'Deadlines', data: keyPoints.deadlines || [], icon: iconMap.deadlines, copyKey: 'deadlines', copyLabel: 'Deadlines' },
    ];


     const formatCopyText = (data: string[], title: string): string => {
        const nonEmptyData = data?.filter(item => item && item.trim() !== '');
        if (!nonEmptyData || nonEmptyData.length === 0) return '';
        if (nonEmptyData.length === 1 && title === 'Summary') return nonEmptyData[0]; // For summary, just copy the text
        return `${title}:\n- ${nonEmptyData.join('\n- ')}`;
    };

    const validPoints = pointsToShow.filter(point => point.data && point.data.length > 0 && point.data.some(item => item && item.trim() !== ''));

    if (validPoints.length === 0) {
       return (
         <Card className="shadow-md">
             <CardHeader><CardTitle>Key Points & Summary</CardTitle></CardHeader>
             <CardContent><p className="text-muted-foreground">No key points or summary could be extracted from the transcript.</p></CardContent></Card>
       )
    }


    return (
       <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
         <CardHeader>
           <CardTitle className="flex items-center justify-between gap-2 text-xl">
             <div className="flex items-center gap-2">
               <ListChecks className="h-5 w-5 text-accent" /> Key Points & Summary
             </div>
              <Button
                variant="ghost"
                size="sm"
                 onClick={() => {
                     const allText = validPoints
                       .map(p => formatCopyText(p.data, p.title))
                       .filter(text => text) // Filter out any empty strings
                       .join('\n\n');
                     copyToClipboard(allText, 'All Key Points');
                  }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Copy all key points"
                 disabled={validPoints.length === 0}
              >
                <Copy className="h-4 w-4 mr-1" /> Copy All
              </Button>
           </CardTitle>
         </CardHeader>
         <CardContent>
            <Accordion type="multiple" className="w-full" defaultValue={['summary']}>
              {validPoints.map((point) => (
                  <AccordionItem value={point.title.toLowerCase().replace(/\s+/g, '-')} key={point.title}>
                    <AccordionTrigger className="text-lg font-semibold hover:no-underline group">
                      <div className="flex items-center justify-between w-full">
                         <div className="flex items-center gap-2">
                            {point.icon}
                            {point.title}
                             {/* Show count badge if not summary or if summary has multiple items (though summary is single string) */}
                             {(point.title !== 'Summary') && point.data.length > 0 && (
                                 <Badge variant="secondary" className="ml-2">{point.data.length}</Badge>
                             )}
                          </div>
                           <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent accordion toggle
                                copyToClipboard(formatCopyText(point.data, point.title), point.copyLabel);
                              }}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity mr-2"
                              aria-label={`Copy ${point.title}`}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                       </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {point.title === 'Summary' ? (
                         <p className="text-sm whitespace-pre-wrap pl-1">{point.data[0]}</p>
                      ) : (
                        <ul className="list-disc space-y-2 pl-6 text-sm">
                          {point.data.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
         </CardContent>
       </Card>
    );
  };


  // Determine record button behavior based on permission state
  const recordButtonOnClick =
    hasMicPermission === false || (hasMicPermission === null && processingState !== 'checking_permission')
    ? requestMicPermission // If no permission or unknown, button click requests permission
    : handleRecord; // If permission exists, button click starts recording

  const recordButtonIsDisabled =
    (processingState === 'checking_permission') || // Disabled while checking
    (isLoading && processingState !== 'checking_permission') || // Disabled during other loading states
    (hasMicPermission === true && (!meetingName.trim() || !meetingDate)); // Disabled if permission exists but details missing

  // Text for the record button
  let recordButtonText = 'Start Recording';
  if (processingState === 'checking_permission') {
      recordButtonText = 'Checking Mic...';
  } else if (hasMicPermission === false) {
      recordButtonText = 'Grant Mic Access';
  } else if (hasMicPermission === null) { // Fallback if permission query wasn't supported
      recordButtonText = 'Request Mic Access';
  } else if (!meetingName.trim() || !meetingDate) {
      recordButtonText = 'Enter Details to Record';
  }


  return (
    <div suppressHydrationWarning={true} className="flex min-h-screen w-full bg-gradient-to-b from-background to-secondary/10 dark:to-black/20">
        <MeetingSidebar
            recordings={recordings}
            isLoading={isLoadingRecordings}
            onSelectRecording={handleSelectRecording}
            onRecordingsUpdate={fetchRecordings}
             className={cn(
                 'transition-all duration-300 ease-in-out',
                 'border-r border-border/50'
             )}
        />

         <main className={cn(
             "flex-1 flex flex-col items-center p-4 pt-10 md:p-8 overflow-y-auto transition-all duration-300 ease-in-out"
         )}>
           <div className="container mx-auto max-w-4xl w-full">
              <header className="mb-6 text-center relative">
                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="absolute left-0 top-0 md:hidden"
                    aria-label="Toggle Recordings Sidebar"
                 >
                    <PanelLeft />
                 </Button>

                <div className="flex items-center justify-center gap-3 mb-2">
                  <Mic className="w-10 h-10 text-primary" />
                  <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                    MeetMind
                  </h1>
                </div>
                <p className="mt-2 text-lg text-muted-foreground">
                  Record, transcribe, and analyze your meetings with AI
                </p>
              </header>

               {/* Permission Denied Alert */}
               {processingState === 'permission_denied' && hasMicPermission === false && !isLoading && processingState !== 'checking_permission' &&(
                   <Alert variant="destructive" className="mb-6 w-full">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Microphone Access Denied</AlertTitle>
                     <AlertDescription>
                       MeetMind needs access to your microphone to record audio. Please enable microphone permissions in your browser settings, then click the &quot;Grant Mic Access&quot; button.
                     </AlertDescription>
                   </Alert>
               )}

               {/* Recording Time Limit Alert */}
               {processingState === 'recording' && (
                  <Alert variant="default" className="mb-6 w-full bg-primary/10 border-primary/30">
                     <Clock className="h-4 w-4 text-primary" />
                     <AlertTitle className="text-primary">Recording Time Limit</AlertTitle>
                     <AlertDescription>
                       Recording will automatically stop after {RECORDING_TIME_LIMIT_MS / (60 * 1000)} minutes.
                       {remainingTime !== null && (
                          <span className="ml-2 font-semibold tabular-nums">({formatTime(remainingTime)} remaining)</span>
                       )}
                     </AlertDescription>
                   </Alert>
               )}

              {/* Input Card: Create or Load Meeting */}
              <Card className="w-full shadow-xl border border-border/50 mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
                    <Target className="h-6 w-6 text-accent" /> Create or Load Meeting
                  </CardTitle>
                  <CardDescription>
                     Record a new meeting, upload an audio file, or select a past recording from the sidebar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   {/* Meeting Name and Date Inputs */}
                   <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="meetingName" className={cn(
                                (isLoading || processingState === 'recording' || processingState === 'stopping') && "text-muted-foreground",
                                !meetingName.trim() && error?.includes('Meeting name is required') && "text-destructive" // Highlight if name is missing and relevant error exists
                            )}>
                                Meeting Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="meetingName"
                                placeholder={recordingNamePlaceholder}
                                value={meetingName}
                                onChange={(e) => setMeetingName(e.target.value)}
                                className="h-11" // lg size
                                disabled={processingState === 'recording' || processingState === 'stopping' || isLoading}
                                required
                                aria-required="true"
                            />
                            {!meetingName.trim() && error === 'Meeting name is required to start recording.' && (
                                <p className="text-xs text-destructive">{error}</p>
                            )}
                             {!meetingName.trim() && error === 'Meeting name is required to save.' && (
                                <p className="text-xs text-destructive">{error}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="meetingDate" className={cn(
                                (isLoading || processingState === 'recording' || processingState === 'stopping') && "text-muted-foreground",
                                !meetingDate && error?.includes('Meeting date is required') && "text-destructive"
                                )}>Meeting Date <span className="text-destructive">*</span></Label>
                            <DatePicker
                                date={meetingDate}
                                setDate={setMeetingDate}
                                disabled={processingState === 'recording' || processingState === 'stopping' || isLoading}
                            />
                            {!meetingDate && error === 'Meeting date is required to start recording.' && (
                                <p className="text-xs text-destructive">{error}</p>
                            )}
                             {!meetingDate && error === 'Meeting date is required to save.' && (
                                <p className="text-xs text-destructive">{error}</p>
                            )}
                        </div>
                   </div>

                    {/* Recording Language Selection */}
                    <div className="space-y-1.5">
                        <Label htmlFor="recordingLanguage">Recording Language</Label>
                        <Select
                            value={recordingLanguage}
                            onValueChange={(value: string) => setRecordingLanguage(value as RecordingLanguage)}
                            disabled={processingState === 'recording' || processingState === 'stopping' || isLoading}
                            >
                            <SelectTrigger id="recordingLanguage" className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Select language..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en-US">English (US)</SelectItem>
                                <SelectItem value="sw-TZ">Swahili (Tanzania)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Select the primary language spoken for live transcription preview and to guide the AI.
                        </p>
                    </div>


                   {/* Action Buttons: Record, Upload, Reset */}
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                           {processingState !== 'recording' ? (
                                <Button
                                    onClick={recordButtonOnClick}
                                    disabled={recordButtonIsDisabled}
                                    size="lg"
                                    className="w-full"
                                    aria-live="polite"
                                >
                                    <Mic className="mr-2 h-5 w-5" />
                                    {recordButtonText}
                                </Button>
                           ) : (
                                <Button
                                    onClick={() => handleStop()}
                                    disabled={processingState !== 'recording'} // Only enable if actually recording
                                    size="lg"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    aria-live="polite"
                                >
                                    {/* Show different text based on sub-state of stopping/saving */}
                                    {processingState === 'stopping' || processingState === 'saving' ? (
                                        <> <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {processingState === 'saving' ? 'Saving...' : 'Stopping...'} </>
                                    ) : (
                                        <> <Save className="mr-2 h-5 w-5" /> Stop & Save </>
                                    )}
                                </Button>
                           )}
                        </div>

                         <div className="sm:col-span-1">
                           <input
                               type="file"
                               ref={fileInputRef}
                               onChange={handleFileChange}
                               className="hidden"
                               accept="audio/*" // Accepts all audio types
                               disabled={isLoading || processingState === 'recording' || processingState === 'checking_permission'}
                           />
                           <Button
                               onClick={handleUploadClick}
                               disabled={isLoading || processingState === 'recording' || processingState === 'checking_permission'}
                               variant="outline"
                               size="lg"
                               className="w-full"
                               aria-live="polite"
                           >
                               {/* Differentiate if upload is being processed */}
                               {processingState === 'saving' && !mediaRecorderRef.current ? ( // Assuming 'saving' is used for upload processing
                                   <> <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing Upload... </>
                               ) : (
                                   <> <FileAudio className="mr-2 h-5 w-5" /> Upload Audio </>
                               )}
                           </Button>
                        </div>

                         <div className="sm:col-span-1">
                           <Button
                               onClick={() => resetState()} // Reset all, including permission state query
                               disabled={(isLoading && processingState !== 'checking_permission') || processingState === 'recording'}
                               variant="outline"
                               size="lg"
                               className="w-full"
                           >
                               <RotateCcw className="mr-2 h-5 w-5" /> Reset All
                           </Button>
                        </div>
                   </div>
                 </CardContent>
              </Card>


               {/* Transcript Card */}
               <Card className="w-full shadow-xl border border-border/50 mb-8">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
                      <Speech className="h-6 w-6 text-accent" /> Transcript
                   </CardTitle>
                   <CardDescription>
                     {processingState === 'recording' ? `Recording in ${recordingLanguage}... Live preview below. Final transcript will appear after saving.` :
                      processingState === 'transcribing' ? 'Generating transcript from audio...' :
                      transcript ? `Transcript generated ${loadedRecordingId !== null ? `from Recording ID ${loadedRecordingId}` : ''}. Select analysis language below.` :
                      'The meeting transcript will be displayed here after recording or uploading.'}
                   </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    {/* Live Transcription Preview */}
                    {processingState === 'recording' && (
                        <div className="rounded-md border border-dashed border-primary/50 bg-primary/5 p-4 shadow-inner">
                            <Label className="text-xs font-medium text-primary mb-2 block">Live Transcription Preview ({recordingLanguage})</Label>
                           <ScrollArea className="h-32 w-full rounded-md">
                              <p className="whitespace-pre-wrap text-sm text-primary/90">{liveDialogue || <span className="italic text-muted-foreground">Listening... (Say something!)</span>}</p>
                           </ScrollArea>
                        </div>
                     )}

                     {/* Transcript Textarea or Skeletons */}
                     {(processingState === 'transcribing' || processingState === 'loading_recording') && !transcript ? ( // Show skeletons only if transcript isn't there yet
                         <div className="space-y-2">
                             <Skeleton className="h-4 w-1/4" />
                             <Skeleton className="h-24 w-full rounded-md" />
                         </div>
                     ) : (processingState === 'recording' || processingState === 'stopping' || processingState === 'saving') && !transcript ? (
                          // Placeholder while recording/stopping/saving if no transcript yet
                          <div className="space-y-2">
                             <Label htmlFor="transcriptArea" className={cn(isLoading || processingState === 'recording' ? "text-muted-foreground" : "")}>Final Transcript</Label>
                             <div className="h-24 w-full rounded-md bg-muted/40 flex items-center justify-center text-muted-foreground italic p-4 text-center">
                               {processingState === 'recording' ? "Transcript will be generated after saving..." : "Processing audio..."}
                             </div>
                          </div>
                     ) : (
                         // Actual Textarea
                         <div className="space-y-2">
                             <Label htmlFor="transcriptArea" className={cn(isLoading || processingState === 'recording' ? "text-muted-foreground" : "")}>
                                 {loadedRecordingId !== null ? `Transcript (from Recording ID ${loadedRecordingId})` : transcript ? 'Transcript' : 'Transcript Input'}
                             </Label>
                             <Textarea
                                id="transcriptArea"
                                placeholder={transcript ? "Transcript generated." : "Paste your meeting transcript here, or record/upload above..."}
                                value={transcript}
                                 onChange={(e) => {
                                      const pastedText = e.target.value;
                                      // If user edits a loaded transcript, it's no longer tied to the saved recording's pristine state
                                      if (loadedRecordingId !== null) {
                                          setLoadedRecordingId(null); // Detach from loaded recording
                                          // Optionally clear meeting name/date if they were from the loaded recording
                                          // setMeetingName('');
                                          // setMeetingDate(new Date());
                                          toast({ title: "Transcript Edited", description: "Changes will not be saved to the original recording. This is now a new transcript.", variant:"default"});
                                      }
                                      setTranscript(pastedText);
                                      // If results exist, editing transcript should clear them and reset processing state
                                      if (keyPoints || translatedTranscript || sentimentResult || topicsResult || error || exportContent) {
                                         setKeyPoints(null);
                                         setTranslatedTranscript('');
                                         setSentimentResult(null);
                                         setTopicsResult(null);
                                         setError(null);
                                         setExportContent('');
                                         setExportFormat(null);
                                         setShowExportModal(false);
                                         // Reset processing state if it was 'done', 'error', etc.
                                         if (!isLoading && !['idle', 'transcribing', 'recording', 'loading_recording', 'checking_permission'].includes(processingState)) {
                                            setProcessingState('idle');
                                         }
                                      } else if (!isLoading && !['idle', 'transcribing', 'recording', 'loading_recording', 'checking_permission'].includes(processingState)) {
                                          // If no results but state was something else (e.g. 'error' from transcription)
                                          setProcessingState('idle');
                                      }
                                 }}
                                rows={8}
                                className="w-full resize-y"
                                 readOnly={isLoading || ['transcribing', 'recording', 'stopping', 'saving', 'processing', 'generating_export', 'loading_recording', 'checking_permission'].includes(processingState)}
                                 aria-label="Meeting Transcript"
                             />
                         </div>
                     )}

                      {/* Analysis Language Selection & Process Button */}
                      {transcript && !isLoading && !['transcribing', 'recording', 'stopping', 'saving', 'loading_recording', 'checking_permission'].includes(processingState) && (
                        <div className="space-y-4 pt-4 border-t border-border/30">
                          <div className="space-y-3 rounded-lg border border-border/30 bg-muted/40 p-4 shadow-inner">
                            <Label className="flex items-center gap-2 text-base font-medium text-foreground">
                              <Languages className="h-5 w-5 text-primary" /> Select Analysis Language
                            </Label>
                            <RadioGroup
                              defaultValue="en"
                              value={analysisLanguage}
                              onValueChange={(value) => setAnalysisLanguage(value as 'en' | 'sw')}
                              className="flex flex-col space-y-2 sm:flex-row sm:space-x-6 sm:space-y-0"
                              disabled={processingState === 'processing'}
                              aria-label="Output Language Selection"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="en" id="lang-en" aria-label="English Language" />
                                <Label htmlFor="lang-en" className="cursor-pointer text-sm font-normal">English</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sw" id="lang-sw" aria-label="Swahili Language" />
                                <Label htmlFor="lang-sw" className="cursor-pointer text-sm font-normal">Swahili</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          <div className="flex justify-center pt-2">
                             <Button
                               onClick={handleProcess}
                               disabled={!canProcess} // Use canProcess which checks transcript and state
                               size="lg"
                               className="w-full sm:w-auto transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                               aria-live="polite"
                             >
                               {processingState === 'processing' ? (
                                  <> <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing... </>
                                ) : (
                                  <> <Terminal className="mr-2 h-5 w-5" /> Analyze Transcript </>
                                )}
                             </Button>
                          </div>
                        </div>
                      )}
                 </CardContent>
               </Card>


              {/* Loading Skeletons for Analysis Results */}
              {showLoadingSkeletons && (
                <div className="w-full space-y-6 animate-pulse mb-8">
                    <h3 className="text-center text-lg font-semibold text-muted-foreground">
                       {processingState === 'processing' ? 'Generating Analysis...' : 'Generating Export Content...'}
                    </h3>
                    {/* Optional: Skeleton for translated transcript if applicable */}
                    {(processingState === 'processing' && analysisLanguage !== 'en') && (
                        <Card><CardHeader><Skeleton className="h-6 w-1/2 rounded-md" /></CardHeader>
                        <CardContent><Skeleton className="h-16 w-full rounded-md" /></CardContent></Card>
                    )}
                    {/* Skeletons for sentiment and topics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card><CardHeader><Skeleton className="h-6 w-3/4 rounded-md" /></CardHeader>
                      <CardContent><Skeleton className="h-10 w-1/2 rounded-md" /></CardContent></Card>
                      <Card><CardHeader><Skeleton className="h-6 w-3/4 rounded-md" /></CardHeader>
                      <CardContent className="flex flex-wrap gap-2"><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-6 w-24 rounded-full" /><Skeleton className="h-6 w-16 rounded-full" /></CardContent></Card>
                    </div>
                    {/* Skeleton for key points */}
                    <Card><CardHeader><Skeleton className="h-6 w-1/3 rounded-md" /></CardHeader>
                    <CardContent className="space-y-4"><Skeleton className="h-8 w-full rounded-md" /><Skeleton className="h-8 w-3/4 rounded-md" /><Skeleton className="h-8 w-2/3 rounded-md" /></CardContent></Card>
                </div>
              )}

              {/* Error Alert for processing/general errors */}
              {showErrorAlert && (
                <Alert variant="destructive" className="w-full shadow-lg mb-8">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-semibold">
                      {processingState === 'permission_denied' ? "Permission Required" : "Error Occurred"}
                  </AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Results Section */}
              {showResults && (
                <div className="w-full space-y-8 mb-8">
                  {/* Translated Transcript Display (if applicable) */}
                  {analysisLanguage !== 'en' && translatedTranscript && (
                      <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between gap-2 text-xl">
                             <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-accent" /> Translated Transcript ({analysisLanguage.toUpperCase()})
                             </div>
                             <Button variant="ghost" size="sm" onClick={() => copyToClipboard(translatedTranscript, 'Translated Transcript')} className="text-muted-foreground hover:text-foreground" aria-label="Copy translated transcript">
                                <Copy className="h-4 w-4 mr-1" /> Copy
                             </Button>
                          </CardTitle>
                           <CardDescription>This transcript was translated for analysis purposes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="max-h-60 w-full rounded-md border bg-muted/30 p-3">
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground ">
                              {translatedTranscript}
                            </p>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                  )}

                   {/* Sentiment and Topics Cards */}
                   {(sentimentResult || (topicsResult && topicsResult.topics && topicsResult.topics.length > 0)) && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {renderSentiment()}
                        {renderTopics()}
                     </div>
                   )}

                  {/* Key Points Card */}
                  {renderKeyPoints()}

                   {/* Export Card */}
                   <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
                     <CardHeader>
                       <CardTitle className="flex items-center gap-2 text-xl">
                         <Download className="h-5 w-5 text-accent" /> Export Analysis
                       </CardTitle>
                       <CardDescription>
                         Generate analysis content in your preferred format.
                       </CardDescription>
                     </CardHeader>
                     <CardContent>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  disabled={isLoading || !keyPoints || !sentimentResult || !topicsResult || processingState === 'generating_export' || processingState === 'recording' || processingState === 'checking_permission'}
                                >
                                 {processingState === 'generating_export' ? (
                                     <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating... </>
                                 ) : (
                                      <> Save Analysis As... <ChevronDown className="ml-2 h-4 w-4" /> </>
                                 )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuLabel>Choose Format</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => handleGenerateExport('docx')} disabled={processingState === 'generating_export'}>
                                <FileCode className="mr-2 h-4 w-4" />
                                <span>Word (.docx)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleGenerateExport('pptx')} disabled={processingState === 'generating_export'}>
                                <Presentation className="mr-2 h-4 w-4" />
                                <span>PowerPoint (.pptx)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleGenerateExport('pdf')} disabled={processingState === 'generating_export'}>
                                <Printer className="mr-2 h-4 w-4" />
                                <span>PDF (via Print)</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                     </CardContent>
                   </Card>
                </div>
              )}

               {/* Footer */}
               <footer className="mt-auto pt-8 text-center text-sm text-muted-foreground/80">
                  Powered by Gemini AI | MeetMind &copy; {currentYear !== null ? currentYear : <span className="inline-block h-4 w-10 animate-pulse rounded bg-muted" />}
              </footer>
            </div>
         </main>

         {/* Export Modal Dialog */}
         <Dialog open={showExportModal && exportFormat !== 'pdf'} onOpenChange={(isOpen) => {
             setShowExportModal(isOpen);
             if (!isOpen) { // When dialog is closed
                 setExportContent('');
                 setExportFormat(null);
                 // If closing export modal while in 'export_ready', transition back to 'done'
                 if (processingState === 'export_ready') {
                    setProcessingState('done');
                 }
             }
         }}>
            <DialogContent className="sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px]">
                <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <FileDown className="h-5 w-5 text-primary" />
                    Generated Export Content ({exportFormat?.toUpperCase()})
                </DialogTitle>
                <DialogDescription>
                    Copy the Markdown content below and paste it into your desired application (Word, PowerPoint).
                    {exportFormat === 'docx' && " Tip: Paste into Word and use styles for formatting."}
                    {exportFormat === 'pptx' && " Tip: Paste into a PowerPoint text box or use 'New Slide from Outline'."}
                 </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] w-full rounded-md border p-4 bg-muted/30 my-4">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                    <code>{exportContent}</code>
                </pre>
                </ScrollArea>
                <DialogFooter className="sm:justify-between">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                        Close
                        </Button>
                    </DialogClose>
                    <Button onClick={() => copyToClipboard(exportContent, `Export Content (${exportFormat?.toUpperCase()})`)}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Markdown
                    </Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
    </div>
  );
}

