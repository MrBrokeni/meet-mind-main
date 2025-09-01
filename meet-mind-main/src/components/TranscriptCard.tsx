import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Speech,
  Terminal,
  Loader2,
  Languages,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TranscriptCardProps } from '@/types';
import { ANALYSIS_LANGUAGES } from '@/constants';

export const TranscriptCard: React.FC<TranscriptCardProps> = ({
  transcript,
  setTranscript,
  processingState,
  analysisLanguage,
  setAnalysisLanguage,
  onProcess,
  isLoading,
  liveDialogue,
  recordingLanguage,
  loadedRecordingId,
  error,
}) => {
  const canProcess = transcript && 
    !isLoading && 
    processingState !== 'recording' && 
    processingState !== 'stopping' && 
    processingState !== 'saving' && 
    processingState !== 'transcribing' && 
    processingState !== 'loading_recording' && 
    processingState !== 'checking_permission' && 
    processingState !== 'processing';

  const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const pastedText = e.target.value;
    setTranscript(pastedText);
  };

  return (
    <Card className="w-full shadow-xl border border-border/50 mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
          <Speech className="h-6 w-6 text-accent" /> Transcript
        </CardTitle>
        <CardDescription>
          {processingState === 'recording' ? `Recording in ${recordingLanguage}... Live preview below. Final transcript will appear after saving.` :
           processingState === 'transcribing' ? 'Generating transcript from audio...' :
           transcript ? `Transcript generated ${loadedRecordingId !== null ? `from Recording ID ${loadedRecordingId}` : ''}. Select analysis language below.` :
           'The meeting transcript will be displayed here after recording or uploading.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live Transcription Preview */}
        {processingState === 'recording' && (
          <div className="rounded-md border border-dashed border-primary/50 bg-primary/5 p-4 shadow-inner">
            <Label className="text-xs font-medium text-primary mb-2 block">
              Live Transcription Preview ({recordingLanguage})
            </Label>
            <ScrollArea className="h-32 w-full rounded-md">
              <p className="whitespace-pre-wrap text-sm text-primary/90">
                {liveDialogue || <span className="italic text-muted-foreground">Listening... (Say something!)</span>}
              </p>
            </ScrollArea>
          </div>
        )}

        {/* Transcript Textarea or Skeletons */}
        {(processingState === 'transcribing' || processingState === 'loading_recording') && !transcript ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
        ) : (processingState === 'recording' || processingState === 'stopping' || processingState === 'saving') && !transcript ? (
          <div className="space-y-2">
            <Label htmlFor="transcriptArea" className={cn(isLoading || processingState === 'recording' ? "text-muted-foreground" : "")}>
              Final Transcript
            </Label>
            <div className="h-24 w-full rounded-md bg-muted/40 flex items-center justify-center text-muted-foreground italic p-4 text-center">
              {processingState === 'recording' ? "Transcript will be generated after saving..." : "Processing audio..."}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="transcriptArea" className={cn(isLoading || processingState === 'recording' ? "text-muted-foreground" : "")}>
              {loadedRecordingId !== null ? `Transcript (from Recording ID ${loadedRecordingId})` : transcript ? 'Transcript' : 'Transcript Input'}
            </Label>
            <Textarea
              id="transcriptArea"
              placeholder={transcript ? "Transcript generated." : "Paste your meeting transcript here, or record/upload above..."}
              value={transcript}
              onChange={handleTranscriptChange}
              rows={8}
              className="w-full resize-y"
              readOnly={isLoading || ['transcribing', 'recording', 'stopping', 'saving', 'processing', 'generating_export', 'loading_recording', 'checking_permission'].includes(processingState)}
              aria-label="Meeting Transcript"
            />
          </div>
        )}

        {/* Analysis Language Selection & Process Button */}
        {transcript && !isLoading && !['transcribing', 'recording', 'stopping', 'saving', 'loading_recording', 'checking_permission'].includes(processingState) && (
          <div className="space-y-4 pt-4 border-t border-border/30">
            <div className="space-y-3 rounded-lg border border-border/30 bg-muted/40 p-4 shadow-inner">
              <Label className="flex items-center gap-2 text-base font-medium text-foreground">
                <Languages className="h-5 w-5 text-primary" /> Select Analysis Language
              </Label>
              <RadioGroup
                defaultValue="en"
                value={analysisLanguage}
                onValueChange={(value) => setAnalysisLanguage(value as 'en' | 'sw')}
                className="flex flex-col space-y-2 sm:flex-row sm:space-x-6 sm:space-y-0"
                disabled={processingState === 'processing'}
                aria-label="Output Language Selection"
              >
                {Object.entries(ANALYSIS_LANGUAGES).map(([value, label]) => (
                  <div key={value} className="flex items-center space-x-2">
                    <RadioGroupItem value={value} id={`lang-${value}`} aria-label={`${label} Language`} />
                    <Label htmlFor={`lang-${value}`} className="cursor-pointer text-sm font-normal">
                      {label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex justify-center pt-2">
              <Button
                onClick={onProcess}
                disabled={!canProcess}
                size="lg"
                className="w-full sm:w-auto transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                aria-live="polite"
              >
                {processingState === 'processing' ? (
                  <> <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing... </>
                ) : (
                  <> <Terminal className="mr-2 h-5 w-5" /> Analyze Transcript </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
