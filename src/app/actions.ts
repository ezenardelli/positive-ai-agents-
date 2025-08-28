'use server';

import {
  generateMeetingMinutes,
} from '@/ai/flows/generate-meeting-minutes';
import { suggestParticipants } from '@/ai/flows/suggest-participants';
import { generateConversationTitle } from '@/ai/flows/generate-conversation-title';
import type { AgentId, Conversation, Message } from '@/lib/types';
import { MOCK_CONVERSATIONS } from '@/lib/data';
import { saveMinute } from '@/services/firestore-service';

// This is a mock implementation. In a real app, you would use a database.
const conversationsDB: Record<string, Conversation> = MOCK_CONVERSATIONS.reduce(
  (acc, conv) => {
    acc[conv.id] = conv;
    return acc;
  },
  {} as Record<string, Conversation>
);

export async function getHistoryAction(): Promise<Conversation[]> {
  // Mock: return all conversations sorted by date
  return Object.values(conversationsDB).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export async function sendMessageAction(
  conversationId: string,
  agentId: AgentId,
  messageContent: string,
  clientContext?: string
): Promise<Message> {
  // In a real app, you would fetch the conversation from the database
  const conversation = conversationsDB[conversationId];
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const userMessage: Message = {
    role: 'user',
    content: messageContent,
    createdAt: new Date(),
  };
  conversation.messages.push(userMessage);

  let responseContent = '';

  try {
    if (agentId === 'minutaMaker') {
      if (!clientContext) {
        responseContent = 'Error: Se requiere un contexto de cliente para Minuta Maker.';
      } else {
        const { suggestedParticipants } = await suggestParticipants({ clientId: clientContext });
        const result = await generateMeetingMinutes({
          transcript: messageContent,
          pastParticipants: suggestedParticipants,
        });
        
        // As per user request, save the generated minute (mocked)
        await saveMinute(clientContext, undefined, result);
        
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
  
  const modelMessage: Message = {
    role: 'model',
    content: responseContent,
    createdAt: new Date(),
  };

  conversation.messages.push(modelMessage);

  // Auto-title conversation if it's short
  if (conversation.messages.length <= 2) {
    const { title } = await generateConversationTitle({
      messages: conversation.messages.map(m => ({...m, createdAt: m.createdAt.toISOString()})),
    });
    conversation.title = title;
  }
  
  return modelMessage;
}


export async function createConversationAction(
  agentId: AgentId,
  clientContext?: string,
): Promise<Conversation> {
  const newId = `conv_${Date.now()}`;
  const newConversation: Conversation = {
    id: newId,
    userId: 'user_123', // Mock user
    agentId,
    clientContext,
    messages: [],
    title: 'Nueva Conversación',
    createdAt: new Date(),
  };

  conversationsDB[newId] = newConversation;

  return newConversation;
}
