'use server';

/**
 * @fileOverview This file defines the Genkit flow for answering questions as a direct conversational AI.
 * It maintains conversation history to provide context-aware responses.
 * 
 * - answerPositiveItQuestions - A function that takes the conversation history and provides a response.
 * - AnswerPositiveItQuestionsInput - The input type for the function.
 * - AnswerPositiveItQuestionsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getWebsiteContent } from '@/services/website-knowledge-service';

const AnswerPositiveItQuestionsInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).describe('The conversation history.'),
});
export type AnswerPositiveItQuestionsInput = z.infer<typeof AnswerPositiveItQuestionsInputSchema>;

const AnswerPositiveItQuestionsOutputSchema = z.object({
  answer: z.string().describe('The answer to the user\'s question, based on the conversation history.'),
});
export type AnswerPositiveItQuestionsOutput = z.infer<typeof AnswerPositiveItQuestionsOutputSchema>;

export async function answerPositiveItQuestions(input: AnswerPositiveItQuestionsInput): Promise<AnswerPositiveItQuestionsOutput> {
  return answerPositiveItQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerPositiveItQuestionsPrompt',
  input: {
    schema: AnswerPositiveItQuestionsInputSchema
  },
  output: { schema: AnswerPositiveItQuestionsOutputSchema },
  prompt: `Eres "Posi", un asistente de IA servicial y creativo de Positive IT.

Continúa la siguiente conversación de una manera útil y amigable. Basa tu respuesta en el contexto del historial.

Historial de la Conversación:
---
{{#each history}}
  {{role}}: {{content}}
{{/each}}
---
Respuesta:`,
});


const answerPositiveItQuestionsFlow = ai.defineFlow(
  {
    name: 'answerPositiveItQuestionsFlow',
    inputSchema: AnswerPositiveItQuestionsInputSchema,
    outputSchema: AnswerPositiveItQuestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt({
        history: input.history,
    });
    
    return { answer: output!.answer };
  }
);
