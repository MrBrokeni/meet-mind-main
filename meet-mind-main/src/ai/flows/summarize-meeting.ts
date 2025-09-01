// SummarizeMeeting Flow
'use server';

/**
 * @fileOverview This file defines a Genkit flow to summarize a meeting transcript.
 *
 * - summarizeMeeting - A function that takes a meeting transcript and returns a concise summary.
 * - SummarizeMeetingInput - The input type for the summarizeMeeting function.
 * - SummarizeMeetingOutput - The return type for the summarizeMeeting function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SummarizeMeetingInputSchema = z.object({
  transcript: z.string().describe('The full transcript of the meeting.'),
});
export type SummarizeMeetingInput = z.infer<typeof SummarizeMeetingInputSchema>;

const SummarizeMeetingOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the meeting.'),
});
export type SummarizeMeetingOutput = z.infer<typeof SummarizeMeetingOutputSchema>;

export async function summarizeMeeting(input: SummarizeMeetingInput): Promise<SummarizeMeetingOutput> {
  return summarizeMeetingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeMeetingPrompt',
  input: {
    schema: z.object({
      transcript: z.string().describe('The full transcript of the meeting.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A concise summary of the meeting.'),
    }),
  },
  prompt: `You are an AI assistant tasked with summarizing meeting transcripts.  Create a concise summary of the following meeting transcript in under 30 seconds of reading time.\n\nTranscript:\n{{{transcript}}}`,
});

const summarizeMeetingFlow = ai.defineFlow<
  typeof SummarizeMeetingInputSchema,
  typeof SummarizeMeetingOutputSchema
>({
  name: 'summarizeMeetingFlow',
  inputSchema: SummarizeMeetingInputSchema,
  outputSchema: SummarizeMeetingOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});
