'use server';

import 'dotenv/config';

import {
  generateMeetingMinutes,
  type GenerateMeetingMinutesInput
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

export async function getHistoryAction(
  userId: string,
  agentId: AgentId,
): Promise<Conversation[]> {
  console.log(`[ACTION] Getting history from Firestore for user: ${userId} and agent: ${agentId}`);
  const allConversations = await getConversationsFromDb(userId);
  return allConversations.filter(c => c.agentId === agentId);
}

export async function sendMessageAction(
  conversationId: string,
  agentId: AgentId,
  messageContent: string,
  clientContext?: string,
): Promise<Message> {
  console.log(`[ACTION - sendMessageAction] Convo ID: ${conversationId}, Agent: ${agentId}`);

  const userMessage: Message = {
    id: `msg-user-${Date.now()}`,
    role: 'user',
    content: messageContent,
    createdAt: new Date(),
  };

  await addMessageToDb(conversationId, userMessage);

  let responseContent = '';
  const modelMessage: Message = {
    role: 'model',
    content: 'Error processing response.',
    createdAt: new Date(),
    id: `msg-model-${Date.now()}`,
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("La variable de entorno GEMINI_API_KEY no está configurada.");
    }

    if (agentId === 'minutaMaker') {
      const clientId = clientContext || 'mock-client';
      const pastParticipants = (await suggestParticipants({ clientId })).suggestedParticipants;
      
      const genInput: GenerateMeetingMinutesInput = {
        transcript: messageContent,
        pastParticipants: pastParticipants,
        isTestMode: false,
      };

      const result = await generateMeetingMinutes(genInput);
      
      responseContent = result.fullGeneratedText;

      // Save the generated minute to Firestore
      await saveMinute(clientId, undefined, { ...result, transcript: messageContent });

    } else if (agentId === 'posiAgent') {
      responseContent = 'Posi Agent coming soon!';
    } else {
      responseContent = 'Error: Agente no encontrado.';
    }
  } catch (error) {
    console.error("[ACTION] Error processing agent logic:", error);
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
      console.error("[ACTION] Failed to generate title:", e);
    }
  }
  
  return modelMessage;
}

export async function createConversationAction(
  userId: string,
  agentId: AgentId,
  clientContext?: string,
): Promise<Conversation> {
  console.log(`[ACTION - createConversationAction] Creating new conversation for user: ${userId}`);
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
