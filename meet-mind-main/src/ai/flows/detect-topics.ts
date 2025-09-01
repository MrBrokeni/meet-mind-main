'use server';

/**
 * @fileOverview Detects the main topics discussed in a meeting transcript.
 *
 * - detectTopics - A function that identifies the main topics from a transcript.
 * - DetectTopicsInput - The input type for the detectTopics function.
 * - DetectTopicsOutput - The return type for the detectTopics function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const DetectTopicsInputSchema = z.object({
  transcript: z.string().describe('The translated transcript of the meeting.'),
});
export type DetectTopicsInput = z.infer<typeof DetectTopicsInputSchema>;

const DetectTopicsOutputSchema = z.object({
  topics: z.array(z.string()).describe('A list of the main topics discussed during the meeting.'),
});
export type DetectTopicsOutput = z.infer<typeof DetectTopicsOutputSchema>;

export async function detectTopics(
  input: DetectTopicsInput
): Promise<DetectTopicsOutput> {
  return detectTopicsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectTopicsPrompt',
  input: {
    schema: DetectTopicsInputSchema,
  },
  output: {
    schema: DetectTopicsOutputSchema,
  },
  prompt: `Analyze the following meeting transcript and identify the main topics discussed. List the key topics concisely.

  Transcript:
  {{{transcript}}}

  Output the list of topics in the requested JSON format.
  `,
});

const detectTopicsFlow = ai.defineFlow<
  typeof DetectTopicsInputSchema,
  typeof DetectTopicsOutputSchema
>(
  {
    name: 'detectTopicsFlow',
    inputSchema: DetectTopicsInputSchema,
    outputSchema: DetectTopicsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
