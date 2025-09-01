import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  FileCode,
  Presentation,
  FileDown,
  Printer,
  Loader2,
  Copy,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExportModalProps } from '@/types';
import { EXPORT_FORMATS } from '@/constants';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  exportContent,
  exportFormat,
  onGenerateExport,
  processingState,
  meetingName,
  meetingDate,
}) => {
  const { toast } = useToast();

  const copyToClipboard = () => {
    if (!exportContent) {
      toast({ 
        title: 'Nothing to Copy', 
        description: 'The export content is empty.', 
        variant: 'default' 
      });
      return;
    }
    navigator.clipboard.writeText(exportContent)
      .then(() => {
        toast({
          title: 'Export Content Copied!',
          description: 'The content has been copied to your clipboard.',
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
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'docx':
        return <FileCode className="h-4 w-4" />;
      case 'pptx':
        return <Presentation className="h-4 w-4" />;
      case 'pdf':
        return <Printer className="h-4 w-4" />;
      default:
        return <FileDown className="h-4 w-4" />;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'docx':
        return 'Copy the Markdown content below and paste it into a Word document. Use a Markdown converter for proper formatting.';
      case 'pptx':
        return 'Copy the Markdown content below and use it to create PowerPoint slides. Each section can become a slide.';
      case 'pdf':
        return 'The PDF has been generated and the print dialog should have opened. Use your browser\'s print function to save as PDF.';
      default:
        return 'Copy the content below for your preferred export format.';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {exportFormat && getFormatIcon(exportFormat)}
            Export {exportFormat ? EXPORT_FORMATS[exportFormat] : 'Content'}
          </DialogTitle>
          <DialogDescription>
            {exportFormat ? getFormatDescription(exportFormat) : 'Export your meeting analysis in your preferred format.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Export Format Selection */}
          {!exportFormat && (
            <div className="space-y-3">
              <h4 className="font-medium">Select Export Format:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(EXPORT_FORMATS).map(([format, label]) => (
                  <Button
                    key={format}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => onGenerateExport(format as any)}
                    disabled={processingState === 'generating_export'}
                  >
                    {getFormatIcon(format)}
                    <span className="text-sm font-medium">{label}</span>
                    {processingState === 'generating_export' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Export Content Display */}
          {exportContent && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Export Content:</h4>
                <div className="flex items-center gap-2">
                  {meetingName && (
                    <Badge variant="secondary">{meetingName}</Badge>
                  )}
                  {meetingDate && (
                    <Badge variant="outline">
                      {meetingDate.toLocaleDateString()}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Textarea
                value={exportContent}
                readOnly
                className="min-h-[300px] font-mono text-sm"
                placeholder="Export content will appear here..."
              />
            </div>
          )}

          {/* Loading State */}
          {processingState === 'generating_export' && !exportContent && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Generating export content...</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
