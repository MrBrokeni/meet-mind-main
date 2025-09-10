import React, { memo, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smile, Frown, Meh, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyzeSentimentOutput } from '@/types';
import { SENTIMENT_COLORS } from '@/constants';

interface SentimentDisplayProps {
  sentimentResult: AnalyzeSentimentOutput;
}

export const SentimentDisplay: React.FC<SentimentDisplayProps> = memo(({ sentimentResult }) => {
  const { sentiment, confidence, reasoning } = sentimentResult;

  const { IconComponent, colorClass, text } = useMemo(() => {
    switch (sentiment) {
      case 'positive':
        return { IconComponent: Smile, colorClass: SENTIMENT_COLORS.positive, text: 'Positive' };
      case 'negative':
        return { IconComponent: Frown, colorClass: SENTIMENT_COLORS.negative, text: 'Negative' };
      default:
        return { IconComponent: Meh, colorClass: SENTIMENT_COLORS.neutral, text: 'Neutral' };
    }
  }, [sentiment]);

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5 text-accent" /> Sentiment Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <IconComponent className={cn('h-8 w-8', colorClass)} />
          <span className={cn('text-2xl font-semibold', colorClass)}>{text}</span>
          <Badge variant="secondary" className="ml-auto text-sm">
            Confidence: {Math.round(confidence * 100)}%
          </Badge>
        </div>
        {reasoning && (
          <p className="text-sm text-muted-foreground italic">"{reasoning}"</p>
        )}
      </CardContent>
    </Card>
  );
});
