import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  ProcessingState, 
  AnalysisLanguage, 
  ExtractKeyPointsOutput, 
  AnalyzeSentimentOutput, 
  DetectTopicsOutput,
  TranslateTranscriptOutput 
} from '@/types';
import { PROCESSING_STATES, TOAST_DURATIONS } from '@/constants';
import {
  translateTranscript,
  type TranslateTranscriptInput,
} from '@/ai/flows/translate-transcript';
import {
  extractKeyPoints,
  type ExtractKeyPointsInput,
} from '@/ai/flows/extract-key-points';
import {
  analyzeSentiment,
  type AnalyzeSentimentInput,
} from '@/ai/flows/analyze-sentiment';
import {
  detectTopics,
  type DetectTopicsInput,
} from '@/ai/flows/detect-topics';

export const useAnalysis = (
  setProcessingState: (state: ProcessingState) => void,
  setError: (error: string | null) => void
) => {
  const [analysisLanguage, setAnalysisLanguage] = useState<AnalysisLanguage>('en');
  const [translatedTranscript, setTranslatedTranscript] = useState<string>('');
  const [keyPoints, setKeyPoints] = useState<ExtractKeyPointsOutput | null>(null);
  const [sentimentResult, setSentimentResult] = useState<AnalyzeSentimentOutput | null>(null);
  const [topicsResult, setTopicsResult] = useState<DetectTopicsOutput | null>(null);
  
  const { toast } = useToast();

  const handleProcess = useCallback(async (transcript: string) => {
    if (!transcript) {
      setError('Please record, upload, or load a transcript first.');
      toast({
        title: 'Error',
        description: 'No transcript provided.',
        variant: 'destructive',
      });
      return;
    }

    setProcessingState(PROCESSING_STATES.PROCESSING);
    setError(null);
    setKeyPoints(null);
    setTranslatedTranscript('');
    setSentimentResult(null);
    setTopicsResult(null);
    
    const processToast = toast({
      title: 'Processing Meeting...',
      description: `Analyzing transcript in ${analysisLanguage.toUpperCase()}...`,
      duration: TOAST_DURATIONS.INFINITE,
    });

    try {
      let transcriptToAnalyze = transcript;
      
      // Translate if the analysis language is different from English
      if (analysisLanguage !== 'en') {
        processToast.update({ description: `Translating to ${analysisLanguage.toUpperCase()} for analysis...` });
        const translateInput: TranslateTranscriptInput = { transcript, language: analysisLanguage };
        const translationResult: TranslateTranscriptOutput = await translateTranscript(translateInput);
        transcriptToAnalyze = translationResult.translation;
        setTranslatedTranscript(transcriptToAnalyze);
        if (!transcriptToAnalyze) {
          throw new Error("Translation result was empty.");
        }
      } else {
        setTranslatedTranscript('');
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

      setProcessingState(PROCESSING_STATES.DONE);
      processToast.update({
        title: 'Processing Complete!',
        description: 'Meeting insights generated successfully.',
        variant: 'default',
        duration: TOAST_DURATIONS.MEDIUM,
      });
    } catch (err) {
      console.error('Processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Processing failed: ${errorMessage}`);
      setProcessingState(PROCESSING_STATES.ERROR);
      processToast.update({
        title: 'Processing Error',
        description: `Failed to generate insights: ${errorMessage}`,
        variant: 'destructive',
        duration: TOAST_DURATIONS.LONG,
      });
    }
  }, [analysisLanguage, toast, setProcessingState, setError]);

  const resetAnalysis = useCallback(() => {
    setKeyPoints(null);
    setTranslatedTranscript('');
    setSentimentResult(null);
    setTopicsResult(null);
  }, []);

  return {
    analysisLanguage,
    setAnalysisLanguage,
    translatedTranscript,
    keyPoints,
    sentimentResult,
    topicsResult,
    handleProcess,
    resetAnalysis,
  };
};
