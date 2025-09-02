'use client';

import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  Timestamp, 
  arrayUnion, 
  serverTimestamp, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Conversation, Message, AgentId } from '@/lib/types';

// Helper to convert Firestore Timestamps to Dates in conversation objects
const conversationFromDoc = (docSnapshot: any): Conversation => {
    const data = docSnapshot.data();
    const conversationCreatedAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : new Date();

    const messages = (data.messages || []).map((msg: any) => ({
        ...msg,
        createdAt: msg.createdAt instanceof Timestamp 
            ? msg.createdAt.toDate() 
            : new Date(),
    }));

    return {
        id: docSnapshot.id,
        userId: data.userId,
        agentId: data.agentId,
        clientContext: data.clientContext,
        title: data.title || null,
        createdAt: conversationCreatedAt,
        messages: messages,
    };
};

export async function getConversations(userId: string): Promise<Conversation[]> {
    try {
        const convosRef = collection(db, 'conversations');
        const q = query(convosRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(conversationFromDoc);
    } catch (error) {
        console.error("Error fetching conversations:", error);
        if (error instanceof Error && error.message.includes("requires an index")) {
            throw new Error(`Error de base de datos: Se requiere un índice de Firestore.`);
        }
        if (error instanceof Error && (error.message.includes("does not exist") || error.message.includes("permission-denied") || error.message.includes("PERMISSION_DENIED") || error.message.includes("unavailable"))) {
            console.warn("Conversations collection may not exist yet. Returning empty array.");
            return [];
        }
        throw error;
    }
}

export async function createConversation(userId: string, agentId: AgentId): Promise<Conversation> {
    const newConvoData = {
        userId,
        agentId,
        clientContext: null,
        title: 'Nueva Conversación',
        messages: [],
        createdAt: serverTimestamp(),
    };
    try {
        const docRef = await addDoc(collection(db, 'conversations'), newConvoData);
        const docSnap = await getDoc(docRef);
        return conversationFromDoc(docSnap);
    } catch (error) {
        console.error("Error creating conversation in Firestore:", error);
        throw new Error(`Error al crear conversación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
}

export async function addMessage(conversationId: string, message: Message): Promise<void> {
    const convoRef = doc(db, 'conversations', conversationId);
    await updateDoc(convoRef, {
        messages: arrayUnion({
            ...message,
            createdAt: Timestamp.fromDate(message.createdAt)
        })
    });
}

export async function updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const convoRef = doc(db, 'conversations', conversationId);
    await updateDoc(convoRef, { title });
}

export async function deleteConversation(conversationId: string): Promise<void> {
    const convoRef = doc(db, 'conversations', conversationId);
    await deleteDoc(convoRef);
}

// Chat function using Firebase Functions
export async function sendChatMessage(
    conversationId: string,
    agentId: AgentId,
    messageContent: string,
    clientContext: string | undefined,
    isTestMode: boolean,
    currentMessages: Message[]
): Promise<Message> {
    const userMessage: Message = {
        id: `msg-user-${Date.now()}`,
        role: 'user',
        content: messageContent,
        createdAt: new Date(),
    };

    if (!isTestMode) {
        await addMessage(conversationId, userMessage);
    }

    const modelMessage: Message = {
        role: 'model',
        content: 'Error processing response.',
        createdAt: new Date(),
        id: `msg-model-${Date.now()}`,
    };

    try {
        if (!isTestMode) {
            // Use Firebase Functions for real AI responses
            const { chatWithAgent } = await import('./firebase-functions');
            const result = await chatWithAgent(conversationId, agentId, messageContent, clientContext);
            modelMessage.content = result.response;
        } else {
            // Test mode responses
            if (agentId === 'minutaMaker') {
                if (!clientContext) {
                    throw new Error("Se requiere un cliente para el agente Minuta Maker.");
                }
                modelMessage.content = `Actas de reunión generadas para el cliente: ${clientContext}. Contenido: ${messageContent}`;
            } else if (agentId === 'posiAgent') {
                modelMessage.content = `Hola! Soy Posi, tu asistente de IA. Has dicho: "${messageContent}". ¿En qué más puedo ayudarte?`;
            } else {
                modelMessage.content = 'Error: Agente no encontrado.';
            }
        }
    } catch (error) {
        console.error("Error processing agent logic:", error);
        modelMessage.content = `Lo siento, ha ocurrido un error al procesar tu solicitud. ${error instanceof Error ? error.message : ''}`;
    }

    if (!isTestMode) {
        await addMessage(conversationId, modelMessage);
    }
    
    return modelMessage;
}
