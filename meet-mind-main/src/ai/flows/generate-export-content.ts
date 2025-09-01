'use server';

/**
 * @fileOverview Generates structured content (Markdown) from meeting analysis results for export.
 *
 * - generateExportContent - A function that takes analysis results and a target format, returning formatted content.
 * - GenerateExportContentInput - The input type for the generateExportContent function.
 * - GenerateExportContentOutput - The return type for the generateExportContent function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type {
  ExtractKeyPointsOutput
} from './extract-key-points';
import type { AnalyzeSentimentOutput } from './analyze-sentiment';
import type { DetectTopicsOutput } from './detect-topics';


// Define schemas based on existing flow outputs
const KeyPointsSchema = z.object({
  summary: z.string().optional(),
  decisions: z.array(z.string()).optional(),
  tasks: z.array(z.string()).optional(),
  questions: z.array(z.string()).optional(),
  deadlines: z.array(z.string()).optional(),
}).nullable().describe('Extracted key points from the meeting.');

const SentimentSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number(),
  reasoning: z.string().optional(),
}).nullable().describe('Sentiment analysis results.');

const TopicsSchema = z.object({
  topics: z.array(z.string()),
}).nullable().describe('Detected topics from the meeting.');


const GenerateExportContentInputSchema = z.object({
    keyPoints: KeyPointsSchema,
    sentimentResult: SentimentSchema,
    topicsResult: TopicsSchema,
    format: z.enum(['docx', 'pptx', 'pdf']).describe('The desired export format.'),
    originalTranscript: z.string().optional().describe('The original (untranslated) meeting transcript.'),
    translatedTranscript: z.string().optional().describe('The translated meeting transcript, if applicable.'),
    language: z.string().optional().describe('The language the analysis was performed in (e.g., "en", "sw").'),
});
export type GenerateExportContentInput = z.infer<typeof GenerateExportContentInputSchema>;

const GenerateExportContentOutputSchema = z.object({
  exportedContent: z
    .string()
    .describe(
      'The structured content (usually Markdown) formatted for the requested export type.'
    ),
});
export type GenerateExportContentOutput = z.infer<typeof GenerateExportContentOutputSchema>;

export async function generateExportContent(
  input: GenerateExportContentInput
): Promise<GenerateExportContentOutput> {
  return generateExportContentFlow(input);
}


// Helper function to format data for the prompt (avoids cluttering Handlebars)
function formatDataForPrompt(data: any): string {
  if (data === null || data === undefined) return 'N/A';
  if (Array.isArray(data)) {
      return data.length > 0 ? data.map(item => `- ${item}`).join('\n') : 'None';
  }
  if (typeof data === 'object') {
      // Basic object formatting, customize as needed
      return JSON.stringify(data, null, 2);
  }
  return String(data);
}


const prompt = ai.definePrompt({
  name: 'generateExportContentPrompt',
  input: {
    schema: GenerateExportContentInputSchema,
  },
  output: {
    schema: GenerateExportContentOutputSchema,
  },
  prompt: `You are an AI assistant specializing in formatting meeting analysis results for export.
Generate structured content based on the provided meeting analysis data and the requested format: {{format}}.

The output should be primarily in **Markdown** format, suitable for easy conversion or copy-pasting into the target application (Word for DOCX, PowerPoint for PPTX, or printing for PDF).

**Meeting Analysis Data:**

**Language:** {{language | default("N/A")}}
{{#if translatedTranscript}}
**Analyzed Transcript ({{language}}):**
{{{translatedTranscript}}}
---
**Original Transcript:**
{{{originalTranscript}}}
{{else}}
**Transcript:**
{{{originalTranscript}}}
{{/if}}
---
**Key Points & Summary:**
Summary: {{formatDataForPrompt keyPoints.summary}}
Decisions:
{{formatDataForPrompt keyPoints.decisions}}
Tasks:
{{formatDataForPrompt keyPoints.tasks}}
Questions:
{{formatDataForPrompt keyPoints.questions}}
Deadlines:
{{formatDataForPrompt keyPoints.deadlines}}
---
**Sentiment Analysis:**
Sentiment: {{sentimentResult.sentiment}} (Confidence: {{round (multiply sentimentResult.confidence 100)}}%)
Reasoning: {{formatDataForPrompt sentimentResult.reasoning}}
---
**Detected Topics:**
{{formatDataForPrompt topicsResult.topics}}
---

**Instructions based on Format ({{format}}):**

{{#eq format "docx"}}
**Format for DOCX:**
Structure the content logically using Markdown headers (#, ##, ###), lists (* or -), bold text (**bold**), and paragraphs. Ensure readability and clarity suitable for a formal document. Start with a main title like "# Meeting Analysis Report". Include sections for Transcript (optional, maybe just summary), Key Points, Sentiment, and Topics.
{{/eq}}

{{#eq format "pptx"}}
**Format for PPTX (Slides):**
Outline the content as a series of slides using Markdown. Use '## Slide Title' for each slide. Keep bullet points concise. Suggest potential slide layouts or elements where appropriate (e.g., "(Chart suggestion: Sentiment distribution)").
Example Structure:
## Meeting Analysis Overview
- Summary: ...
- Sentiment: ...
- Key Topics: ...

## Key Decisions
- Decision 1...
- Decision 2...

## Action Items / Tasks
- Task 1 (Assignee)...
- Task 2 (Assignee)...

## Sentiment Details (Chart suggestion: Sentiment Score)
- Overall: {{sentimentResult.sentiment}}
- Confidence: {{round (multiply sentimentResult.confidence 100)}}%
- Reasoning: ...

## Discussion Topics
- Topic 1
- Topic 2
... (continue for other relevant sections like Questions, Deadlines)
{{/eq}}

{{#eq format "pdf"}}
**Format for PDF (via Print):**
Generate clean, well-structured Markdown suitable for printing or direct conversion to PDF. Use Markdown headers (#, ##, ###), lists (* or -), bold text (**bold**), horizontal rules (---), and paragraphs. Aim for a professional document layout. Start with a main title like "# Meeting Analysis Report". Include sections for Key Points, Sentiment, and Topics. The full transcript can be included at the end if requested, or just the summary. Ensure good spacing and readability for printing.
{{/eq}}

**Generate the Markdown content below based on the instructions for the "{{format}}" format:**
`,
   // Register Handlebars helpers (if needed, basic ones are built-in)
    customize: (prompt) => {
        // Add custom helpers here if required, e.g., for complex formatting
        prompt.handlebars.registerHelper('formatDataForPrompt', formatDataForPrompt);
        prompt.handlebars.registerHelper('round', Math.round);
        prompt.handlebars.registerHelper('multiply', (a, b) => (a || 0) * (b || 0));
        prompt.handlebars.registerHelper('default', (value, defaultValue) => value || defaultValue);
         prompt.handlebars.registerHelper('eq', (a, b) => a === b); // Add eq helper
    }
});

const generateExportContentFlow = ai.defineFlow<
  typeof GenerateExportContentInputSchema,
  typeof GenerateExportContentOutputSchema
>(
  {
    name: 'generateExportContentFlow',
    inputSchema: GenerateExportContentInputSchema,
    outputSchema: GenerateExportContentOutputSchema,
  },
  async (input) => {
     // Optionally add pre-processing logic here if needed
     console.log(`Generating export content for format: ${input.format}`);

    const {output} = await prompt(input);

    if (!output?.exportedContent) {
        console.error("Export content generation failed or returned empty.");
        throw new Error("Failed to generate export content.");
    }

     // Optionally add post-processing logic here if needed
    return { exportedContent: output.exportedContent.trim() };
  }
);
