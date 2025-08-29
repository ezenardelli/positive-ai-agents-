'use server';

import 'dotenv/config';

import {
  generateMeetingMinutes,
} from '@/ai/flows/generate-meeting-minutes';
import { suggestParticipants } from '@/ai/flows/suggest-participants';
import { generateConversationTitle } from '@/ai/flows/generate-conversation-title';
import type { AgentId, Conversation, Message } from '@/lib/types';
import { 
  getConversations,
  getConversation,
  addMessage,
  createConversation,
  updateConversationTitle
} from '@/services/firestore-service';

// Use the presence of Firebase credentials to determine if we are in production
const isProduction = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export async function getHistoryAction(userId: string): Promise<Conversation[]> {
  if (!isProduction) return Promise.resolve([]);
  return await getConversations(userId);
}

export async function sendMessageAction(
  conversationId: string,
  agentId: AgentId,
  messageContent: string,
  clientContext?: string
): Promise<Message> {

  if (isProduction && conversationId) {
      const userMessage: Message = {
        role: 'user',
        content: messageContent,
        createdAt: new Date(),
      };
      await addMessage(conversationId, userMessage);
  }

  let responseContent = '';
  const modelMessage: Message = {
    role: 'model',
    content: 'Error',
    createdAt: new Date(),
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("La variable de entorno GEMINI_API_KEY no está configurada.");
    }

    if (agentId === 'minutaMaker') {
      const clientId = clientContext || 'mock-client';
      const pastParticipants = !isProduction ? [] : (await suggestParticipants({ clientId })).suggestedParticipants;
      
      const result = await generateMeetingMinutes({
        transcript: messageContent,
        pastParticipants: pastParticipants,
        clientId: clientId,
      });
      
      responseContent = `### Resumen Ejecutivo\n${result.summary}\n\n### Puntos de Acción\n${result.actionItems.map(item => `* ${item}`).join('\n')}\n\n### Temas Discutidos\n${result.topicsDiscussed.map(item => `* ${item}`).join('\n')}`;

    } else if (agentId === 'posiAgent') {
      responseContent = 'Posi Agent coming soon!';
    } else {
      responseContent = 'Error: Agente no encontrado.';
    }
  } catch (error) {
    console.error("Error processing agent logic:", error);
    if (error instanceof Error && (error.message.includes('API key') || error.message.includes('GEMINI_API_KEY'))) {
        responseContent = "Error: La API Key de Gemini no está configurada o no es válida. Por favor, revisa el archivo .env.";
    } else {
        responseContent = `Lo siento, ha ocurrido un error al procesar tu solicitud. ${error instanceof Error ? error.message : ''}`;
    }
  }
  
  modelMessage.content = responseContent;

  if (isProduction && conversationId) {
    await addMessage(conversationId, modelMessage);

    const conversation = await getConversation(conversationId);
    // Only generate title for the very first exchange.
    if (conversation && conversation.messages.length <= 2) { 
      const { title } = await generateConversationTitle({
        messages: conversation.messages.map(m => ({...m, createdAt: m.createdAt.toISOString()})),
      });
      await updateConversationTitle(conversationId, title);
    }
  }
  
  return modelMessage;
}


export async function createConversationAction(
  userId: string,
  agentId: AgentId,
  clientContext?: string,
): Promise<Conversation> {
   if (!isProduction) {
    // This is a mock for local/testing environments without firebase
    return {
      id: `mock-convo-${Date.now()}`,
      userId: 'mock-user-id',
      agentId,
      clientContext: clientContext || 'mock-client',
      title: 'Nueva Conversación de Prueba',
      messages: [],
      createdAt: new Date(),
    };
  }
  return await createConversation(userId, agentId, clientContext);
}
