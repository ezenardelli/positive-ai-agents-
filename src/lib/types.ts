export type Role = 'user' | 'model';

export type Message = {
  id?: string; // Optional ID for optimistic UI
  role: Role;
  content: string;
  createdAt: Date;
};

export type AgentId = 'minutaMaker' | 'posiAgent';

export type Agent = {
  id: AgentId;
  name: string;
  description: string;
  needsClientContext: boolean;
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
