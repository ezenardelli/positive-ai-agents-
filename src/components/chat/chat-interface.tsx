'use client';

import type { Agent, Conversation } from '@/lib/types';
import ClientSelector from './client-selector';
import { Bot, PlusCircle } from 'lucide-react';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import { useState } from 'react';
import { CLIENTS } from '@/lib/data';
import { Button } from '@/components/ui/button';

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

  const handleSendMessage = (message: string) => {
    onSendMessage(message, selectedClient);
  };

  const getPlaceholderText = () => {
    switch (agent.id) {
      case 'minutaMaker':
        return 'Pega aquí la transcripción completa de la reunión...';
      case 'posiAgent':
        return '¿En qué puedo ayudarte hoy?';
      default:
        return 'Escribe tu mensaje...';
    }
  }
  
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
              Bienvenido a {agent.name}
            </h2>
            <p className="max-w-md mb-4">
              {agent.id === 'minutaMaker' 
                ? 'Para comenzar, crea una nueva conversación y pega la transcripción de tu reunión en el cuadro de texto.' 
                : 'Inicia una nueva conversación o selecciona una del historial para comenzar.'}
            </p>
            <Button onClick={onNewConversation} disabled={isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Conversación
            </Button>
          </div>
        )}
      </div>

      <footer className="p-4 border-t bg-background rounded-b-lg">
        <div className="max-w-3xl mx-auto">
          <ChatInput 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading || !conversation}
            placeholder={getPlaceholderText()}
          />
        </div>
      </footer>
    </div>
  );
}
