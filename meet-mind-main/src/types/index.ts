// Types for the MeetMind application

export type ExportFormat = 'docx' | 'pptx' | 'pdf';

export type ProcessingState =
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

export type Sentiment = 'positive' | 'negative' | 'neutral';

export type RecordingLanguage = 'en-US' | 'sw-TZ';

export type AnalysisLanguage = 'en' | 'sw';

// AI Flow Types
export interface TranslateTranscriptInput {
  transcript: string;
  language: AnalysisLanguage;
}

export interface TranslateTranscriptOutput {
  translation: string;
}

export interface ExtractKeyPointsInput {
  transcript: string;
}

export interface ExtractKeyPointsOutput {
  summary?: string;
  decisions?: string[];
  tasks?: string[];
  questions?: string[];
  deadlines?: string[];
}

export interface AnalyzeSentimentInput {
  transcript: string;
}

export interface AnalyzeSentimentOutput {
  sentiment: Sentiment;
  confidence: number;
  reasoning: string;
}

export interface DetectTopicsInput {
  transcript: string;
}

export interface DetectTopicsOutput {
  topics: string[];
}

export interface TranscribeAudioInput {
  audioDataUri: string;
}

export interface TranscribeAudioOutput {
  transcript: string;
}

export interface GenerateExportContentInput {
  keyPoints: ExtractKeyPointsOutput;
  sentimentResult: AnalyzeSentimentOutput;
  topicsResult: DetectTopicsOutput;
  format: ExportFormat;
  originalTranscript: string;
  translatedTranscript?: string;
  language: AnalysisLanguage;
}

export interface GenerateExportContentOutput {
  exportedContent: string;
}

// Database Types
export interface RecordingMetadata {
  id: number;
  name: string;
  timestamp: number;
  duration: number;
  blobMimeType: string;
}

export interface RecordingData {
  id: number;
  name: string;
  timestamp: number;
  duration: number;
  audioBlob: Blob;
  blobMimeType: string;
}

// Component Props Types
export interface RecordingCardProps {
  meetingName: string;
  setMeetingName: (name: string) => void;
  meetingDate: Date | undefined;
  setMeetingDate: (date: Date | undefined) => void;
  recordingLanguage: RecordingLanguage;
  setRecordingLanguage: (language: RecordingLanguage) => void;
  processingState: ProcessingState;
  hasMicPermission: boolean | null;
  onRecord: () => void;
  onStop: () => void;
  onUpload: (file: File) => Promise<void>;
  onReset: () => void;
  isLoading: boolean;
  error: string | null;
  remainingTime: number | null;
  recordingNamePlaceholder: string;
}

export interface TranscriptCardProps {
  transcript: string;
  setTranscript: (transcript: string) => void;
  processingState: ProcessingState;
  analysisLanguage: AnalysisLanguage;
  setAnalysisLanguage: (language: AnalysisLanguage) => void;
  onProcess: () => void;
  isLoading: boolean;
  liveDialogue: string;
  recordingLanguage: RecordingLanguage;
  loadedRecordingId: number | null;
  error: string | null;
}

export interface AnalysisResultsProps {
  keyPoints: ExtractKeyPointsOutput | null;
  sentimentResult: AnalyzeSentimentOutput | null;
  topicsResult: DetectTopicsOutput | null;
  processingState: ProcessingState;
  onCopyToClipboard: (text: string, label: string) => void;
}

export interface KeyPointsDisplayProps {
  keyPoints: ExtractKeyPointsOutput;
  onCopyToClipboard: (text: string, label: string) => void;
}

export interface SentimentDisplayProps {
  sentimentResult: AnalyzeSentimentOutput;
}

export interface TopicsDisplayProps {
  topicsResult: DetectTopicsOutput;
}

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportContent: string;
  exportFormat: ExportFormat | null;
  onGenerateExport: (format: ExportFormat) => void;
  processingState: ProcessingState;
  meetingName: string;
  meetingDate: Date | undefined;
}

export interface LoadingSkeletonsProps {
  processingState: ProcessingState;
  analysisLanguage: AnalysisLanguage;
}

export interface ErrorAlertProps {
  error: string | null;
  processingState: ProcessingState;
  hasMicPermission: boolean | null;
  isLoading: boolean;
}
