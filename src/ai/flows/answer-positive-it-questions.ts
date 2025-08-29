'use server';

/**
 * @fileOverview This file defines the Genkit flow for answering questions about Positive IT.
 * It uses content fetched from the company website as context for the AI.
 * 
 * - answerPositiveItQuestions - A function that takes a user's question and provides an answer.
 * - AnswerPositiveItQuestionsInput - The input type for the function.
 * - AnswerPositiveItQuestionsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getWebsiteContent } from '@/services/website-knowledge-service';

const AnswerPositiveItQuestionsInputSchema = z.object({
  question: z.string().describe('The user\'s question about Positive IT.'),
});
export type AnswerPositiveItQuestionsInput = z.infer<typeof AnswerPositiveItQuestionsInputSchema>;

const AnswerPositiveItQuestionsOutputSchema = z.object({
  answer: z.string().describe('The answer to the user\'s question, based *only* on the provided website content.'),
});
export type AnswerPositiveItQuestionsOutput = z.infer<typeof AnswerPositiveItQuestionsOutputSchema>;

export async function answerPositiveItQuestions(input: AnswerPositiveItQuestionsInput): Promise<AnswerPositiveItQuestionsOutput> {
  return answerPositiveItQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerPositiveItQuestionsPrompt',
  input: {
    schema: z.object({
        question: z.string(),
        websiteContent: z.string(),
    })
  },
  output: { schema: AnswerPositiveItQuestionsOutputSchema },
  prompt: `Eres "Posi Agent", un asistente experto de Positive IT. Tu única fuente de conocimiento es el contenido del sitio web de la empresa que se proporciona a continuación.

**Instrucciones estrictas:**
1.  Basa tu respuesta únicamente en el siguiente contenido del sitio web. No inventes información ni utilices conocimiento externo.
2.  Si la respuesta no se encuentra en el contenido proporcionado, responde amigablemente: "Lo siento, pero no he encontrado información sobre eso en el sitio web de Positive IT. ¿Puedo ayudarte con otra cosa?".
3.  Responde en español de forma profesional y servicial.

Contenido del Sitio Web:
---
{{{websiteContent}}}
---

Pregunta del usuario:
"{{{question}}}"

Respuesta:`,
});


const answerPositiveItQuestionsFlow = ai.defineFlow(
  {
    name: 'answerPositiveItQuestionsFlow',
    inputSchema: AnswerPositiveItQuestionsInputSchema,
    outputSchema: AnswerPositiveItQuestionsOutputSchema,
  },
  async (input) => {
    // 1. Fetch the website content in real-time.
    const websiteContent = await getWebsiteContent();

    // 2. Call the prompt with the question and the fetched content.
    const { output } = await prompt({
        question: input.question,
        websiteContent: websiteContent,
    });
    
    return output!;
  }
);
