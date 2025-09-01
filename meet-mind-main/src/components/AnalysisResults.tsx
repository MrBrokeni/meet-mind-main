import React from 'react';
import { KeyPointsDisplay } from './KeyPointsDisplay';
import { SentimentDisplay } from './SentimentDisplay';
import { TopicsDisplay } from './TopicsDisplay';
import { AnalysisResultsProps } from '@/types';

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  keyPoints,
  sentimentResult,
  topicsResult,
  processingState,
  onCopyToClipboard,
}) => {
  const showResults = (processingState === 'done' || processingState === 'export_ready') && 
    keyPoints && 
    sentimentResult && 
    topicsResult;

  if (!showResults) {
    return null;
  }

  return (
    <div className="w-full space-y-8 mb-8">
      {/* Translated Transcript Display (if applicable) */}
      {/* This could be added here if needed */}

      {/* Sentiment and Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SentimentDisplay sentimentResult={sentimentResult} />
        <TopicsDisplay topicsResult={topicsResult} />
      </div>

      {/* Key Points Display */}
      <KeyPointsDisplay 
        keyPoints={keyPoints} 
        onCopyToClipboard={onCopyToClipboard} 
      />
    </div>
  );
};
