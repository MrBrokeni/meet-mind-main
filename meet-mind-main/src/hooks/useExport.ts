import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { marked } from 'marked';
import { format } from 'date-fns';
import { 
  ProcessingState, 
  ExportFormat, 
  ExtractKeyPointsOutput, 
  AnalyzeSentimentOutput, 
  DetectTopicsOutput,
  AnalysisLanguage 
} from '@/types';
import { PROCESSING_STATES, TOAST_DURATIONS } from '@/constants';
import {
  generateExportContent,
  type GenerateExportContentInput,
  type GenerateExportContentOutput,
} from '@/ai/flows/generate-export-content';

export const useExport = (
  setProcessingState: (state: ProcessingState) => void,
  setError: (error: string | null) => void
) => {
  const [exportContent, setExportContent] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  
  const { toast } = useToast();

  const handleGenerateExport = useCallback(async (
    selectedFormat: ExportFormat,
    keyPoints: ExtractKeyPointsOutput | null,
    sentimentResult: AnalyzeSentimentOutput | null,
    topicsResult: DetectTopicsOutput | null,
    transcript: string,
    translatedTranscript: string,
    analysisLanguage: AnalysisLanguage,
    meetingName: string,
    meetingDate: Date | undefined
  ) => {
    if (PROCESSING_STATES.DONE !== 'done' || !keyPoints || !sentimentResult || !topicsResult) {
      toast({
        title: "Analysis Not Ready",
        description: "Please analyze the transcript first before exporting.",
        variant: "destructive",
      });
      return;
    }

    setProcessingState(PROCESSING_STATES.GENERATING_EXPORT);
    setError(null);
    setExportContent('');
    setExportFormat(selectedFormat);
    
    const exportToast = toast({
      title: `Generating ${selectedFormat.toUpperCase()} Content...`,
      description: 'Preparing analysis results for export...',
      duration: TOAST_DURATIONS.INFINITE,
    });

    try {
      const input: GenerateExportContentInput = {
        keyPoints: keyPoints,
        sentimentResult: sentimentResult,
        topicsResult: topicsResult,
        format: selectedFormat,
        originalTranscript: transcript,
        translatedTranscript: analysisLanguage !== 'en' && translatedTranscript ? translatedTranscript : undefined,
        language: analysisLanguage,
      };

      const result: GenerateExportContentOutput = await generateExportContent(input);

      if (result.exportedContent) {
        setExportContent(result.exportedContent);

        if (selectedFormat === 'pdf') {
          // Convert Markdown to HTML for printing
          const htmlContent = await marked(result.exportedContent);
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head>
                  <title>Meeting Analysis Report - ${meetingName || new Date().toLocaleString()}</title>
                  <style>
                    body { font-family: sans-serif; line-height: 1.6; padding: 2rem; }
                    h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; color: #333; }
                    h1 { border-bottom: 2px solid #eee; padding-bottom: 0.3em; font-size: 1.8em; }
                    h2 { border-bottom: 1px solid #eee; padding-bottom: 0.3em; font-size: 1.5em; }
                    h3 { font-size: 1.2em; }
                    ul, ol { padding-left: 1.5em; margin-bottom: 1em; }
                    li { margin-bottom: 0.5em; }
                    p { margin-bottom: 1em; }
                    pre { background-color: #f5f5f5; padding: 1em; border-radius: 4px; overflow-x: auto; font-family: monospace; white-space: pre-wrap; word-wrap: break-word; }
                    code { font-family: monospace; }
                    blockquote { border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0; color: #666; }
                    hr { border: none; border-top: 1px solid #eee; margin: 2em 0; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .page-break { page-break-before: always; }
                    @media print {
                      body { padding: 1rem; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      h1, h2, h3, p, li { color: #000 !important; }
                      pre { background-color: #eee !important; border: 1px solid #ccc !important; }
                    }
                  </style>
                </head>
                <body>
                  <h1>Meeting Analysis Report</h1>
                  <p><strong>Date Generated:</strong> ${new Date().toLocaleString()}</p>
                  ${meetingName ? `<p><strong>Meeting Name:</strong> ${meetingName}</p>` : ''}
                  ${meetingDate ? `<p><strong>Meeting Date:</strong> ${format(meetingDate, 'PPP')}</p>` : ''}
                  <hr/>
                  ${htmlContent}
                </body>
              </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
              try {
                printWindow.focus();
                printWindow.print();
              } catch (printError) {
                console.error("Error during print operation:", printError);
                toast({ 
                  title: "Print Error", 
                  description: "Could not initiate print dialog. Please try again or check browser settings.", 
                  variant: "destructive"
                });
              }
              setProcessingState(PROCESSING_STATES.DONE);
              setExportFormat(null);
            }, 500);

            exportToast.update({
              title: 'Print Dialog Opened',
              description: `Use your browser's print dialog to save as PDF.`,
              variant: 'default',
              duration: TOAST_DURATIONS.MEDIUM,
            });
          } else {
            throw new Error("Could not open print window. Please check your browser's pop-up blocker settings.");
          }
        } else {
          setProcessingState(PROCESSING_STATES.EXPORT_READY);
          setShowExportModal(true);
          exportToast.update({
            title: 'Export Content Ready!',
            description: `Markdown content for ${selectedFormat.toUpperCase()} is generated.`,
            variant: 'default',
            duration: TOAST_DURATIONS.MEDIUM,
          });
        }
      } else {
        throw new Error("Generated export content was empty.");
      }
    } catch (err) {
      console.error('Export generation error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error.';
      setError(`Failed to generate export content: ${message}`);
      setProcessingState(PROCESSING_STATES.ERROR);
      setExportFormat(null);
      exportToast.update({
        title: 'Export Generation Failed',
        description: message,
        variant: 'destructive',
        duration: TOAST_DURATIONS.LONG,
      });
    } finally {
      if (setProcessingState.toString().includes('generating_export') && selectedFormat !== 'pdf' && !setError.toString().includes('error')) {
        setProcessingState(PROCESSING_STATES.DONE);
      }
    }
  }, [toast, setProcessingState, setError]);

  const resetExport = useCallback(() => {
    setExportContent('');
    setExportFormat(null);
    setShowExportModal(false);
  }, []);

  return {
    exportContent,
    exportFormat,
    showExportModal,
    setShowExportModal,
    handleGenerateExport,
    resetExport,
  };
};
