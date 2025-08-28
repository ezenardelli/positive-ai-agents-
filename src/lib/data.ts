import type { Agent, Conversation } from './types';

export const AGENTS: Agent[] = [
  {
    id: 'minutaMaker',
    name: 'Minuta Maker',
    description: 'Genera minutas de reunión a partir de transcripciones.',
    needsClientContext: true,
  },
  {
    id: 'posiAgent',
    name: 'Posi Agent',
    description: 'Agente de conocimiento general de Positive IT.',
    needsClientContext: false,
  },
];

export const CLIENTS = [
    { id: 'cliente_A', name: 'Cliente A' },
    { id: 'cliente_B', name: 'Cliente B' },
    { id: 'cliente_C', name: 'Cliente C' },
]

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_1',
    userId: 'user_123',
    agentId: 'minutaMaker',
    clientContext: 'cliente_A',
    title: 'Minuta Reunión Kick-off',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    messages: [
      {
        role: 'user',
        content: 'Transcripción de la reunión de kick-off del proyecto X...',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 - 2 * 60 * 1000),
      },
      {
        role: 'model',
        content: 'Aquí está la minuta generada para la reunión de kick-off...',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 - 1 * 60 * 1000),
      },
    ],
  },
  {
    id: 'conv_2',
    userId: 'user_123',
    agentId: 'posiAgent',
    title: 'Consulta sobre políticas de vacaciones',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    messages: [
      {
        role: 'user',
        content: '¿Cuál es la política de la empresa sobre los días de vacaciones?',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 2 * 60 * 1000),
      },
      {
        role: 'model',
        content: 'Nuestra política de vacaciones permite X días por año...',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 1 * 60 * 1000),
      },
    ],
  },
];
