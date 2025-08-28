export type Role = 'user' | 'model';

export type Message = {
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
  title: string;
  createdAt: Date;
};

export type User = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
};
