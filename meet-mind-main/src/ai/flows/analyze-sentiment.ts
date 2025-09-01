'use server';

/**
 * @fileOverview Analyzes the overall sentiment of a meeting transcript.
 *
 * - analyzeSentiment - A function that determines the sentiment of a transcript.
 * - AnalyzeSentimentInput - The input type for the analyzeSentiment function.
 * - AnalyzeSentimentOutput - The return type for the analyzeSentiment function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzeSentimentInputSchema = z.object({
  transcript: z.string().describe('The translated transcript of the meeting.'),
});
export type AnalyzeSentimentInput = z.infer<typeof AnalyzeSentimentInputSchema>;

const AnalyzeSentimentOutputSchema = z.object({
  sentiment: z
    .enum(['positive', 'negative', 'neutral'])
    .describe('The overall sentiment detected in the transcript.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'The confidence score (0-1) of the sentiment analysis.'
    ),
  reasoning: z.string().optional().describe('Brief reasoning for the sentiment classification.')
});
export type AnalyzeSentimentOutput = z.infer<typeof AnalyzeSentimentOutputSchema>;

export async function analyzeSentiment(
  input: AnalyzeSentimentInput
): Promise<AnalyzeSentimentOutput> {
  return analyzeSentimentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSentimentPrompt',
  input: {
    schema: AnalyzeSentimentInputSchema,
  },
  output: {
    schema: AnalyzeSentimentOutputSchema,
  },
  prompt: `Analyze the overall sentiment of the following meeting transcript. Determine if the general tone is positive, negative, or neutral. Provide a confidence score between 0 and 1 for your assessment and optionally a brief reasoning.

  Transcript:
  {{{transcript}}}

  Output the sentiment, confidence score, and optional reasoning in the requested JSON format.
  `,
});

const analyzeSentimentFlow = ai.defineFlow<
  typeof AnalyzeSentimentInputSchema,
  typeof AnalyzeSentimentOutputSchema
>(
  {
    name: 'analyzeSentimentFlow',
    inputSchema: AnalyzeSentimentInputSchema,
    outputSchema: AnalyzeSentimentOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
