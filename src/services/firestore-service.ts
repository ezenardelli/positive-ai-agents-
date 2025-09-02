'use server';
/**
 * @fileoverview Service functions for interacting with Firestore.
 * IMPORTANT: This file should only be imported by server-side code (e.g., actions.ts).
 */

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
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GenerateMeetingMinutesOutput } from '@/ai/flows/generate-meeting-minutes';
import type { Conversation, Message, AgentId } from '@/lib/types';


/**
 * Fetches past participants for a given client from Firestore.
 */
export async function getPastParticipants(clientId: string): Promise<string[]> {
  const minutesRef = collection(db, 'minutes');
  const q = query(minutesRef, where('clientId', '==', clientId));
  const querySnapshot = await getDocs(q);
  const participants = new Set<string>();

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.actionItems) {
      data.actionItems.forEach((item: string) => {
        // Basic extraction, assuming format "NN: <email>"
        const match = item.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/);
        if (match) {
          participants.add(match[0]);
        }
      });
    }
  });

  return Array.from(participants);
}

/**
 * Saves a generated meeting minute to the Firestore database.
 * This will implicitly create the 'minutes' collection if it doesn't exist.
 */
export async function saveMinute(
  clientId: string,
  sourceDocumentUrl: string | undefined,
  minuteData: GenerateMeetingMinutesOutput & { transcript: string }
): Promise<void> {
  try {
    await addDoc(collection(db, 'minutes'), {
      clientId,
      sourceDocumentUrl: sourceDocumentUrl || null,
      ...minuteData,
      createdAt: Timestamp.now(),
    });
    console.log('Minute saved successfully.');
  } catch (error) {
    console.error('Error saving minute:', error);
    throw new Error('Failed to save minute to Firestore.');
  }
}

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
}


/**
 * Fetches all conversations for a given user.
 */
export async function getConversations(userId: string): Promise<Conversation[]> {
    try {
        const convosRef = collection(db, 'conversations');
        // Simple query that doesn't require a custom index.
        const q = query(convosRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(conversationFromDoc);
    } catch (error) {
        console.error("Error fetching conversations:", error);
        // This specific error message indicates a missing index.
        if (error instanceof Error && error.message.includes("requires an index")) {
            console.error("FIRESTORE INDEX REQUIRED: Please create the necessary composite index in your Firebase console.");
            throw new Error(`Error de base de datos: Se requiere un índice de Firestore que no existe. Por favor, créalo en la consola de Firebase.`);
        }
        // If the collection doesn't exist, getDocs() can throw. We'll return an empty array.
        if (error instanceof Error && (error.message.includes("does not exist") || error.message.includes("permission-denied") || error.message.includes("PERMISSION_DENIED") || error.message.includes("unavailable"))) {
            console.warn("Conversations collection may not exist yet or permissions are missing. This is normal on first run or if rules are not set. Returning empty array.");
            return [];
        }
        // Handle network errors or other issues
        if (error instanceof Error && (error.message.includes("network") || error.message.includes("timeout"))) {
            console.error("Network error when fetching conversations:", error);
            throw new Error("Error de conexión: No se pudo conectar con la base de datos. Verifica tu conexión a internet.");
        }
        throw error;
    }
}

/**
 * Fetches a single conversation by its ID.
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
    const convoRef = doc(db, 'conversations', conversationId);
    const docSnap = await getDoc(convoRef);
    if(docSnap.exists()) {
        return conversationFromDoc(docSnap);
    }
    return null;
}

/**
 * Creates a new conversation in Firestore.
 */
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
        if (error instanceof Error && error.message.includes("permission-denied")) {
            throw new Error("Error de permisos: No tienes permisos para crear conversaciones. Verifica las reglas de Firestore.");
        }
        if (error instanceof Error && error.message.includes("network")) {
            throw new Error("Error de conexión: No se pudo conectar con la base de datos.");
        }
        throw new Error(`Error al crear conversación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
}

/**
 * Adds a new message to a conversation.
 */
export async function addMessage(conversationId: string, message: Message): Promise<void> {
    const convoRef = doc(db, 'conversations', conversationId);
    await updateDoc(convoRef, {
        messages: arrayUnion({
            ...message,
            createdAt: Timestamp.fromDate(message.createdAt)
        })
    });
}

/**
 * Updates the title of a conversation.
 */
export async function updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const convoRef = doc(db, 'conversations', conversationId);
    await updateDoc(convoRef, { title });
}


/**
 * Updates a conversation's context.
 */
export async function updateConversation(conversationId: string, data: Partial<Conversation>): Promise<void> {
    const convoRef = doc(db, 'conversations', conversationId);
    const batch = writeBatch(db);
    
    batch.update(convoRef, {
        agentId: data.agentId,
        clientContext: data.clientContext,
    });

    if (data.messages !== undefined) {
        batch.update(convoRef, {
            messages: []
        });
    }

    await batch.commit();
}

/**
 * Deletes a conversation from Firestore.
 */
export async function deleteConversation(conversationId: string): Promise<void> {
    const convoRef = doc(db, 'conversations', conversationId);
    await deleteDoc(convoRef);
}
