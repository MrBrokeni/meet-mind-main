import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ProcessingState } from '@/types';

interface ErrorAlertProps {
  error: string | null;
  processingState: ProcessingState;
  hasMicPermission: boolean | null;
  isLoading: boolean;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  processingState,
  hasMicPermission,
  isLoading,
}) => {
  const showErrorAlert = Boolean(
    error && (processingState === 'error' || processingState === 'permission_denied') && !isLoading
  );

  if (!showErrorAlert) {
    return null;
  }

  return (
    <Alert variant="destructive" className="w-full shadow-lg mb-8" role="alert" aria-live="assertive">
      <AlertCircle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle className="font-semibold">
        {processingState === 'permission_denied' ? "Permission Required" : "Error Occurred"}
      </AlertTitle>
      <AlertDescription>
        {error}
        {processingState === 'permission_denied' && hasMicPermission === false && (
          <span className="block mt-2 text-sm">
            Please enable microphone permissions in your browser and retry.
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
};
