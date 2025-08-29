'use server';
/**
 * @fileOverview A Genkit flow to process a .docx file and extract its text content.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import mammoth from 'mammoth';

const ProcessDocxInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A .docx file encoded as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ProcessDocxInput = z.infer<typeof ProcessDocxInputSchema>;

const ProcessDocxOutputSchema = z.object({
  text: z.string().describe('The extracted text content from the document.'),
});
export type ProcessDocxOutput = z.infer<typeof ProcessDocxOutputSchema>;

export async function processDocx(
  input: ProcessDocxInput
): Promise<ProcessDocxOutput> {
  return processDocxFlow(input);
}

const processDocxFlow = ai.defineFlow(
  {
    name: 'processDocxFlow',
    inputSchema: ProcessDocxInputSchema,
    outputSchema: ProcessDocxOutputSchema,
  },
  async (input) => {
    try {
      // Extract the base64 part of the data URI
      const base64String = input.fileDataUri.split(',')[1];
      if (!base64String) {
        throw new Error('Invalid Data URI format.');
      }

      const buffer = Buffer.from(base64String, 'base64');
      
      const { value: text } = await mammoth.extractRawText({ buffer });

      return { text };

    } catch (error) {
      console.error("Error in processDocxFlow: ", error);
      throw new Error(`Failed to process .docx file. ${error instanceof Error ? error.message : ''}`);
    }
  }
);
