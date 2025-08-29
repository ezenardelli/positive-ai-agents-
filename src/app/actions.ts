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
  createConversation as createConversationInDb,
  updateConversationTitle
} from '@/services/firestore-service';


export async function getHistoryAction(userId: string, agentId: AgentId): Promise<Conversation[]> {
  // This action is now only for production. Test mode is handled client-side.
  console.log('[ACTION - PROD MODE] Getting history from Firestore for user:', userId);
  const allConversations = await getConversations(userId);
  return allConversations.filter(c => c.agentId === agentId);
}

export async function sendMessageAction(
  conversationId: string,
  agentId: AgentId,
  messageContent: string,
  clientContext?: string,
  isTestMode = false, // We pass the mode from the client
): Promise<Message> {
  console.log(`[ACTION - sendMessageAction] Mode: ${isTestMode ? 'TEST' : 'PROD'}, Convo ID: ${conversationId}, Agent: ${agentId}`);
  
  if (!isTestMode) {
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
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
    id: `msg-${Date.now() + 1}`,
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("La variable de entorno GEMINI_API_KEY no está configurada.");
    }

    if (agentId === 'minutaMaker') {
      const clientId = clientContext || 'mock-client';
      // In test mode, we can use mock participants. In prod, we fetch them.
      const pastParticipants = isTestMode 
        ? ['test1@example.com', 'test2@example.com'] 
        : (await suggestParticipants({ clientId })).suggestedParticipants;
      
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

  if (!isTestMode) {
    await addMessage(conversationId, modelMessage);

    const conversation = await getConversation(conversationId);
    // Title generation only on the second message (first user, first model)
    if (conversation && conversation.messages.length === 2) { 
      try {
        const { title } = await generateConversationTitle({
            messages: conversation.messages.map(m => ({...m, role: m.role, content: m.content, createdAt: m.createdAt.toISOString()})),
        });
        await updateConversationTitle(conversationId, title);
      } catch (e) {
        console.error("Failed to generate title in production:", e);
      }
    }
  }
  
  // Return only the model message. The client will handle UI updates.
  return modelMessage;
}

export async function createConversationAction(
  userId: string,
  agentId: AgentId,
  clientContext?: string,
): Promise<Conversation> {
   // This action is now only for production. Test mode is handled client-side.
  console.log('[ACTION - PROD MODE] Creating new conversation in Firestore for user:', userId);
  return await createConversationInDb(userId, agentId, clientContext);
}
