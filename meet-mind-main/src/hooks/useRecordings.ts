import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { RecordingMetadata } from '@/types';
import { getAllRecordingsMetadata, getRecording, deleteRecording } from '@/lib/db';

export const useRecordings = (
  onTranscriptionComplete: (audioBlob: Blob, sourceName?: string) => void,
  setMeetingName: (name: string) => void,
  setMeetingDate: (date: Date | undefined) => void,
  setRecordingLanguage: (language: string) => void,
  setProcessingState: (state: string) => void,
  setError: (error: string | null) => void
) => {
  const [recordings, setRecordings] = useState<RecordingMetadata[]>([]);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(true);
  const [loadedRecordingId, setLoadedRecordingId] = useState<number | null>(null);
  
  const { toast } = useToast();

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

  const handleSelectRecording = useCallback(async (id: number) => {
    setProcessingState('loading_recording');
    const loadToast = toast({ title: "Loading recording...", duration: Infinity });

    try {
      const recording = await getRecording(id);
      if (recording) {
        setLoadedRecordingId(id);
        setMeetingName(recording.name);
        setMeetingDate(new Date(recording.timestamp));
        
        // Basic language detection from MIME type
        const langFromMime = recording.blobMimeType.includes('sw') ? 'sw-TZ' : 'en-US';
        setRecordingLanguage(langFromMime);

        loadToast.update({ 
          title: "Recording Loaded!", 
          description: `"${recording.name}" ready for transcription/analysis.`, 
          duration: 3000 
        });

        // Transcribe the loaded recording's audioBlob
        onTranscriptionComplete(recording.audioBlob, recording.name);
      } else {
        throw new Error("Recording not found in local storage.");
      }
    } catch (err) {
      console.error(`Error loading recording ${id}:`, err);
      const message = err instanceof Error ? err.message : 'Unknown error.';
      setError(`Failed to load recording: ${message}`);
      setProcessingState('error');
      loadToast.update({ 
        title: "Loading Failed", 
        description: message, 
        variant: "destructive", 
        duration: 8000 
      });
      setLoadedRecordingId(null);
      setMeetingName('');
      setMeetingDate(new Date());
    }
  }, [toast, setProcessingState, setError, setMeetingName, setMeetingDate, setRecordingLanguage, onTranscriptionComplete]);

  const handleDeleteRecording = useCallback(async (id: number) => {
    try {
      await deleteRecording(id);
      toast({
        title: "Recording Deleted",
        description: "Recording has been removed from local storage.",
        variant: "default",
      });
      fetchRecordings(); // Refresh the list
    } catch (err) {
      console.error(`Error deleting recording ${id}:`, err);
      const message = err instanceof Error ? err.message : 'Unknown error.';
      toast({
        title: "Delete Failed",
        description: `Could not delete recording: ${message}`,
        variant: "destructive",
      });
    }
  }, [toast, fetchRecordings]);

  return {
    recordings,
    isLoadingRecordings,
    loadedRecordingId,
    setLoadedRecordingId,
    fetchRecordings,
    handleSelectRecording,
    handleDeleteRecording,
  };
};
