import type { Agent } from './types';

export const AGENTS: Agent[] = [
  {
    id: 'posiAgent',
    name: 'Posi Agent',
    description: 'Agente de conocimiento general de Positive IT.',
    needsClientContext: false,
  },
  {
    id: 'minutaMaker',
    name: 'Minuta Maker',
    description: 'Genera minutas de reunión a partir de transcripciones.',
    needsClientContext: true,
  },
];

export const CLIENTS = [
    { id: 'cliente_A', name: 'Cliente A' },
    { id: 'cliente_B', name: 'Cliente B' },
    { id: 'cliente_C', name: 'Cliente C' },
]

// MOCK_CONVERSATIONS is no longer needed as we are using Firestore
