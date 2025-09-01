import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ProcessingState } from '@/types';
import { PROCESSING_STATES, TOAST_DURATIONS } from '@/constants';
import { transcribeAudio, type TranscribeAudioInput, type TranscribeAudioOutput } from '@/ai/flows/transcribe-audio';

export const useTranscription = (
  setProcessingState: (state: ProcessingState) => void,
  setError: (error: string | null) => void
) => {
  const [transcript, setTranscript] = useState<string>('');
  const { toast } = useToast();

  const runTranscription = useCallback(async (audioBlob: Blob, sourceName?: string) => {
    if (!audioBlob || audioBlob.size === 0) {
      setError('No audio data found for transcription.');
      setProcessingState(PROCESSING_STATES.ERROR);
      toast({ 
        title: "Transcription Error", 
        description: "Cannot transcribe empty audio.", 
        variant: "destructive" 
      });
      return;
    }

    if (setProcessingState.toString().includes('transcribing')) {
      console.warn("Transcription already in progress.");
      return;
    }

    setProcessingState(PROCESSING_STATES.TRANSCRIBING);
    const transcriptionToast = toast({
      title: 'Transcribing audio...',
      description: sourceName ? `Processing ${sourceName}...` : 'Processing audio...',
      duration: TOAST_DURATIONS.INFINITE,
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
      
      const input: TranscribeAudioInput = { audioDataUri: dataUri };
      const result: TranscribeAudioOutput = await transcribeAudio(input);

      if (result.transcript) {
        setTranscript(result.transcript);
        setProcessingState(PROCESSING_STATES.IDLE);
        transcriptionToast.update({
          title: 'Transcription complete!',
          description: 'Transcript is ready for processing.',
          variant: 'default',
          duration: TOAST_DURATIONS.MEDIUM,
        });
      } else {
        console.warn('Transcription returned empty string.');
        setError('Transcription result was empty.');
        setProcessingState(PROCESSING_STATES.ERROR);
        transcriptionToast.update({
          title: 'Transcription Issue',
          description: 'The transcription result was empty.',
          variant: 'destructive',
          duration: TOAST_DURATIONS.LONG,
        });
      }

    } catch (err) {
      console.error('Transcription error:', err);
      const message = err instanceof Error ? err.message : 'Unknown transcription error.';
      setError(`Transcription failed: ${message}`);
      setProcessingState(PROCESSING_STATES.ERROR);
      transcriptionToast.update({
        title: 'Transcription Failed',
        description: message,
        variant: 'destructive',
        duration: TOAST_DURATIONS.LONG,
      });
    }
  }, [toast, setProcessingState, setError]);

  const resetTranscription = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    transcript,
    setTranscript,
    runTranscription,
    resetTranscription,
  };
};
