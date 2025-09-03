export type Role = 'user' | 'model';

export type Message = {
  id?: string; // Optional ID for optimistic UI
  role: Role;
  content: string;
  createdAt: Date;
};

// Dynamic agent ID - can be any string, validated at runtime
export type AgentId = string;

export type Agent = {
  id: AgentId;
  name: string;
  description: string;
  needsClientContext: boolean;
  // Extended properties from new system
  enabled?: boolean;
  avatar?: string;
  category?: string;
  tools?: string[];
  systemPrompt?: string;
  contextType?: 'general' | 'client_specific' | 'department_specific';
  createdAt?: Date;
  updatedAt?: Date;
  version?: string;
};

export type Conversation = {
  id: string;
  userId: string;
  agentId: AgentId;
  clientContext?: string;
  messages: Message[];
  title: string | null;
  createdAt: Date;
};

// New types for agent management
export type AgentConfig = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  contextType: string;
  enabled: boolean;
  avatar: string;
  category: string;
  version?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
};

export type MCPTool = {
  id: string;
  name: string;
  description: string;
  server: string;
  serverName?: string;
  category: string;
  icon: string;
};

export type AgentCategory = 
  | 'general' 
  | 'productivity' 
  | 'development' 
  | 'communication' 
  | 'management' 
  | 'custom' 
  | 'migrated';

export type ContextType = 
  | 'general' 
  | 'client_specific' 
  | 'department_specific';

// API Response types
export type GetAgentsResponse = {
  agents: Record<string, AgentConfig>;
  count: number;
  is_admin: boolean;
};

export type GetMCPToolsResponse = {
  tools: Record<string, MCPTool>;
  categories: Record<string, string[]>;
  total_tools: number;
  servers: string[];
};

export type CreateAgentRequest = {
  agentId: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  contextType: ContextType;
  avatar?: string;
  category?: AgentCategory;
};

export type UpdateAgentRequest = {
  agentId: string;
  name?: string;
  description?: string;
  systemPrompt?: string;
  tools?: string[];
  contextType?: ContextType;
  enabled?: boolean;
  avatar?: string;
  category?: AgentCategory;
};

// Validation helper types
export type AgentValidationError = {
  field: string;
  message: string;
};

export type AgentValidationResult = {
  valid: boolean;
  errors: AgentValidationError[];
};
