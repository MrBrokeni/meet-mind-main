'use server';

/**
 * @fileOverview A translation AI agent.
 *
 * - translateTranscript - A function that handles the plant diagnosis process.
 * - TranslateTranscriptInput - The input type for the translateTranscript function.
 * - TranslateTranscriptOutput - The return type for the translateTranscript function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const TranslateTranscriptInputSchema = z.object({
  transcript: z.string().describe('The transcript to translate.'),
  language: z.enum(['en', 'sw']).describe('The language to translate to (en=English, sw=Swahili).'),
});
export type TranslateTranscriptInput = z.infer<typeof TranslateTranscriptInputSchema>;

const TranslateTranscriptOutputSchema = z.object({
  translation: z.string().describe('The translated transcript.'),
});
export type TranslateTranscriptOutput = z.infer<typeof TranslateTranscriptOutputSchema>;

export async function translateTranscript(input: TranslateTranscriptInput): Promise<TranslateTranscriptOutput> {
  return translateTranscriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateTranscriptPrompt',
  input: {
    schema: z.object({
      transcript: z.string().describe('The transcript to translate.'),
      language: z.enum(['en', 'sw']).describe('The language to translate to (en=English, sw=Swahili).'),
    }),
  },
  output: {
    schema: z.object({
      translation: z.string().describe('The translated transcript.'),
    }),
  },
  prompt: `You are a translation expert.

  Translate the following transcript to {{language}}:

  Transcript: {{{transcript}}} `,
});

const translateTranscriptFlow = ai.defineFlow<
  typeof TranslateTranscriptInputSchema,
  typeof TranslateTranscriptOutputSchema
>(
  {
    name: 'translateTranscriptFlow',
    inputSchema: TranslateTranscriptInputSchema,
    outputSchema: TranslateTranscriptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
