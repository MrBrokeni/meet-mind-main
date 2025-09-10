import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProcessingState, AnalysisLanguage } from '@/types';

interface LoadingSkeletonsProps {
  processingState: ProcessingState;
  analysisLanguage: AnalysisLanguage;
}

export const LoadingSkeletons: React.FC<LoadingSkeletonsProps> = ({
  processingState,
  analysisLanguage,
}) => {
  return (
    <div className="w-full space-y-6 mb-8">
      <h3 className="text-center text-lg font-semibold text-muted-foreground">
        {processingState === 'processing' ? 'Generating Analysis...' : 'Generating Export Content...'}
      </h3>
      
      {/* Optional: Skeleton for translated transcript if applicable */}
      {(processingState === 'processing' && analysisLanguage !== 'en') && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2 rounded-md skeleton-shimmer" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full rounded-md skeleton-shimmer" />
          </CardContent>
        </Card>
      )}
      
      {/* Skeletons for sentiment and topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 rounded-md skeleton-shimmer" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-1/2 rounded-md skeleton-shimmer" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 rounded-md skeleton-shimmer" />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20 rounded-full skeleton-shimmer" />
            <Skeleton className="h-6 w-24 rounded-full skeleton-shimmer" />
            <Skeleton className="h-6 w-16 rounded-full skeleton-shimmer" />
          </CardContent>
        </Card>
      </div>
      
      {/* Skeleton for key points */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3 rounded-md skeleton-shimmer" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full rounded-md skeleton-shimmer" />
          <Skeleton className="h-8 w-3/4 rounded-md skeleton-shimmer" />
          <Skeleton className="h-8 w-2/3 rounded-md skeleton-shimmer" />
        </CardContent>
      </Card>
    </div>
  );
};
