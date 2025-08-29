'use client';

import type { AgentId, Conversation } from '@/lib/types';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import { AGENTS, CLIENTS } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bot, Briefcase } from 'lucide-react';
import React, { useState } from 'react';

interface ChatInterfaceProps {
  conversation: Conversation | undefined;
  onSendMessage: (message: string, forConversation: Conversation) => void;
  onNewConversation: () => Promise<Conversation | undefined>;
  onContextChange: (conversationId: string, agentId: AgentId, clientContext: string | null) => void;
  isLoading: boolean;
}

export default function ChatInterface({
  conversation,
  onSendMessage,
  onNewConversation,
  onContextChange,
  isLoading,
}: ChatInterfaceProps) {
  const { user } = useAuth();
  
  // This is a guard against rendering without a conversation
  if (!conversation) {
    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold">Bienvenido</h1>
                <p className="text-muted-foreground">Crea o selecciona una conversación para empezar.</p>
            </div>
        </div>
    );
  }

  const activeAgent = AGENTS.find(a => a.id === conversation.agentId);

  const handleAgentChange = (newAgentId: AgentId) => {
    const newAgent = AGENTS.find(a => a.id === newAgentId)!;
    // If the new agent doesn't need a client context, clear it.
    const newClientContext = newAgent.needsClientContext ? conversation.clientContext : null;
    onContextChange(conversation.id, newAgentId, newClientContext);
  };

  const handleClientChange = (newClientId: string) => {
    onContextChange(conversation.id, conversation.agentId, newClientId);
  };
  
  const getPlaceholderText = () => {
    switch (activeAgent?.id) {
      case 'minutaMaker':
        return 'Pega la transcripción, adjunta un DOCX o pide un resumen...';
      case 'posiAgent':
        return `¿En qué puedo ayudarte sobre Positive IT, ${user?.displayName?.split(' ')[0]}?`;
      default:
        return 'Escribe tu mensaje...';
    }
  };

  const handleInitialSendMessage = async (message: string) => {
     // This function is only for the very first message.
     // It creates a new conversation, then sends the message.
     const newConversation = await onNewConversation();
     if (newConversation) {
        onSendMessage(message, newConversation);
     }
  }

  const isChatActive = conversation.messages.length > 0;

  return (
    <div className="flex flex-col h-full bg-card">
        {/* Context Zone Header */}
        <header className="flex items-center gap-4 p-4 border-b">
             <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-muted-foreground" />
                <Select value={conversation.agentId} onValueChange={handleAgentChange}>
                    <SelectTrigger className="w-[200px] text-base font-semibold">
                        <SelectValue placeholder="Seleccionar Agente" />
                    </SelectTrigger>
                    <SelectContent>
                        {AGENTS.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {activeAgent?.needsClientContext && (
                <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <Select value={conversation.clientContext ?? ''} onValueChange={handleClientChange}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Seleccionar Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                            {CLIENTS.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                                {client.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </header>

        {isChatActive ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-4">
                <ChatMessages messages={conversation.messages} />
              </div>
            </div>
            
            <footer className="p-4 bg-background/80 backdrop-blur-sm sticky bottom-0">
              <ChatInput
                onSendMessage={(msg) => onSendMessage(msg, conversation)}
                isLoading={isLoading}
                placeholder={getPlaceholderText()}
                isExpanded={isChatActive}
              />
            </footer>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="flex flex-col items-center justify-center flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Hola, {user?.displayName?.split(' ')[0] || 'Eze'}.
              </h1>
              <p className="text-lg text-muted-foreground">Define el contexto arriba y empecemos a trabajar.</p>
            </div>
            <div className="w-full pb-8">
              <ChatInput
                onSendMessage={(msg) => onSendMessage(msg, conversation)}
                isLoading={isLoading}
                placeholder={getPlaceholderText()}
                isExpanded={isChatActive}
              />
            </div>
          </div>
        )}
    </div>
  );
}
