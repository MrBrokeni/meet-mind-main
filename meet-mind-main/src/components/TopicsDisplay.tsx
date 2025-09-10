import React, { memo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tags } from 'lucide-react';
import { DetectTopicsOutput } from '@/types';

interface TopicsDisplayProps {
  topicsResult: DetectTopicsOutput;
}

export const TopicsDisplay: React.FC<TopicsDisplayProps> = memo(({ topicsResult }) => {
  if (!topicsResult || !topicsResult.topics || topicsResult.topics.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Tags className="h-5 w-5 text-accent" /> Detected Topics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {topicsResult.topics.map((topic, index) => (
            <Badge key={index} variant="outline" className="text-sm px-3 py-1">
              {topic}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
