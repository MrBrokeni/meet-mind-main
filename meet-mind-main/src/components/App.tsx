import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useRecording } from '@/hooks/useRecording';
import { useTranscription } from '@/hooks/useTranscription';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useExport } from '@/hooks/useExport';
import { useRecordings } from '@/hooks/useRecordings';
const RecordingCard = dynamic(() => import('./RecordingCard').then(m => m.RecordingCard), { ssr: false });
const TranscriptCard = dynamic(() => import('./TranscriptCard').then(m => m.TranscriptCard), { ssr: false });
const AnalysisResults = dynamic(() => import('./AnalysisResults').then(m => m.AnalysisResults));
const LoadingSkeletons = dynamic(() => import('./LoadingSkeletons').then(m => m.LoadingSkeletons));
const ErrorAlert = dynamic(() => import('./ErrorAlert').then(m => m.ErrorAlert));
const ExportModal = dynamic(() => import('./ExportModal').then(m => m.ExportModal), { ssr: false });
const MeetingSidebar = dynamic(() => import('./MeetingSidebar').then(m => m.MeetingSidebar), { ssr: false });
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { Mic, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProcessingState, RecordingLanguage } from '@/types';
import { PROCESSING_STATES } from '@/constants';
import { format } from 'date-fns';

export const App: React.FC = () => {
  return (
    <SidebarProvider defaultOpen={true} suppressHydrationWarning={true}>
      <AppContent />
    </SidebarProvider>
  );
};

