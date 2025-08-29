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

// Mock database for test mode
let mockConversations: Conversation[] = [];
let conversationIdCounter = 0;


export async function getHistoryAction(userId: string): Promise<Conversation[]> {
  if (!isProduction) {
    // Return a copy to prevent mutation issues
    return Promise.resolve(JSON.parse(JSON.stringify(mockConversations.filter(c => c.userId === userId))));
  }
  return await getConversations(userId);
}

export async function sendMessageAction(
  conversationId: string,
  agentId: AgentId,
  messageContent: string,
  clientContext?: string
): Promise<Message> {

  let userMessage: Message;

  // In production, save the user message to Firestore
  if (isProduction && conversationId) {
      userMessage = {
        role: 'user',
        content: messageContent,
        createdAt: new Date(),
      };
      await addMessage(conversationId, userMessage);
  } else if (!isProduction) {
    // In test mode, add to mock DB
     userMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: messageContent,
        createdAt: new Date(),
      };
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
      const pastParticipants = (await suggestParticipants({ clientId })).suggestedParticipants;
      
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
    if (conversation && conversation.messages.length <= 2) { 
      const { title } = await generateConversationTitle({
        messages: conversation.messages.map(m => ({...m, createdAt: m.createdAt.toISOString()})),
      });
      await updateConversationTitle(conversationId, title);
    }
  } else if (!isProduction) {
    const convo = mockConversations.find(c => c.id === conversationId);
    if (convo) {
      convo.messages.push(modelMessage);
      if(convo.messages.length <= 2) {
        const { title } = await generateConversationTitle({
            messages: convo.messages.map(m => ({...m, createdAt: m.createdAt.toISOString()})),
        });
        convo.title = title;
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
   if (!isProduction) {
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
    return Promise.resolve(JSON.parse(JSON.stringify(newConversation)));
  }
  return await createConversation(userId, agentId, clientContext);
}
