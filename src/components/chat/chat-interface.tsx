'use client';

import type { Agent, Conversation } from '@/lib/types';
import ClientSelector from './client-selector';
import { Bot } from 'lucide-react';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import { useState } from 'react';
import { CLIENTS } from '@/lib/data';

interface ChatInterfaceProps {
  agent: Agent;
  conversation: Conversation | undefined;
  onSendMessage: (message: string, clientContext?: string) => void;
  isLoading: boolean;
}

export default function ChatInterface({
  agent,
  conversation,
  onSendMessage,
  isLoading,
}: ChatInterfaceProps) {
  const [selectedClient, setSelectedClient] = useState<string | undefined>(
    conversation?.clientContext || (agent.needsClientContext ? CLIENTS[0].id : undefined)
  );

  const handleSendMessage = (message: string) => {
    onSendMessage(message, selectedClient);
  };
  
  return (
    <div className="flex flex-col h-full bg-card rounded-lg border">
      <header className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-xl font-bold text-foreground font-headline">{agent.name}</h1>
          <p className="text-sm text-muted-foreground">{agent.description}</p>
        </div>
        {agent.needsClientContext && <ClientSelector selectedClient={selectedClient} onClientChange={setSelectedClient}/>}
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {conversation ? (
          <ChatMessages messages={conversation.messages} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="w-12 h-12 mb-4" />
            <h2 className="text-2xl font-semibold font-headline">
              {agent.name}
            </h2>
            <p className="max-w-md">
              Inicia una nueva conversación o selecciona una del historial para comenzar.
            </p>
          </div>
        )}
      </div>

      <footer className="p-4 border-t bg-background rounded-b-lg">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading || !conversation} />
        </div>
      </footer>
    </div>
  );
}
