import React, { useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mic,
  Target,
  FileAudio,
  RotateCcw,
  Save,
  Loader2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import { RecordingCardProps } from '@/types';
import { RECORDING_LANGUAGES, RECORDING_TIME_LIMIT_MS } from '@/constants';

export const RecordingCard: React.FC<RecordingCardProps> = ({
  meetingName,
  setMeetingName,
  meetingDate,
  setMeetingDate,
  recordingLanguage,
  setRecordingLanguage,
  processingState,
  hasMicPermission,
  onRecord,
  onStop,
  onUpload,
  onReset,
  isLoading,
  error,
  remainingTime,
  recordingNamePlaceholder,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadClick = () => {
    if (isLoading || processingState === 'recording' || processingState === 'checking_permission') return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const formatTime = (seconds: number | null): string => {
    if (seconds === null || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine record button behavior based on permission state
  const recordButtonOnClick = hasMicPermission === false || 
    (hasMicPermission === null && processingState !== 'checking_permission')
    ? () => {} // Will be handled by parent component
    : onRecord;

  const recordButtonIsDisabled = 
    (processingState === 'checking_permission') ||
    (isLoading && processingState !== 'checking_permission') ||
    (hasMicPermission === true && (!meetingName.trim() || !meetingDate));

  // Text for the record button
  let recordButtonText = 'Start Recording';
  if (processingState === 'checking_permission') {
    recordButtonText = 'Checking Mic...';
  } else if (hasMicPermission === false) {
    recordButtonText = 'Grant Mic Access';
  } else if (hasMicPermission === null) {
    recordButtonText = 'Request Mic Access';
  } else if (!meetingName.trim() || !meetingDate) {
    recordButtonText = 'Enter Details to Record';
  }

  return (
    <Card className="w-full shadow-lg md:shadow-xl border border-border/50 mb-8 transition-shadow hover:shadow-2xl">
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
              !meetingName.trim() && error?.includes('Meeting name is required') && "text-destructive"
            )}>
              Meeting Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="meetingName"
              placeholder={recordingNamePlaceholder}
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              className="h-11"
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
            )}>
              Meeting Date <span className="text-destructive">*</span>
            </Label>
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
            onValueChange={(value: string) => setRecordingLanguage(value as any)}
            disabled={processingState === 'recording' || processingState === 'stopping' || isLoading}
          >
            <SelectTrigger id="recordingLanguage" className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select language..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RECORDING_LANGUAGES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select the primary language spoken for live transcription preview and to guide the AI.
          </p>
        </div>

        {/* Permission Denied Alert */}
        {processingState === 'permission_denied' && hasMicPermission === false && !isLoading && processingState !== 'checking_permission' && (
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
                onClick={onStop}
                disabled={processingState !== 'recording'}
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                aria-live="polite"
              >
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
              accept="audio/*"
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
              {processingState === 'saving' && !fileInputRef.current ? (
                <> <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing Upload... </>
              ) : (
                <> <FileAudio className="mr-2 h-5 w-5" /> Upload Audio </>
              )}
            </Button>
          </div>

          <div className="sm:col-span-1">
            <Button
              onClick={onReset}
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
  );
};
