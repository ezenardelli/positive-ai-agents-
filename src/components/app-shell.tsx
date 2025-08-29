'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import SidebarContentComponent from '@/components/sidebar-content';
import { useEffect, useState, useTransition } from 'react';
import type { Agent, AgentId, Conversation, Message } from '@/lib/types';
import { AGENTS, CLIENTS } from '@/lib/data';
import {
  createConversationAction,
  getHistoryAction,
  sendMessageAction,
} from '@/app/actions';
import ChatInterface from './chat/chat-interface';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const isTestMode = true; // Forzamos el modo de prueba


export default function AppShell() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  
  const [agents] = useState<Agent[]>(AGENTS);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<AgentId>('minutaMaker');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const { toast } = useToast();

  const handleCreateNewConversation = (agentIdToCreate: AgentId) => {
    startTransition(async () => {
      setIsLoading(true);
      try {
        const activeAgent = agents.find(a => a.id === agentIdToCreate);
        let clientContext: string | undefined;

        if (activeAgent?.needsClientContext) {
           const existingContext = conversations.find(c => c.agentId === agentIdToCreate)?.clientContext;
           clientContext = existingContext || CLIENTS[0].id;
        }

        if (isTestMode) {
          const newConversation: Conversation = {
            id: `mock-convo-${Date.now()}`,
            userId: 'mock-user',
            agentId: agentIdToCreate,
            clientContext: clientContext,
            title: 'Nueva Conversación de Prueba',
            messages: [],
            createdAt: new Date(),
          };
          setConversations(prev => [newConversation, ...prev]);
          setActiveConversationId(newConversation.id);
          setIsLoading(false);
          return;
        }
        
        if (!user) throw new Error("User not authenticated");
        const newConversation = await createConversationAction(user.uid, agentIdToCreate, clientContext);
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
      } catch (error) {
        console.error('Failed to create new conversation:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo crear una nueva conversación.',
        });
      } finally {
        setIsLoading(false);
      }
    });
  };


   useEffect(() => {
    if (isTestMode) {
      if (!conversations.find(c => c.agentId === activeAgentId)) {
        handleCreateNewConversation(activeAgentId);
      } else {
        setIsLoading(false);
      }
      return;
    }
    
    if (authLoading) return;
    
    if (!user) {
        router.replace('/login');
        return;
    }

    setIsLoading(true);
    getHistoryAction(user.uid).then(history => {
      setConversations(history);
      const agentConversations = history.filter(c => c.agentId === activeAgentId);
      if (agentConversations.length > 0) {
          setActiveConversationId(agentConversations[0].id);
      } else {
          handleCreateNewConversation(activeAgentId);
      }
    }).catch(err => {
      console.error("Failed to load history:", err);
      toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo cargar el historial de conversaciones.',
      });
    }).finally(() => {
      setIsLoading(false);
    });
  }, [user, activeAgentId, authLoading]);


  const activeAgent = agents.find(a => a.id === activeAgentId)!;
  let activeConversation = conversations.find(c => c.id === activeConversationId);
  if (isTestMode && !activeConversation && conversations.length > 0) {
    activeConversation = conversations.find(c => c.agentId === activeAgentId);
    if(activeConversation) setActiveConversationId(activeConversation.id);
  }


  const handleSelectAgent = (agentId: AgentId) => {
    if (agentId !== activeAgentId) {
      setActiveAgentId(agentId);
      setActiveConversationId(null); 
      setIsLoading(true);
      if (!conversations.find(c => c.agentId === agentId)) {
        handleCreateNewConversation(agentId);
      }
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleSendMessage = (message: string, clientContext?: string) => {
    if (!activeConversationId) return;

    const optimisticMessage: Message = { role: 'user', content: message, createdAt: new Date() };
    
    setConversations(prev =>
        prev.map(c =>
            c.id === activeConversationId
                ? { ...c, messages: [...c.messages, optimisticMessage] }
                : c
        )
    );

    startTransition(async () => {
      try {
        const responseMessage = await sendMessageAction(
          activeConversationId,
          activeAgentId,
          message,
          clientContext
        );

        setConversations(prev =>
          prev.map(c => {
            if (c.id === activeConversationId) {
              const newMessages = c.messages.filter(m => m !== optimisticMessage);
              newMessages.push(optimisticMessage, responseMessage);
              
              if (isTestMode) {
                return { ...c, messages: newMessages, title: 'Conversación de prueba' };
              }
              
              // This is for production, to get the new title if generated
              if (user) {
                getHistoryAction(user.uid).then(updatedHistory => {
                    setConversations(updatedHistory);
                    setActiveConversationId(activeConversationId);
                });
              }
              return { ...c, messages: newMessages };
            }
            return c;
          })
        );
      } catch (error) {
        console.error('Failed to send message:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo enviar el mensaje.',
        });
        setConversations(prev =>
            prev.map(c =>
                c.id === activeConversationId ? {...c, messages: c.messages.filter(m => m !== optimisticMessage)} : c
            )
        );
      }
    });
  };
  
  if ((authLoading || !user) && !isTestMode) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        {user && (
          <SidebarContentComponent
            user={user}
            agents={agents}
            conversations={conversations}
            activeAgentId={activeAgentId}
            activeConversationId={activeConversationId}
            onSelectAgent={handleSelectAgent}
            onSelectConversation={setActiveConversationId}
            onNewConversation={() => handleCreateNewConversation(activeAgentId)}
            onLogout={handleLogout}
            isLoading={isLoading}
          />
        )}
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen p-2">
        <ChatInterface
          key={activeConversationId}
          agent={activeAgent}
          conversation={activeConversation}
          onSendMessage={handleSendMessage}
          isLoading={isPending || isLoading}
          onNewConversation={() => handleCreateNewConversation(activeAgentId)}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
