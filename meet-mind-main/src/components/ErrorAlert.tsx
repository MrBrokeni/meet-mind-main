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
  const showErrorAlert = error && 
    (processingState === 'error' || processingState === 'permission_denied') && 
    !isLoading && 
    processingState !== 'checking_permission';

  if (!showErrorAlert) {
    return null;
  }

  return (
    <Alert variant="destructive" className="w-full shadow-lg mb-8">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="font-semibold">
        {processingState === 'permission_denied' ? "Permission Required" : "Error Occurred"}
      </AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
};
