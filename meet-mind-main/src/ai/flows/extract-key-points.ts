'use server';

/**
 * @fileOverview Extracts key points from a meeting transcript, including decisions, tasks, questions, and deadlines.
 *
 * - extractKeyPoints - A function that extracts key points from a meeting transcript.
 * - ExtractKeyPointsInput - The input type for the extractKeyPoints function.
 * - ExtractKeyPointsOutput - The return type for the extractKeyPoints function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ExtractKeyPointsInputSchema = z.object({
  transcript: z.string().describe('The translated transcript of the meeting.'),
});
export type ExtractKeyPointsInput = z.infer<typeof ExtractKeyPointsInputSchema>;

const ExtractKeyPointsOutputSchema = z.object({
  summary: z.string().describe('A short summary of the meeting.'),
  decisions: z.array(z.string()).describe('Key decisions made during the meeting.'),
  tasks: z
    .array(z.string())
    .describe('Tasks assigned during the meeting, including assigned names.'),
  questions: z.array(z.string()).describe('Questions raised during the meeting.'),
  deadlines: z.array(z.string()).describe('Important deadlines mentioned in the meeting.'),
});
export type ExtractKeyPointsOutput = z.infer<typeof ExtractKeyPointsOutputSchema>;

export async function extractKeyPoints(input: ExtractKeyPointsInput): Promise<ExtractKeyPointsOutput> {
  return extractKeyPointsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractKeyPointsPrompt',
  input: {
    schema: z.object({
      transcript: z.string().describe('The translated transcript of the meeting.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A short summary of the meeting.'),
      decisions: z.array(z.string()).describe('Key decisions made during the meeting.'),
      tasks: z
        .array(z.string())
        .describe('Tasks assigned during the meeting, including assigned names.'),
      questions: z.array(z.string()).describe('Questions raised during the meeting.'),
      deadlines: z.array(z.string()).describe('Important deadlines mentioned in the meeting.'),
    }),
  },
  prompt: `You are an AI assistant tasked with extracting key information from a meeting transcript.\n\n  Analyze the following transcript and identify key decisions, assigned tasks (including names, if provided), questions raised, and deadlines. Also, provide a concise summary of the meeting that is under 30 seconds of reading time.\n\n  Transcript: {{{transcript}}}\n\n  Output the summary, decisions, tasks, questions, and deadlines in the requested JSON format.\n`,
});

const extractKeyPointsFlow = ai.defineFlow<
  typeof ExtractKeyPointsInputSchema,
  typeof ExtractKeyPointsOutputSchema
>(
  {
    name: 'extractKeyPointsFlow',
    inputSchema: ExtractKeyPointsInputSchema,
    outputSchema: ExtractKeyPointsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
