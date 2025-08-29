'use client';

import type { Agent, Conversation } from '@/lib/types';
import ClientSelector from './client-selector';
import { Bot, PlusCircle } from 'lucide-react';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import { useState } from 'react';
import { CLIENTS } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

interface ChatInterfaceProps {
  agent: Agent;
  conversation: Conversation | undefined;
  onSendMessage: (message: string, clientContext?: string) => void;
  isLoading: boolean;
  onNewConversation: () => void;
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

  const handleSendMessage = (message: string) => {
    if (!conversation) {
      onNewConversation();
      // We need to wait for the new conversation to be created before sending the message
      // A better approach would be to handle this in a state machine or with a callback
      setTimeout(() => onSendMessage(message, selectedClient), 500);
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
      {/* Header with agent name, visible only when chat is active */}
      {isChatActive && (
        <header className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-xl font-bold text-foreground font-headline">{agent.name}</h1>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </div>
          {agent.needsClientContext && (
            <ClientSelector selectedClient={selectedClient} onClientChange={setSelectedClient} />
          )}
        </header>
      )}

      {/* Main chat area */}
      <div className="flex-1 overflow-y-auto">
        {isChatActive ? (
          <div className="max-w-3xl mx-auto p-4">
            <ChatMessages messages={conversation.messages} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-16">
            {/* The content that appears before the first message is sent */}
          </div>
        )}
      </div>

      {/* Footer with chat input */}
      <footer className="p-4 bg-background/80 backdrop-blur-sm sticky bottom-0">
         {!isChatActive && (
             <div className="flex flex-col items-center justify-center text-center pb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                    Hola, {user?.displayName?.split(' ')[0] || 'Eze'}.
                </h1>
                <p className="text-lg text-muted-foreground">¿Todo listo para empezar?</p>
             </div>
         )}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholder={getPlaceholderText()}
          isExpanded={isChatActive}
        />
      </footer>
    </div>
  );
}
