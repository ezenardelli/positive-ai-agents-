'use server';

import 'dotenv/config';

import {
  generateMeetingMinutes,
} from '@/ai/flows/generate-meeting-minutes';
import { suggestParticipants } from '@/ai/flows/suggest-participants';
import { generateConversationTitle } from '@/ai/flows/generate-conversation-title';
import type { AgentId, Conversation, Message } from '@/lib/types';
import { 
  getConversations as getConversationsFromDb,
  getConversation as getConversationFromDb,
  addMessage as addMessageToDb,
  createConversation as createConversationInDb,
  updateConversationTitle as updateConversationTitleInDb,
  saveMinute
} from '@/services/firestore-service';
import { processDocx } from '@/ai/flows/process-docx-flow';


export async function getHistoryAction(userId: string, agentId: AgentId): Promise<Conversation[]> {
  console.log('[ACTION] Getting history from Firestore for user:', userId);
  const allConversations = await getConversationsFromDb(userId);
  return allConversations.filter(c => c.agentId === agentId);
}

export async function sendMessageAction(
  conversationId: string,
  agentId: AgentId,
  messageContent: string,
  clientContext?: string
): Promise<void> {
  console.log(`[ACTION - sendMessageAction] Convo ID: ${conversationId}, Agent: ${agentId}`);
  
  const userMessage: Message = {
    id: `msg-${Date.now()}`,
    role: 'user',
    content: messageContent,
    createdAt: new Date(),
  };
  await addMessageToDb(conversationId, userMessage);

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
      const pastParticipants = (await suggestParticipants({ clientId })).suggestedParticipants;
      
      const result = await generateMeetingMinutes({
        transcript: messageContent,
        pastParticipants: pastParticipants
      });
      
      responseContent = `### Resumen Ejecutivo\n${result.summary}\n\n### Puntos de Acción\n${result.actionItems.map(item => `* ${item}`).join('\n')}\n\n### Temas Discutidos\n${result.topicsDiscussed.map(item => `* ${item}`).join('\n')}`;

      // Save the generated minute along with the transcript used
      await saveMinute(clientId, undefined, { ...result, transcript: messageContent });

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

  await addMessageToDb(conversationId, modelMessage);

  const conversation = await getConversationFromDb(conversationId);
  // Title generation only on the second message (first user, first model)
  if (conversation && conversation.messages.length === 2) { 
    try {
      const { title } = await generateConversationTitle({
          messages: conversation.messages.map(m => ({...m, role: m.role, content: m.content, createdAt: m.createdAt.toISOString()})),
      });
      await updateConversationTitleInDb(conversationId, title);
    } catch (e) {
      console.error("Failed to generate title in production:", e);
    }
  }
}

export async function createConversationAction(
  userId: string,
  agentId: AgentId,
  clientContext?: string,
): Promise<Conversation> {
  console.log('[ACTION] Creating new conversation in Firestore for user:', userId);
  return await createConversationInDb(userId, agentId, clientContext);
}

export async function processFileAction(fileDataUri: string): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
        const result = await processDocx({ fileDataUri });
        return { success: true, text: result.text };
    } catch (error) {
        console.error("Error processing DOCX file:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}
