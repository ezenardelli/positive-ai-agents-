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

// This is the single source of truth for test mode.
// It's true if the Firebase credentials are NOT set.
const isTestMode = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;


// Mock database for test mode
let mockConversations: Conversation[] = [];
let conversationIdCounter = 0;


export async function getHistoryAction(userId: string, agentId: AgentId): Promise<Conversation[]> {
  if (isTestMode) {
    // In test mode, return only conversations for the active agent
    const agentHistory = mockConversations.filter(c => c.userId === userId && c.agentId === agentId);
    // Return a deep copy to avoid mutation issues
    return Promise.resolve(JSON.parse(JSON.stringify(agentHistory)));
  }
  // In production, fetch from Firestore and then filter
  const allConversations = await getConversations(userId);
  return allConversations.filter(c => c.agentId === agentId);
}

export async function sendMessageAction(
  conversationId: string,
  agentId: AgentId,
  messageContent: string,
  clientContext?: string
): Promise<Message> {
  const userMessage: Message = {
    id: `msg-${Date.now()}`,
    role: 'user',
    content: messageContent,
    createdAt: new Date(),
  };

  // Persist user message
  if (!isTestMode) {
    await addMessage(conversationId, userMessage);
  } else {
    const convo = mockConversations.find(c => c.id === conversationId);
    if(convo) {
      convo.messages.push(userMessage);
    }
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
        // Don't block the response for a title failure
      }
    }
  } else {
    const convo = mockConversations.find(c => c.id === conversationId);
    if (convo) {
      convo.messages.push(modelMessage);
      if(convo.messages.length === 2) {
        try {
            const { title } = await generateConversationTitle({
                messages: convo.messages.map(m => ({...m, role: m.role, content: m.content, createdAt: m.createdAt.toISOString()})),
            });
            convo.title = title;
        } catch (e) {
            console.error("Failed to generate title in test mode:", e);
            convo.title = "Título no disponible";
        }
      }
    }
  }
  
  return modelMessage;
}

export async function createConversationAction(
  userId: string,
  agentId: AgentId,
  clientContext?: string,
): Promise<Conversation> {
   if (isTestMode) {
    const newConversation: Conversation = {
      id: `mock-convo-${conversationIdCounter++}`,
      userId: userId,
      agentId,
      clientContext: clientContext || (agentId === 'minutaMaker' ? 'cliente_A' : undefined),
      title: 'Nueva Conversación de Prueba',
      messages: [],
      createdAt: new Date(),
    };
    mockConversations.unshift(newConversation); // Add to the beginning
    // Return a plain object, no need for JSON parsing here.
    return newConversation;
  }
  // This now calls the dedicated Firestore service function
  return await createConversationInDb(userId, agentId, clientContext);
}
