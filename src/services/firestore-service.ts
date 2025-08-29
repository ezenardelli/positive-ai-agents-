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
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GenerateMeetingMinutesOutput } from '@/ai/flows/generate-meeting-minutes';
import type { Conversation, Message, AgentId } from '@/lib/types';


// In Firestore, there's no real "test mode". We assume if this code runs, 
// it's in a server environment with valid credentials.
// The "test mode" logic is handled in the actions.ts file.

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
  minuteData: GenerateMeetingMinutesOutput
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
    return {
        id: docSnapshot.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
        messages: data.messages.map((msg: any) => ({
            ...msg,
            createdAt: (msg.createdAt as Timestamp).toDate(),
        })),
    };
}

/**
 * Fetches all conversations for a given user.
 */
export async function getConversations(userId: string): Promise<Conversation[]> {
    try {
        const convosRef = collection(db, 'conversations');
        const q = query(convosRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(conversationFromDoc);
    } catch (error) {
        console.error("Error fetching conversations:", error);
        // If the collection doesn't exist, getDocs() throws. We'll return an empty array.
        if (error instanceof Error && (error.message.includes("does not exist") || error.message.includes("needs an index"))) {
            console.warn("Conversations collection or index may not exist yet. This is normal on first run.");
            return [];
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
 * This will implicitly create the 'conversations' collection if it doesn't exist.
 */
export async function createConversation(userId: string, agentId: AgentId, clientContext?: string): Promise<Conversation> {
    const newConvoData = {
        userId,
        agentId,
        // Ensure clientContext is null, not undefined, for Firestore.
        clientContext: clientContext || null,
        title: 'Nueva Conversación',
        messages: [],
        createdAt: Timestamp.now(),
    };
    try {
        const docRef = await addDoc(collection(db, 'conversations'), newConvoData);
        // Fetch the document we just created to return a consistent Conversation object
        const docSnap = await getDoc(docRef);
        return conversationFromDoc(docSnap);
    } catch (error) {
        console.error("Error creating conversation in Firestore:", error);
        throw new Error(`Failed to create conversation: ${error}`);
    }
}

/**
 * Adds a new message to a conversation.
 */
export async function addMessage(conversationId: string, message: Message): Promise<void> {
    const convoRef = doc(db, 'conversations', conversationId);
    // Firestore security rules will ensure the user can only write to their own conversations.
    await updateDoc(convoRef, {
        messages: arrayUnion({
            ...message,
            // Convert JS Date back to Firestore Timestamp for storage
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
