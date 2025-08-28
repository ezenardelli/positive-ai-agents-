'use server';

/**
 * @fileOverview A Genkit flow to automatically generate a title for a conversation.
 *
 * - generateConversationTitle - A function that handles the conversation title generation process.
 * - GenerateConversationTitleInput - The input type for the generateConversationTitle function.
 * - GenerateConversationTitleOutput - The return type for the generateConversationTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateConversationTitleInputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
        createdAt: z.string(),
      })
    )
    .describe('The messages in the conversation.'),
});
export type GenerateConversationTitleInput = z.infer<typeof GenerateConversationTitleInputSchema>;

const GenerateConversationTitleOutputSchema = z.object({
  title: z.string().describe('A concise title for the conversation.'),
});
export type GenerateConversationTitleOutput = z.infer<typeof GenerateConversationTitleOutputSchema>;

export async function generateConversationTitle(input: GenerateConversationTitleInput): Promise<GenerateConversationTitleOutput> {
  return generateConversationTitleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateConversationTitlePrompt',
  input: {schema: GenerateConversationTitleInputSchema},
  output: {schema: GenerateConversationTitleOutputSchema},
  prompt: `You are an AI assistant that generates concise titles for conversations.

Given the following conversation messages, generate a title that summarizes the main topic of the conversation.

Messages:
{{#each messages}}
  {{role}}: {{content}}
{{/each}}

Title:`,
});

const generateConversationTitleFlow = ai.defineFlow(
  {
    name: 'generateConversationTitleFlow',
    inputSchema: GenerateConversationTitleInputSchema,
    outputSchema: GenerateConversationTitleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
