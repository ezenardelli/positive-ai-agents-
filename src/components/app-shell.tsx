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
import LoginPage from './login-page';

// =================================================================================
// MODO DE PRUEBA: Cambia este valor para alternar entre modos.
// `true`: Omite el login de Firebase y usa un usuario simulado. (Para previsualizador/local)
// `false`: Usa el login real de Google con Firebase. (Para producción)
// =================================================================================
const FORCE_TEST_MODE = false;

export default function AppShell() {
  const { user, loading: authLoading, logout, login } = useAuth(FORCE_TEST_MODE);
  
  const [agents] = useState<Agent[]>(AGENTS);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<AgentId>('minutaMaker');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isUiLoading, setIsUiLoading] = useState(true);
  const [isSendingMessage, startSendMessageTransition] = useTransition();

  const { toast } = useToast();

  const handleCreateNewConversation = (agentIdToCreate: AgentId, clientContext?: string) => {
    if (!user) return;
    
    setIsUiLoading(true);
    startSendMessageTransition(async () => {
        try {
            console.log(`[AppShell] Creating new conversation for user ${user.uid} with agent ${agentIdToCreate}`);
            const newConversation = await createConversationAction(user.uid, agentIdToCreate, clientContext);
            const newConversationWithDate: Conversation = {
                ...newConversation,
                createdAt: new Date(newConversation.createdAt),
                messages: newConversation.messages.map(m => ({...m, createdAt: new Date(m.createdAt)}))
            };
            setConversations(prev => [newConversationWithDate, ...prev]);
            setActiveConversationId(newConversationWithDate.id);
        } catch (error) {
            console.error('Failed to create new conversation:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: `No se pudo crear una nueva conversación. ${error instanceof Error ? error.message : ''}`,
            });
        } finally {
            setIsUiLoading(false);
        }
    });
  };

  useEffect(() => {
    if (authLoading) {
      setIsUiLoading(true);
      return;
    }
  
    if (!user) {
      setIsUiLoading(false);
      return;
    }
  
    setIsUiLoading(true);

    getHistoryAction(user.uid, activeAgentId)
      .then(history => {
        const historyWithDates = history.map(c => ({
            ...c,
            createdAt: new Date(c.createdAt),
            messages: c.messages.map(m => ({...m, createdAt: new Date(m.createdAt)}))
        }));
        setConversations(historyWithDates);
  
        if (historyWithDates.length > 0) {
          setActiveConversationId(historyWithDates[0].id);
        } else {
          // If no history, don't auto-create. Let the user click the button.
          setActiveConversationId(null);
        }
      })
      .catch(err => {
        console.error("Failed to load history:", err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo cargar el historial de conversaciones.',
        });
      })
      .finally(() => {
          setIsUiLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, activeAgentId]);


  const activeAgent = agents.find(a => a.id === activeAgentId)!;
  const activeConversation = conversations.find(c => c.id === activeConversationId);


  const handleSelectAgent = (agentId: AgentId) => {
    if (agentId !== activeAgentId) {
      setActiveConversationId(null);
      setConversations([]);
      setIsUiLoading(true); 
      setActiveAgentId(agentId);
      // The useEffect will trigger to load/create convos for the new agent.
    }
  };

  const handleSendMessage = (message: string) => {
    if (!activeConversationId || !user) return;

    const optimisticUserMessage: Message = { id: `optimistic-${Date.now()}`, role: 'user', content: message, createdAt: new Date() };
    
    // Optimistic UI update
    setConversations(prev =>
      prev.map(c =>
        c.id === activeConversationId
          ? { ...c, messages: [...c.messages, optimisticUserMessage] }
          : c
      )
    );

    startSendMessageTransition(async () => {
      try {
        await sendMessageAction(
          activeConversationId,
          activeAgentId,
          message,
          activeConversation?.clientContext,
        );

        // After the action is successful, refresh the history to get the true state from the server.
        // This ensures UI consistency and captures any server-side changes (like title updates).
        const updatedHistory = await getHistoryAction(user.uid, activeAgentId);
        const updatedHistoryWithDates = updatedHistory.map(c => ({
          ...c,
          createdAt: new Date(c.createdAt),
          messages: c.messages.map(m => ({...m, createdAt: new Date(m.createdAt)}))
        }));
        setConversations(updatedHistoryWithDates);

      } catch (error) {
        console.error('Failed to send message:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: `No se pudo enviar el mensaje. ${error instanceof Error ? error.message : ''}`,
        });
        // Rollback optimistic message on error
        setConversations(prev =>
            prev.map(c =>
                c.id === activeConversationId ? {...c, messages: c.messages.filter(m => m.id !== optimisticUserMessage.id)} : c
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

  if (!user) {
    return <LoginPage login={login} />
  }

  const isProcessing = isUiLoading || isSendingMessage;
  const activeClientContext = activeConversation?.clientContext || (activeAgent.needsClientContext ? CLIENTS[0].id : undefined);

  return (
    <SidebarProvider>
      <Sidebar>
          {user && (
            <SidebarContentComponent
              user={user}
              agents={agents}
              conversations={conversations.filter(c => c.agentId === activeAgentId)}
              activeAgentId={activeAgentId}
              activeConversationId={activeConversationId}
              onSelectAgent={handleSelectAgent}
              onSelectConversation={setActiveConversationId}
              onNewConversation={() => handleCreateNewConversation(activeAgentId, activeClientContext)}
              onLogout={logout}
              isLoading={isUiLoading}
            />
          )}
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen p-2">
        {isUiLoading && !activeConversation && conversations.length === 0 ? (
           <div className="flex items-center justify-center h-full bg-card rounded-lg border">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
           </div>
        ) : (
            <ChatInterface
              key={activeConversationId || 'new'} // Re-mount when conversation changes or is new
              agent={activeAgent}
              conversation={activeConversation}
              onSendMessage={handleSendMessage}
              isLoading={isProcessing}
              onNewConversation={() => handleCreateNewConversation(activeAgentId, activeClientContext)}
            />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
