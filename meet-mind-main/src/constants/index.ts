// Application constants

export const RECORDING_TIME_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

export const RECORDING_LANGUAGES = {
  'en-US': 'English (US)',
  'sw-TZ': 'Swahili (Tanzania)',
} as const;

export const ANALYSIS_LANGUAGES = {
  'en': 'English',
  'sw': 'Swahili',
} as const;

export const EXPORT_FORMATS = {
  'docx': 'Word Document',
  'pptx': 'PowerPoint Presentation',
  'pdf': 'PDF Document',
} as const;

export const SENTIMENT_ICONS = {
  positive: 'Smile',
  negative: 'Frown',
  neutral: 'Meh',
} as const;

export const SENTIMENT_COLORS = {
  positive: 'text-green-600 dark:text-green-400',
  negative: 'text-red-600 dark:text-red-400',
  neutral: 'text-yellow-600 dark:text-yellow-400',
} as const;

export const KEY_POINTS_ICONS = {
  summary: 'BookOpen',
  decisions: 'CheckCircle2',
  tasks: 'ClipboardList',
  questions: 'HelpCircle',
  deadlines: 'Timer',
} as const;

export const KEY_POINTS_COLORS = {
  summary: 'text-primary',
  decisions: 'text-green-600 dark:text-green-400',
  tasks: 'text-blue-600 dark:text-blue-400',
  questions: 'text-yellow-600 dark:text-yellow-400',
  deadlines: 'text-red-600 dark:text-red-400',
} as const;

export const PROCESSING_STATES = {
  IDLE: 'idle',
  CHECKING_PERMISSION: 'checking_permission',
  PERMISSION_DENIED: 'permission_denied',
  RECORDING: 'recording',
  STOPPING: 'stopping',
  TRANSCRIBING: 'transcribing',
  SAVING: 'saving',
  LOADING_RECORDING: 'loading_recording',
  PROCESSING: 'processing',
  GENERATING_EXPORT: 'generating_export',
  DONE: 'done',
  EXPORT_READY: 'export_ready',
  ERROR: 'error',
} as const;

export const AUDIO_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/mp4',
] as const;

export const FILE_ACCEPT_TYPES = 'audio/*';

export const TOAST_DURATIONS = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000,
  INFINITE: Infinity,
} as const;

export const TIMEOUTS = {
  AUDIO_DURATION: 5000,
  RECORDING_LIMIT: RECORDING_TIME_LIMIT_MS,
} as const;
