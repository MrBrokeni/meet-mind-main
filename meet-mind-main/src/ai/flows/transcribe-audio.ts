
'use server';

/**
 * @fileOverview Transcribes audio data using an AI model.
 *
 * - transcribeAudio - A function that handles the audio transcription process.
 * - TranscribeAudioInput - The input type for the transcribeAudio function.
 * - TranscribeAudioOutput - The return type for the transcribeAudio function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const TranscribeAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "Audio data encoded as a data URI, including MIME type (e.g., 'data:audio/webm;codecs=opus;base64,...')."
    ),
    // languageCode removed, relying on model auto-detection
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

const TranscribeAudioOutputSchema = z.object({
  transcript: z.string().describe('The transcribed text from the audio.'),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

export async function transcribeAudio(
  input: TranscribeAudioInput
): Promise<TranscribeAudioOutput> {
  return transcribeAudioFlow(input);
}

// Using gemini-1.5-flash as it supports audio input and auto language detection
const transcriptionModel = 'googleai/gemini-1.5-flash';

// Prompt definition simplified as language hint is removed
const prompt = ai.definePrompt(
  {
    name: 'transcribeAudioPrompt',
    model: transcriptionModel,
    input: {
      schema: TranscribeAudioInputSchema,
    },
    output: {
      schema: TranscribeAudioOutputSchema,
    },
    prompt: `Transcribe the following audio accurately. Output only the transcribed text.

    Audio: {{media url=audioDataUri}}
    `,
  },
  async (input) => {
    // Check if audioDataUri starts with 'data:audio/'
    if (!input.audioDataUri?.startsWith('data:audio/')) {
      throw new Error(
        'Invalid audioDataUri format. Must start with "data:audio/".'
      );
    }

     const promptText = `Transcribe the following audio accurately. Output only the transcribed text.`;

    const promptRequest = {
      prompt: [
        { text: promptText },
        { media: { url: input.audioDataUri } },
      ],
      output: {
          format: 'json', // Request JSON output based on schema
          schema: TranscribeAudioOutputSchema,
      },
    };
    return promptRequest;
  }
);


const transcribeAudioFlow = ai.defineFlow<
  typeof TranscribeAudioInputSchema,
  typeof TranscribeAudioOutputSchema
>(
  {
    name: 'transcribeAudioFlow',
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
  },
  async (input) => {
    console.log('Transcribing audio with model:', transcriptionModel);
    // console.log('Audio data URI (first 100 chars):', input.audioDataUri.substring(0, 100)); // Log start of URI for debugging

     const promptText = `Transcribe the following audio accurately. Output only the transcribed text.`;

    try {
       const llmResponse = await ai.generate({
         model: transcriptionModel,
         prompt: [
           {text: promptText},
           {media: {url: input.audioDataUri}}
         ],
         // Config can be added here if needed, e.g., for specific transcription settings
         // config: {
         //   languageCodes: [], // Rely on auto-detection
         // }
       });

       const transcriptText = llmResponse.text;
       console.log('Transcription successful (length):', transcriptText.length);
       // console.log('Transcription result:', transcriptText); // Log full transcript if needed

       // Validate and structure the output according to the schema
       // Since the prompt asks for only text, wrap it in the schema structure
       const validatedOutput = TranscribeAudioOutputSchema.parse({ transcript: transcriptText });
       return validatedOutput;


    } catch (error) {
      console.error('Error during Genkit transcription:', error);
      // Re-throw a more specific error or handle as needed
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
