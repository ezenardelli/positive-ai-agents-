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
import { AGENTS } from '@/lib/data';
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

const isTestMode = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;


export default function AppShell() {
  const { user, loading: authLoading, logout } = useAuth();
  
  const [agents] = useState<Agent[]>(AGENTS);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<AgentId>('minutaMaker');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const { toast } = useToast();

  const handleCreateNewConversation = (agentIdToCreate: AgentId) => {
    if (!user) return;
    
    startTransition(async () => {
      setIsLoading(true);
      try {
        const activeAgent = agents.find(a => a.id === agentIdToCreate);
        let clientContext: string | undefined;

        if (activeAgent?.needsClientContext) {
           const existingContext = conversations.find(c => c.agentId === agentIdToCreate)?.clientContext;
           clientContext = existingContext || 'cliente_A'; 
        }
        
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
    if (user) {
      setIsLoading(true);
      getHistoryAction(user.uid).then(history => {
        setConversations(history);
        const agentConversations = history.filter(c => c.agentId === activeAgentId);
        if (agentConversations.length > 0) {
          setActiveConversationId(agentConversations[0].id);
        } else {
          // Do not create a new conversation automatically, wait for user action
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
  }, [user, activeAgentId]);


  const activeAgent = agents.find(a => a.id === activeAgentId)!;
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleSelectAgent = (agentId: AgentId) => {
    if (agentId !== activeAgentId) {
      setActiveAgentId(agentId);
      setActiveConversationId(null); 
      setIsLoading(true);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleSendMessage = (message: string, clientContext?: string) => {
    if (!activeConversationId || !user) return;

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
               // Replace the optimistic message with the final one from the server action if needed, or just add the new one.
               const newMessages = c.messages.filter(m => m !== optimisticMessage);
               newMessages.push(optimisticMessage, responseMessage);
               // Also update the title if it's a new conversation
                if (c.title === 'Nueva Conversación') {
                    const updatedTitle = message.substring(0, 20) + '...';
                    return { ...c, messages: newMessages, title: updatedTitle };
                }
               return { ...c, messages: newMessages };
            }
            return c;
          })
        );
        
        if (!isTestMode) {
          const updatedHistory = await getHistoryAction(user.uid);
          setConversations(updatedHistory);
          setActiveConversationId(activeConversationId);
        } else {
            setConversations(prev => prev.map(c => {
                if (c.id === activeConversationId && c.title === 'Nueva Conversación') {
                    return {...c, title: `Conversación de prueba`}
                }
                return c;
            }));
        }

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
        <SidebarContentComponent
          user={user as User}
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
