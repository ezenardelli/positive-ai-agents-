'use client';

import { getAuth } from 'firebase/auth';
import type { Conversation, Message, AgentId } from '@/lib/types';

const FUNCTIONS_BASE_URL = 'https://us-central1-positive-hub-ai.cloudfunctions.net';

// Helper function to get auth token
async function getAuthToken(): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  console.log('Current user:', user?.email); // Debug log
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const token = await user.getIdToken();
  console.log('Token obtained, length:', token.length); // Debug log
  return token;
}

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(endpoint: string, data: any = null): Promise<any> {
  try {
    const token = await getAuthToken();
    const url = `${FUNCTIONS_BASE_URL}${endpoint}`;
    
    console.log('Making request to:', url); // Debug log
    console.log('Request method:', data ? 'POST' : 'GET'); // Debug log
    
    const options: RequestInit = {
      method: data ? 'POST' : 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
      console.log('Request data:', data); // Debug log
    }

    console.log('Request options:', options); // Debug log
    
    const response = await fetch(url, options);
    
    console.log('Response status:', response.status); // Debug log
    console.log('Response headers:', response.headers); // Debug log
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error response:', errorData); // Debug log
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('Response data:', responseData); // Debug log
    return responseData;
    
  } catch (error) {
    console.error('Error in makeAuthenticatedRequest:', error); // Debug log
    throw error;
  }
}

// Chat with agent
export async function chatWithAgent(
  conversationId: string,
  agentId: AgentId,
  message: string,
  clientContext?: string
): Promise<{ response: string; agentId: string; conversationId: string }> {
  return makeAuthenticatedRequest('/chat_with_agent', {
    conversationId,
    agentId,
    message,
    clientContext,
  });
}

// Get agent configurations
export async function getAgentConfigs(): Promise<{ agents: Record<string, any> }> {
  return makeAuthenticatedRequest('/get_agent_configs');
}

// Update agent configuration (admin only)
export async function updateAgentConfig(
  agentId: string,
  systemPrompt: string,
  tools?: string[]
): Promise<{ message: string }> {
  return makeAuthenticatedRequest('/update_agent_config', {
    agentId,
    systemPrompt,
    tools,
  });
}
