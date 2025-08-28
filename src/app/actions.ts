'use server';

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

const IS_TEST_MODE = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'your-api-key';

export async function getHistoryAction(userId: string): Promise<Conversation[]> {
  if (IS_TEST_MODE) return [];
  return await getConversations(userId);
}

export async function sendMessageAction(
  conversationId: string,
  agentId: AgentId,
  messageContent: string,
  clientContext?: string
): Promise<Message> {
  
  if (IS_TEST_MODE) {
    // In test mode, just return a canned response
    return {
      role: 'model',
      content: `Hola! Soy ${agentId}. Esto es una respuesta de prueba. El mensaje fue: "${messageContent}"`,
      createdAt: new Date(),
    };
  }

  const userMessage: Message = {
    role: 'user',
    content: messageContent,
    createdAt: new Date(),
  };
  await addMessage(conversationId, userMessage);

  let responseContent = '';
  const modelMessage: Message = {
    role: 'model',
    content: 'Error',
    createdAt: new Date(),
  };

  try {
    if (agentId === 'minutaMaker') {
      if (!clientContext) {
        responseContent = 'Error: Se requiere un contexto de cliente para Minuta Maker.';
      } else {
        const { suggestedParticipants } = await suggestParticipants({ clientId: clientContext });
        const result = await generateMeetingMinutes({
          transcript: messageContent,
          pastParticipants: suggestedParticipants,
          clientId: clientContext,
        });
        
        responseContent = `### Resumen Ejecutivo\n${result.summary}\n\n### Puntos de Acción\n${result.actionItems.map(item => `* ${item}`).join('\n')}\n\n### Temas Discutidos\n${result.topicsDiscussed.map(item => `* ${item}`).join('\n')}`;
      }
    } else if (agentId === 'posiAgent') {
      responseContent = 'Posi Agent coming soon!';
    } else {
      responseContent = 'Error: Agente no encontrado.';
    }
  } catch (error) {
    console.error("Error processing agent logic:", error);
    responseContent = "Lo siento, ha ocurrido un error al procesar tu solicitud.";
  }
  
  modelMessage.content = responseContent;
  await addMessage(conversationId, modelMessage);

  const conversation = await getConversation(conversationId);
  if (conversation && conversation.messages.length <= 2) {
    const { title } = await generateConversationTitle({
      messages: conversation.messages.map(m => ({...m, createdAt: m.createdAt.toISOString()})),
    });
    await updateConversationTitle(conversationId, title);
  }
  
  return modelMessage;
}


export async function createConversationAction(
  userId: string,
  agentId: AgentId,
  clientContext?: string,
): Promise<Conversation> {
  if (IS_TEST_MODE) {
    console.log("Running in test mode, creating mock conversation.");
    return {
      id: `mock-${Date.now()}`,
      userId,
      agentId,
      clientContext: clientContext || undefined,
      title: 'Nueva Conversación (Prueba)',
      messages: [],
      createdAt: new Date(),
    };
  }
  return await createConversation(userId, agentId, clientContext);
}
