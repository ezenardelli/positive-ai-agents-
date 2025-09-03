import type { Agent, AgentConfig } from './types';
import { getAgentConfigs } from '@/services/firebase-functions';

// Legacy static agents for fallback
const FALLBACK_AGENTS: Agent[] = [
  {
    id: 'posiAgent',
    name: 'Posi Agent',
    description: 'Agente de conocimiento general de Positive IT.',
    needsClientContext: false,
    enabled: true,
    avatar: '🤖',
    category: 'general',
    contextType: 'general'
  },
  {
    id: 'minutaMaker',
    name: 'Minuta Maker',
    description: 'Genera minutas de reunión a partir de transcripciones.',
    needsClientContext: true,
    enabled: true,
    avatar: '📝',
    category: 'productivity',
    contextType: 'client_specific'
  },
  {
    id: 'jiraAssistant',
    name: 'JIRA Assistant',
    description: 'Gestor de tarjetas JIRA para proyectos.',
    needsClientContext: true,
    enabled: true,
    avatar: '🎫',
    category: 'management',
    contextType: 'client_specific'
  },
];

// Cache for agents
let agentsCache: Agent[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get agents dynamically from API with caching
 */
export async function getAgents(): Promise<Agent[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (agentsCache && (now - lastFetchTime) < CACHE_DURATION) {
    return agentsCache;
  }
  
  try {
    const response = await getAgentConfigs();
    
    if (response.agents) {
      const agents: Agent[] = Object.entries(response.agents).map(([id, config]: [string, any]) => ({
        id,
        name: config.name || id,
        description: config.description || '',
        needsClientContext: config.context_type === 'client_specific',
        enabled: config.enabled !== false,
        avatar: config.avatar || '🤖',
        category: config.category || 'general',
        contextType: config.context_type || 'general',
        tools: config.tools || [],
        systemPrompt: config.system_prompt || '',
        version: config.version
      }));
      
      // Filter only enabled agents
      const enabledAgents = agents.filter(agent => agent.enabled);
      
      // Update cache
      agentsCache = enabledAgents;
      lastFetchTime = now;
      
      console.log(`Loaded ${enabledAgents.length} agents from API`);
      return enabledAgents;
    }
  } catch (error) {
    console.error('Failed to load agents from API:', error);
  }
  
  // Fallback to static agents
  console.warn('Using fallback agents due to API error');
  return FALLBACK_AGENTS;
}

/**
 * Get single agent by ID
 */
export async function getAgent(agentId: string): Promise<Agent | undefined> {
  const agents = await getAgents();
  return agents.find(agent => agent.id === agentId);
}

/**
 * Validate if agent exists and is enabled
 */
export async function validateAgentId(agentId: string): Promise<boolean> {
  const agent = await getAgent(agentId);
  return agent !== undefined && agent.enabled !== false;
}

/**
 * Get agents by category
 */
export async function getAgentsByCategory(category?: string): Promise<Agent[]> {
  const agents = await getAgents();
  
  if (!category) {
    return agents;
  }
  
  return agents.filter(agent => agent.category === category);
}

/**
 * Clear agents cache (useful after updates)
 */
export function clearAgentsCache(): void {
  agentsCache = null;
  lastFetchTime = 0;
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getAgents() instead
 */
export const AGENTS = FALLBACK_AGENTS;

export const CLIENTS = [
    { id: 'cliente_A', name: 'Cliente A' },
    { id: 'cliente_B', name: 'Cliente B' },
    { id: 'cliente_C', name: 'Cliente C' },
];

// Helper function to convert AgentConfig to Agent
export function agentConfigToAgent(id: string, config: AgentConfig): Agent {
  return {
    id,
    name: config.name,
    description: config.description,
    needsClientContext: config.contextType === 'client_specific',
    enabled: config.enabled,
    avatar: config.avatar,
    category: config.category,
    contextType: config.contextType as any,
    tools: config.tools,
    systemPrompt: config.systemPrompt,
    version: config.version,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt
  };
}

// MOCK_CONVERSATIONS is no longer needed as we are using Firestore
