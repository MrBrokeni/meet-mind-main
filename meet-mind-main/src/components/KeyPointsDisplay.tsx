import React, { memo, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  ClipboardList,
  HelpCircle,
  Timer,
  BookOpen,
  Copy,
  ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExtractKeyPointsOutput } from '@/types';
import { KEY_POINTS_ICONS, KEY_POINTS_COLORS } from '@/constants';

interface KeyPointsDisplayProps {
  keyPoints: ExtractKeyPointsOutput;
  onCopyToClipboard: (text: string, label: string) => void;
}

export const KeyPointsDisplay: React.FC<KeyPointsDisplayProps> = memo(({ keyPoints, onCopyToClipboard }) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    summary: <BookOpen className="h-5 w-5 text-primary" />,
    decisions: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />,
    tasks: <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    questions: <HelpCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
    deadlines: <Timer className="h-5 w-5 text-red-600 dark:text-red-400" />,
  };

  const pointsToShow = useMemo(() => ([
    { title: 'Summary', data: keyPoints.summary ? [keyPoints.summary] : [], icon: iconMap.summary, copyKey: 'summary', copyLabel: 'Summary' },
    { title: 'Decisions', data: keyPoints.decisions || [], icon: iconMap.decisions, copyKey: 'decisions', copyLabel: 'Decisions' },
    { title: 'Tasks', data: keyPoints.tasks || [], icon: iconMap.tasks, copyKey: 'tasks', copyLabel: 'Tasks' },
    { title: 'Questions', data: keyPoints.questions || [], icon: iconMap.questions, copyKey: 'questions', copyLabel: 'Questions' },
    { title: 'Deadlines', data: keyPoints.deadlines || [], icon: iconMap.deadlines, copyKey: 'deadlines', copyLabel: 'Deadlines' },
  ]), [keyPoints.summary, keyPoints.decisions, keyPoints.tasks, keyPoints.questions, keyPoints.deadlines]);

  const formatCopyText = useCallback((data: string[], title: string): string => {
    const nonEmptyData = data?.filter(item => item && item.trim() !== '');
    if (!nonEmptyData || nonEmptyData.length === 0) return '';
    if (nonEmptyData.length === 1 && title === 'Summary') return nonEmptyData[0];
    return `${title}:\n- ${nonEmptyData.join('\n- ')}`;
  }, []);

  const validPoints = useMemo(() => pointsToShow.filter(point => 
    point.data && point.data.length > 0 && point.data.some(item => item && item.trim() !== '')
  ), [pointsToShow]);

  if (validPoints.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Key Points & Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No key points or summary could be extracted from the transcript.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-xl">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-accent" /> Key Points & Summary
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const allText = validPoints
                .map(p => formatCopyText(p.data, p.title))
                .filter(text => text)
                .join('\n\n');
              onCopyToClipboard(allText, 'All Key Points');
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Copy all key points"
            disabled={validPoints.length === 0}
          >
            <Copy className="h-4 w-4 mr-1" /> Copy All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full" defaultValue={['summary']}>
          {validPoints.map((point) => (
            <AccordionItem value={point.title.toLowerCase().replace(/\s+/g, '-')} key={point.title}>
              <AccordionTrigger className="text-lg font-semibold hover:no-underline group">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {point.icon}
                    {point.title}
                    {(point.title !== 'Summary') && point.data.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{point.data.length}</Badge>
                    )}
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyToClipboard(formatCopyText(point.data, point.title), point.copyLabel);
                    }}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity mr-2 flex items-center justify-center cursor-pointer rounded-md hover:bg-accent"
                    aria-label={`Copy ${point.title}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onCopyToClipboard(formatCopyText(point.data, point.title), point.copyLabel);
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {point.title === 'Summary' ? (
                  <p className="text-sm whitespace-pre-wrap pl-1">{point.data[0]}</p>
                ) : (
                  <ul className="list-disc space-y-2 pl-6 text-sm">
                    {point.data.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
});
