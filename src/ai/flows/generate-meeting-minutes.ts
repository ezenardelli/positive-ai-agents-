'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating meeting minutes from a transcript.
 *
 * It includes:
 * - generateMeetingMinutes - A function that takes a meeting transcript and generates meeting minutes.
 * - GenerateMeetingMinutesInput - The input type for the generateMeetingMinutes function.
 * - GenerateMeetingMinutesOutput - The return type for the generateMeetingMinutes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMeetingMinutesInputSchema = z.object({
  transcript: z.string().describe('La transcripción de la reunión.'),
  pastParticipants: z
    .array(z.string())
    .describe('Participantes anteriores en reuniones similares.')
});
export type GenerateMeetingMinutesInput = z.infer<
  typeof GenerateMeetingMinutesInputSchema
>;

const GenerateMeetingMinutesOutputSchema = z.object({
  summary: z.string().describe('Un resumen ejecutivo de la reunión.'),
  actionItems: z
    .array(z.string())
    .describe('Una lista de puntos de acción asignados a personas específicas.'),
  topicsDiscussed: z
    .array(z.string())
    .describe('Una lista de los temas principales discutidos durante la reunión.'),
  fullGeneratedText: z
    .string()
    .describe('The full generated text of the meeting minutes.'),
});
export type GenerateMeetingMinutesOutput = z.infer<
  typeof GenerateMeetingMinutesOutputSchema
>;

export async function generateMeetingMinutes(
  input: GenerateMeetingMinutesInput
): Promise<GenerateMeetingMinutesOutput> {
  return generateMeetingMinutesFlow(input);
}

const generateMeetingMinutesPrompt = ai.definePrompt({
  name: 'generateMeetingMinutesPrompt',
  input: {schema: GenerateMeetingMinutesInputSchema},
  output: {schema: GenerateMeetingMinutesOutputSchema},
  prompt: `Eres un Project Manager experto en Positive IT. Tu tarea es crear una minuta de reunión profesional en español.

Analiza la siguiente transcripción. Si la transcripción es muy corta o no parece una reunión (p. ej. un simple saludo), responde amigablemente indicando que necesitas una transcripción más completa para poder generar una minuta útil.

Contexto Adicional: En reuniones pasadas de este cliente participaron {{{pastParticipants}}}. Si surge un tema similar a proyectos anteriores, sugiere contactar a la persona relevante.

Transcripción de la reunión:
---
{{{transcript}}}
---

Si la transcripción es válida, genera la minuta con el siguiente formato:
1. Resumen Ejecutivo
2. Puntos de Acción (Asignados a personas específicas)
3. Temas Discutidos

Incluye la minuta completa en fullGeneratedText.
`,
});

const generateMeetingMinutesFlow = ai.defineFlow(
  {
    name: 'generateMeetingMinutesFlow',
    inputSchema: GenerateMeetingMinutesInputSchema,
    outputSchema: GenerateMeetingMinutesOutputSchema,
  },
  async input => {
    const {output} = await generateMeetingMinutesPrompt(input);
    return output!;
  }
);
