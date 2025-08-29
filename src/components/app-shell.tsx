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
  const [isPending, startTransition] = useTransition();

  const { toast } = useToast();

  const handleCreateNewConversation = (agentIdToCreate: AgentId) => {
    startTransition(async () => {
      try {
        const activeAgent = agents.find(a => a.id === agentIdToCreate);
        let clientContext: string | undefined;

        if (activeAgent?.needsClientContext) {
           const existingContext = conversations.find(c => c.agentId === agentIdToCreate)?.clientContext;
           clientContext = existingContext || CLIENTS[0].id;
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
      const loadHistoryAndSetConversation = async () => {
        try {
          const history = await getHistoryAction(user.uid);
          setConversations(history);
          const agentConversations = history.filter(c => c.agentId === activeAgentId);
          if (agentConversations.length > 0) {
              setActiveConversationId(agentConversations[0].id);
          } else {
              handleCreateNewConversation(activeAgentId);
          }
        } catch (err) {
          console.error("Failed to load history:", err);
          toast({
              variant: 'destructive',
              title: 'Error',
              description: 'No se pudo cargar el historial de conversaciones.',
          });
        }
      }

      if (isTestMode) {
        // In test mode, create a conversation if none exists for the agent
        const agentConversations = conversations.filter(c => c.agentId === activeAgentId);
        if (agentConversations.length === 0) {
          handleCreateNewConversation(activeAgentId);
        } else {
          setActiveConversationId(agentConversations[0].id);
        }
      } else {
        loadHistoryAndSetConversation();
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
    
    // Optimistic UI update for user message
    setConversations(prev =>
        prev.map(c =>
            c.id === activeConversationId
                ? { ...c, messages: [...c.messages, optimisticUserMessage] }
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

        // Update UI with model's response
        setConversations(prev =>
          prev.map(c => {
            if (c.id === activeConversationId) {
              // In test mode, we just add the response
              if (isTestMode) {
                 return { ...c, messages: [...c.messages, responseMessage] };
              }
              // In production, we fetch history again to get the latest state including the new title if it was generated
              if(user) {
                getHistoryAction(user.uid).then(updatedHistory => {
                    setConversations(updatedHistory);
                    setActiveConversationId(activeConversationId);
                });
              }
              return c; // The getHistoryAction will update the state
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
        // Rollback optimistic update on error
        setConversations(prev =>
            prev.map(c =>
                c.id === activeConversationId ? {...c, messages: c.messages.filter(m => m !== optimisticUserMessage)} : c
            )
        );
      }
    });
  };
  
  if (authLoading) {
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
            isLoading={isPending || authLoading}
          />
        )}
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen p-2">
        <ChatInterface
          key={activeConversationId}
          agent={activeAgent}
          conversation={activeConversation}
          onSendMessage={handleSendMessage}
          isLoading={isPending || authLoading || !activeConversation}
          onNewConversation={() => handleCreateNewConversation(activeAgentId)}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
