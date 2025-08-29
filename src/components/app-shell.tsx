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

const isTestMode = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;


export default function AppShell() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  
  const [agents] = useState<Agent[]>(AGENTS);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<AgentId>('minutaMaker');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, startSendMessageTransition] = useTransition();

  const { toast } = useToast();

  const handleCreateNewConversation = (agentIdToCreate: AgentId, clientContext?: string) => {
    setIsLoading(true);
    startSendMessageTransition(async () => {
      try {
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
    if (authLoading) return;

    if (!isTestMode && !user) {
        router.replace('/login');
        return;
    }

    if (user) {
      setIsLoading(true);
      const agentConversations = conversations.filter(c => c.agentId === activeAgentId);

      if (agentConversations.length > 0) {
        if (activeConversationId !== agentConversations[0].id) {
            setActiveConversationId(agentConversations[0].id);
        }
        setIsLoading(false);
      } else {
        // No conversations for this agent, check if we need to load them or create a new one.
        if (isTestMode) {
            handleCreateNewConversation(activeAgentId, CLIENTS[0].id);
        } else {
            getHistoryAction(user.uid).then(history => {
                setConversations(history);
                const agentHistory = history.filter(c => c.agentId === activeAgentId);
                if (agentHistory.length > 0) {
                    setActiveConversationId(agentHistory[0].id);
                } else {
                    handleCreateNewConversation(activeAgentId, CLIENTS[0].id);
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
        }
      }
    }
  }, [user, activeAgentId, authLoading]);


  const activeAgent = agents.find(a => a.id === activeAgentId)!;
  const activeConversation = conversations.find(c => c.id === activeConversationId);


  const handleSelectAgent = (agentId: AgentId) => {
    if (agentId !== activeAgentId) {
      setActiveAgentId(agentId);
      setActiveConversationId(null); 
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleSendMessage = (message: string, clientContext?: string) => {
    if (!activeConversationId) return;

    const optimisticUserMessage: Message = { role: 'user', content: message, createdAt: new Date() };
    
    setConversations(prev =>
        prev.map(c =>
            c.id === activeConversationId
                ? { ...c, messages: [...c.messages, optimisticUserMessage] }
                : c
        )
    );

    startSendMessageTransition(async () => {
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
              const updatedMessages = [...c.messages, responseMessage];
               if (c.messages.length <= 1) { // First user message
                 getHistoryAction(user!.uid).then(updatedHistory => {
                    setConversations(updatedHistory);
                    setActiveConversationId(activeConversationId);
                 });
                 return c; // Let history reload handle it
               } else {
                  return { ...c, messages: updatedMessages };
               }
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
                c.id === activeConversationId ? {...c, messages: c.messages.filter(m => m !== optimisticUserMessage)} : c
            )
        );
      }
    });
  };
  
  if (authLoading && !isTestMode) {
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
            onNewConversation={() => handleCreateNewConversation(activeAgentId, activeConversation?.clientContext || CLIENTS[0].id)}
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
          isLoading={isLoading || isSendingMessage}
          onNewConversation={() => handleCreateNewConversation(activeAgentId, activeConversation?.clientContext || CLIENTS[0].id)}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
