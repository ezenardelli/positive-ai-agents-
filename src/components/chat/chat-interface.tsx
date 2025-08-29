'use client';

import type { Agent, Conversation } from '@/lib/types';
import ClientSelector from './client-selector';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import { useState } from 'react';
import { CLIENTS } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';

interface ChatInterfaceProps {
  agent: Agent;
  conversation: Conversation | undefined;
  onSendMessage: (message: string, clientContext?: string) => void;
  isLoading: boolean;
  onNewConversation: (clientContext?: string) => Promise<Conversation | void>;
}

export default function ChatInterface({
  agent,
  conversation,
  onSendMessage,
  isLoading,
  onNewConversation,
}: ChatInterfaceProps) {
  const [selectedClient, setSelectedClient] = useState<string | undefined>(
    conversation?.clientContext || (agent.needsClientContext ? CLIENTS[0].id : undefined)
  );
  const { user } = useAuth();

  const handleSendMessage = async (message: string) => {
    if (!conversation) {
      const newConversation = await onNewConversation(selectedClient);
      if (newConversation) {
        // Wait a tick for the state to hopefully update in the parent before sending the message
        setTimeout(() => onSendMessage(message, selectedClient), 0);
      }
    } else {
      onSendMessage(message, selectedClient);
    }
  };

  const getPlaceholderText = () => {
    switch (agent.id) {
      case 'minutaMaker':
        return 'Pega aquí la transcripción o adjunta un archivo .docx para empezar...';
      case 'posiAgent':
        return '¿En qué puedo ayudarte hoy?';
      default:
        return 'Escribe tu mensaje...';
    }
  };

  const isChatActive = conversation && conversation.messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {isChatActive && (
        <header className="flex items-center justify-between p-4 border-b bg-card">
          <div>
            <h1 className="text-xl font-bold text-foreground font-headline">{agent.name}</h1>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </div>
          {agent.needsClientContext && (
            <ClientSelector 
              selectedClient={selectedClient} 
              onClientChange={setSelectedClient} 
            />
          )}
        </header>
      )}

      <div className="flex-1 overflow-y-auto">
        {isChatActive ? (
          <div className="max-w-3xl mx-auto p-4">
            <ChatMessages messages={conversation.messages} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="flex flex-col items-center justify-center flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Hola, {user?.displayName?.split(' ')[0] || 'Eze'}.
              </h1>
              <p className="text-lg text-muted-foreground">¿Todo listo para empezar?</p>
            </div>
            <div className="w-full pb-8">
              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                placeholder={getPlaceholderText()}
                isExpanded={isChatActive}
              />
            </div>
          </div>
        )}
      </div>

      {isChatActive && (
        <footer className="p-4 bg-background/80 backdrop-blur-sm sticky bottom-0">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder={getPlaceholderText()}
            isExpanded={isChatActive}
          />
        </footer>
      )}
    </div>
  );
}