const AppContent: React.FC = () => {
  // State management
  const [meetingName, setMeetingName] = useState<string>('');
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(undefined);
  const [recordingLanguage, setRecordingLanguage] = useState<RecordingLanguage>('en-US');
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [recordingNamePlaceholder, setRecordingNamePlaceholder] = useState<string>('e.g., Project Kickoff');
  
  const { toast } = useToast();
  const { toggleSidebar } = useSidebar();

  // Custom hooks
  const {
    hasMicPermission,
    processingState: permissionProcessingState,
    error: permissionError,
    requestMicPermission,
    setProcessingState: setPermissionProcessingState,
    setError: setPermissionError,
  } = usePermissions();

  const {
    transcript,
    setTranscript,
    runTranscription,
    resetTranscription,
  } = useTranscription(setPermissionProcessingState, setPermissionError);

  const {
    analysisLanguage,
    setAnalysisLanguage,
    translatedTranscript,
    keyPoints,
    sentimentResult,
    topicsResult,
    handleProcess,
    resetAnalysis,
  } = useAnalysis(setPermissionProcessingState, setPermissionError);

  const {
    exportContent,
    exportFormat,
    showExportModal,
    setShowExportModal,
    handleGenerateExport,
    resetExport,
  } = useExport(setPermissionProcessingState, setPermissionError);

  const {
    recordings,
    isLoadingRecordings,
    loadedRecordingId,
    setLoadedRecordingId,
    fetchRecordings,
    handleSelectRecording,
    handleDeleteRecording,
  } = useRecordings(
    runTranscription,
    setMeetingName,
    setMeetingDate,
    setRecordingLanguage,
    setPermissionProcessingState,
    setPermissionError
  );

  const {
    recordingStartTime,
    liveDialogue,
    remainingTime,
    handleRecord,
    handleStop,
    handleUpload,
    resetRecording,
  } = useRecording(
    hasMicPermission,
    requestMicPermission,
    setPermissionProcessingState,
    setPermissionError,
    meetingName,
    meetingDate,
    recordingLanguage,
    runTranscription
  );

  // Computed values
  const isLoading = [
    'stopping',
    'transcribing',
    'saving',
    'loading_recording',
    'processing',
    'generating_export',
  ].includes(permissionProcessingState);

  const showLoadingSkeletons = permissionProcessingState === 'processing' || permissionProcessingState === 'generating_export';
  const showErrorAlert = Boolean(
    permissionError &&
    (permissionProcessingState === 'error' || permissionProcessingState === 'permission_denied') &&
    !isLoading
  );

  // Utility functions
  const copyToClipboard = useCallback((text: string, label: string) => {
    if (!text) {
      toast({ 
        title: 'Nothing to Copy', 
        description: `The ${label.toLowerCase()} section is empty.`, 
        variant: 'default' 
      });
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
  }, [toast]);

  const resetState = useCallback((keepPermissionState = false) => {
    setPermissionError(null);

    // Clear local UI state
    setTranscript('');
    setAnalysisLanguage('en');
    setMeetingName('');
    setMeetingDate(new Date());
    setLoadedRecordingId(null);
    setShowExportModal(false);

    // Delegate clearing complex state to dedicated hooks
    resetRecording();
    resetTranscription();
    resetAnalysis();
    resetExport();

    setPermissionProcessingState(
      !keepPermissionState && hasMicPermission === false ? PROCESSING_STATES.PERMISSION_DENIED : PROCESSING_STATES.IDLE
    );

    if (!keepPermissionState) {
      toast({
        title: 'Reset Complete',
        description: 'Input and results have been cleared.',
      });
    }
  }, [
    setPermissionError,
    setTranscript,
    setAnalysisLanguage,
    setMeetingName,
    setMeetingDate,
    setLoadedRecordingId,
    setShowExportModal,
    resetRecording,
    resetTranscription,
    resetAnalysis,
    resetExport,
    setPermissionProcessingState,
    hasMicPermission,
    toast
  ]);

  // Effects
  useEffect(() => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setMeetingDate(today);
    setRecordingNamePlaceholder(`e.g., Project Kickoff ${format(today, 'dd/MM/yyyy')}`);
  }, []);

  // Event handlers
  const handleRecordClick = useCallback(() => {
    if (hasMicPermission === false || (hasMicPermission === null && permissionProcessingState !== 'checking_permission')) {
      requestMicPermission();
    } else {
      handleRecord();
    }
  }, [hasMicPermission, permissionProcessingState, requestMicPermission, handleRecord]);

  const handleProcessClick = useCallback(() => {
    handleProcess(transcript);
  }, [handleProcess, transcript]);

  const handleGenerateExportClick = useCallback((format: any) => {
    handleGenerateExport(
      format,
      keyPoints,
      sentimentResult,
      topicsResult,
      transcript,
      translatedTranscript,
      analysisLanguage,
      meetingName,
      meetingDate
    );
  }, [
    handleGenerateExport,
    keyPoints,
    sentimentResult,
    topicsResult,
    transcript,
    translatedTranscript,
    analysisLanguage,
    meetingName,
    meetingDate
  ]);

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

      <main id="main-content" role="main" className={cn(
        "flex-1 flex flex-col items-center p-4 pt-8 md:pt-10 md:px-8 overflow-y-auto transition-all duration-300 ease-in-out"
      )}>
        <div className="container mx-auto max-w-4xl w-full">
          <header className="mb-8 text-center relative">
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
              <Mic className="w-10 h-10 text-primary drop-shadow-sm" />
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-foreground via-foreground/80 to-primary bg-clip-text text-transparent">
                MeetMind
              </h1>
            </div>
            <p className="mt-2 text-base sm:text-lg text-muted-foreground">
              Record, transcribe, and analyze your meetings with AI
            </p>
          </header>

          {/* Error Alert */}
          <ErrorAlert
            error={permissionError}
            processingState={permissionProcessingState}
            hasMicPermission={hasMicPermission}
            isLoading={isLoading}
          />

          {/* Recording Card */}
          <RecordingCard
            meetingName={meetingName}
            setMeetingName={setMeetingName}
            meetingDate={meetingDate}
            setMeetingDate={setMeetingDate}
            recordingLanguage={recordingLanguage}
            setRecordingLanguage={setRecordingLanguage}
            processingState={permissionProcessingState}
            hasMicPermission={hasMicPermission}
            onRecord={handleRecordClick}
            onStop={handleStop}
            onUpload={handleUpload}
            onReset={resetState}
            isLoading={isLoading}
            error={permissionError}
            remainingTime={remainingTime}
            recordingNamePlaceholder={recordingNamePlaceholder}
          />

          {/* Transcript Card */}
          <TranscriptCard
            transcript={transcript}
            setTranscript={setTranscript}
            processingState={permissionProcessingState}
            analysisLanguage={analysisLanguage}
            setAnalysisLanguage={setAnalysisLanguage}
            onProcess={handleProcessClick}
            isLoading={isLoading}
            liveDialogue={liveDialogue}
            recordingLanguage={recordingLanguage}
            loadedRecordingId={loadedRecordingId}
            error={permissionError}
          />

          {/* Loading Skeletons */}
          {showLoadingSkeletons && (
            <LoadingSkeletons
              processingState={permissionProcessingState}
              analysisLanguage={analysisLanguage}
            />
          )}

          {/* Analysis Results */}
          <AnalysisResults
            keyPoints={keyPoints}
            sentimentResult={sentimentResult}
            topicsResult={topicsResult}
            processingState={permissionProcessingState}
            onCopyToClipboard={copyToClipboard}
          />

          {/* Export Modal */}
          <ExportModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            exportContent={exportContent}
            exportFormat={exportFormat}
            onGenerateExport={handleGenerateExportClick}
            processingState={permissionProcessingState}
            meetingName={meetingName}
            meetingDate={meetingDate}
          />
        </div>
        <footer className="container mx-auto max-w-4xl w-full mt-6 pb-6 text-xs text-muted-foreground text-center">
          © {currentYear ?? new Date().getFullYear()} MeetMind. All rights reserved.
        </footer>
      </main>
    </div>
  );
};
