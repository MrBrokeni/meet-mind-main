import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ProcessingState } from '@/types';
import { PROCESSING_STATES, TOAST_DURATIONS } from '@/constants';

export const usePermissions = () => {
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>(PROCESSING_STATES.IDLE);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (hasMicPermission === null || hasMicPermission === false) {
      setProcessingState(PROCESSING_STATES.CHECKING_PERMISSION);
    }
    setError(null);

    try {
      let permissionStatus: PermissionStatus | undefined;
      
      try {
        permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      } catch (queryError) {
        console.warn("Microphone permission query failed:", queryError);
        permissionStatus = undefined;
      }

      if (permissionStatus?.state === 'granted') {
        console.log("Microphone permission already granted.");
        setHasMicPermission(true);
        if ([PROCESSING_STATES.CHECKING_PERMISSION, PROCESSING_STATES.PERMISSION_DENIED].includes(processingState)) {
          setProcessingState(PROCESSING_STATES.IDLE);
        }
        return true;
      }

      if (permissionStatus?.state === 'denied') {
        console.log("Microphone permission explicitly denied by user or policy.");
        setHasMicPermission(false);
        setProcessingState(PROCESSING_STATES.PERMISSION_DENIED);
        toast({
          title: 'Microphone Access Denied',
          description: 'Please enable microphone permissions in your browser settings to record audio.',
          variant: 'destructive',
          duration: TOAST_DURATIONS.LONG,
        });
        setError('Microphone access is required to record audio.');
        return false;
      }

      console.log("Requesting microphone permission via getUserMedia...");
      setProcessingState(PROCESSING_STATES.CHECKING_PERMISSION);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      console.log("Microphone permission granted via prompt.");
      setHasMicPermission(true);
      setProcessingState(PROCESSING_STATES.IDLE);
      return true;

    } catch (err) {
      console.error('Error requesting microphone permission:', err);
      setHasMicPermission(false);
      setProcessingState(PROCESSING_STATES.PERMISSION_DENIED);
      let message = 'Please enable microphone permissions in your browser settings to record audio.';
      
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          message = 'Microphone access was denied. Please enable it in browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          message = 'No microphone found. Please ensure a microphone is connected and enabled.';
        } else {
          message = `Could not access microphone: ${err.message}. Check browser settings.`;
        }
      }
      
      toast({
        title: 'Microphone Access Denied',
        description: message,
        variant: 'destructive',
        duration: TOAST_DURATIONS.LONG,
      });
      setError('Microphone access is required to record audio.');
      return false;
    }
  }, [toast, hasMicPermission, processingState]);

  useEffect(() => {
    const checkAndListenPermission = async () => {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setHasMicPermission(permissionStatus.state === 'granted');

          if (permissionStatus.state === 'denied' && processingState !== PROCESSING_STATES.PERMISSION_DENIED) {
            setProcessingState(PROCESSING_STATES.PERMISSION_DENIED);
            setError('Microphone access is required to record audio.');
          } else if (permissionStatus.state === 'granted' && processingState === PROCESSING_STATES.PERMISSION_DENIED) {
            setProcessingState(PROCESSING_STATES.IDLE);
            setError(null);
          } else if (processingState === PROCESSING_STATES.CHECKING_PERMISSION && permissionStatus.state !== 'prompt') {
            setProcessingState(permissionStatus.state === 'granted' ? PROCESSING_STATES.IDLE : PROCESSING_STATES.PERMISSION_DENIED);
            if (permissionStatus.state === 'denied') setError('Microphone access is required to record audio.');
          }

          permissionStatus.onchange = () => {
            const isGranted = permissionStatus.state === 'granted';
            setHasMicPermission(isGranted);
            console.log("Microphone permission changed:", permissionStatus.state);

            if (!isGranted && processingState === PROCESSING_STATES.RECORDING) {
              setProcessingState(PROCESSING_STATES.PERMISSION_DENIED);
              setError('Microphone access was revoked during recording.');
              toast({
                title: "Permission Revoked", 
                description: "Microphone access was revoked. Recording stopped.", 
                variant: "destructive"
              });
            } else if (!isGranted && processingState !== PROCESSING_STATES.PERMISSION_DENIED) {
              setProcessingState(PROCESSING_STATES.PERMISSION_DENIED);
              setError('Microphone access is required to record audio.');
            } else if (isGranted && processingState === PROCESSING_STATES.PERMISSION_DENIED) {
              setProcessingState(PROCESSING_STATES.IDLE);
              setError(null);
              toast({
                title: "Permission Granted", 
                description: "Microphone access enabled.", 
                variant: "default"
              });
            }
          };
        } catch (error) {
          console.error("Error checking/listening microphone permission:", error);
          if (error instanceof TypeError && error.message.includes("not a valid value for enumeration PermissionName")) {
            console.warn("Browser might not support querying 'microphone' permission status proactively.");
            setHasMicPermission(null);
          } else {
            setHasMicPermission(null);
          }
        }
      } else {
        console.warn("Permissions API or MediaDevices not fully supported.");
        setHasMicPermission(null);
      }
    };
    
    checkAndListenPermission();
  }, [processingState, toast]);

  return {
    hasMicPermission,
    processingState,
    error,
    requestMicPermission,
    setProcessingState,
    setError,
  };
};
