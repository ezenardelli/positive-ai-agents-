'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import SidebarContentComponent from '@/components/sidebar-content';
import { useEffect, useState, useTransition } from 'react';
import type { Agent, AgentId, Conversation, Message, User } from '@/lib/types';
import { AGENTS } from '@/lib/data';
import {
  createConversationAction,
  getHistoryAction,
  sendMessageAction,
} from '@/app/actions';
import ChatInterface from './chat/chat-interface';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

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
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);


  useEffect(() => {
    if(user) {
      getHistoryAction().then(history => {
        setConversations(history);
        setIsLoading(false);
      });
    }
  }, [user]);

  const activeAgent = agents.find(a => a.id === activeAgentId)!;
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleSelectAgent = (agentId: AgentId) => {
    setActiveAgentId(agentId);
    setActiveConversationId(null);
  };
  
  const handleLogout = () => {
    logout();
  };

  const handleCreateNewConversation = () => {
    startTransition(async () => {
      try {
        const newConversation = await createConversationAction(activeAgentId);
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
      } catch (error) {
        console.error('Failed to create new conversation:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo crear una nueva conversación.',
        });
      }
    });
  };

  const handleSendMessage = (message: string, clientContext?: string) => {
    if (!activeConversationId) return;

    // Optimistically update UI
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
          prev.map(c =>
            c.id === activeConversationId
              ? { ...c, messages: [...c.messages, responseMessage] }
              : c
          )
        );
      } catch (error) {
        console.error('Failed to send message:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo enviar el mensaje.',
        });
        // Revert optimistic update on error
        setConversations(prev =>
            prev.map(c =>
                c.id === activeConversationId ? {...c, messages: c.messages.slice(0, -1)} : c
            )
        );
      }
    });
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContentComponent
          user={user}
          agents={agents}
          conversations={conversations}
          activeAgentId={activeAgentId}
          activeConversationId={activeConversationId}
          onSelectAgent={handleSelectAgent}
          onSelectConversation={setActiveConversationId}
          onNewConversation={handleCreateNewConversation}
          onLogout={handleLogout}
          isLoading={isLoading || isPending}
        />
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen p-2">
        <ChatInterface
          key={activeConversationId}
          agent={activeAgent}
          conversation={activeConversation}
          onSendMessage={handleSendMessage}
          isLoading={isPending}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
