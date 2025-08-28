'use server';
/**
 * @fileOverview This file defines a Genkit flow to suggest relevant past participants for the Minuta Maker agent.
 * 
 * - suggestParticipants - A function that handles the suggestion of past participants.
 * - SuggestParticipantsInput - The input type for the suggestParticipants function.
 * - SuggestParticipantsOutput - The return type for the suggestParticipants function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getPastParticipants} from '@/services/firestore-service';

const SuggestParticipantsInputSchema = z.object({
  clientId: z.string().describe('The ID of the client.'),
});
export type SuggestParticipantsInput = z.infer<typeof SuggestParticipantsInputSchema>;

const SuggestParticipantsOutputSchema = z.object({
  suggestedParticipants:
    z.array(z.string())
      .describe('An array of suggested past participants (email addresses).'),
});
export type SuggestParticipantsOutput = z.infer<typeof SuggestParticipantsOutputSchema>;

export async function suggestParticipants(input: SuggestParticipantsInput): Promise<SuggestParticipantsOutput> {
  return suggestParticipantsFlow(input);
}

const suggestParticipantsFlow = ai.defineFlow(
  {
    name: 'suggestParticipantsFlow',
    inputSchema: SuggestParticipantsInputSchema,
    outputSchema: SuggestParticipantsOutputSchema,
  },
  async input => {
    const pastParticipants = await getPastParticipants(input.clientId);
    return {suggestedParticipants: pastParticipants};
  }
);
