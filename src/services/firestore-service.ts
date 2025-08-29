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


const isTestMode = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

/**
 * Fetches past participants for a given client from Firestore.
 */
export async function getPastParticipants(clientId: string): Promise<string[]> {
   if (isTestMode) return ['participante1@test.com', 'participante2@test.com'];

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
 */
export async function saveMinute(
  clientId: string,
  sourceDocumentUrl: string | undefined,
  minuteData: GenerateMeetingMinutesOutput
): Promise<void> {
  if (isTestMode) {
      console.log('Test Mode: Skipping saveMinute to Firestore.');
      return;
  };

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
    if (isTestMode) return [];
    const convosRef = collection(db, 'conversations');
    const q = query(convosRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(conversationFromDoc);
}

/**
 * Fetches a single conversation by its ID.
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
    if (isTestMode) return null;
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
export async function createConversation(userId: string, agentId: AgentId, clientContext?: string): Promise<Conversation> {
    if (isTestMode) {
        return {
            id: `mock-convo-${Date.now()}`,
            userId,
            agentId,
            clientContext: clientContext || undefined,
            title: 'Nueva Conversación de Prueba',
            messages: [],
            createdAt: new Date(),
        };
    }
    const newConvoData = {
        userId,
        agentId,
        clientContext: clientContext || null,
        title: 'Nueva Conversación',
        messages: [],
        createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'conversations'), newConvoData);
    const docSnap = await getDoc(docRef);
    return conversationFromDoc(docSnap);
}

/**
 * Adds a new message to a conversation.
 */
export async function addMessage(conversationId: string, message: Message): Promise<void> {
    if (isTestMode) return;
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
    if (isTestMode) return;
    const convoRef = doc(db, 'conversations', conversationId);
    await updateDoc(convoRef, { title });
}
