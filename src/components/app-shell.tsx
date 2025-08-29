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
const FORCE_TEST_MODE = true;

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
    
    startSendMessageTransition(async () => {
      try {
        const newConversation = await createConversationAction(user.uid, agentIdToCreate, clientContext);
        // The dates from the server action are plain strings, so we need to convert them back to Date objects
        const newConvoWithDates: Conversation = {
          ...newConversation,
          createdAt: new Date(newConversation.createdAt),
          messages: newConversation.messages.map(m => ({ ...m, createdAt: new Date(m.createdAt) })),
        };
        setConversations(prev => [newConvoWithDates, ...prev]);
        setActiveConversationId(newConvoWithDates.id);
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
        // The dates from the server action are plain strings, so we need to convert them back to Date objects
        const historyWithDates = history.map(c => ({
            ...c,
            createdAt: new Date(c.createdAt),
            messages: c.messages.map(m => ({...m, createdAt: new Date(m.createdAt)}))
        }));
        setConversations(historyWithDates);
  
        if (historyWithDates.length > 0) {
          setActiveConversationId(historyWithDates[0].id);
        } else {
          // No history for this user/agent, create a new conversation.
          handleCreateNewConversation(activeAgentId, CLIENTS[0].id);
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
      setActiveAgentId(agentId);
      // The useEffect will trigger to load/create convos for the new agent.
    }
  };

  const handleSendMessage = (message: string) => {
    if (!activeConversationId || !user) return;

    const optimisticUserMessage: Message = { id: `optimistic-${Date.now()}`, role: 'user', content: message, createdAt: new Date() };
    
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
          activeConversation?.clientContext
        );

        // The date from the server action is a plain string, convert it
        const responseMessageWithDate: Message = {
            ...responseMessage,
            createdAt: new Date(responseMessage.createdAt),
        }
        
        setConversations(prev =>
          prev.map(c => {
            if (c.id === activeConversationId) {
               // Replace optimistic message with the final one from the server (if it had an ID)
               // and add the model's response.
               const newMessages = c.messages.filter(m => m.id !== optimisticUserMessage.id);
               newMessages.push(optimisticUserMessage); // Or the real user message if returned
               newMessages.push(responseMessageWithDate);
               
               // Auto-update title on first real model response
               if (c.messages.length < 2 && user) { 
                 getHistoryAction(user.uid, activeAgentId).then(updatedHistory => {
                    const freshConvo = updatedHistory.find(uh => uh.id === c.id);
                    if (freshConvo) {
                         const freshConvoWithDates: Conversation = {
                            ...freshConvo,
                            createdAt: new Date(freshConvo.createdAt),
                            messages: freshConvo.messages.map(m => ({ ...m, createdAt: new Date(m.createdAt) })),
                         };
                        setConversations(currentConvos => currentConvos.map(cc => cc.id === c.id ? freshConvoWithDates : cc));
                    }
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
          description: `No se pudo enviar el mensaje. ${error instanceof Error ? error.message : ''}`,
        });
        // Rollback optimistic message
        setConversations(prev =>
            prev.map(c =>
                c.id === activeConversationId ? {...c, messages: c.messages.filter(m => m.id !== optimisticUserMessage.id)} : c
            )
        );
      }
    });
  };
  
  if (authLoading || (isUiLoading && !user)) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage login={login} />
  }

  const isLoading = isUiLoading || isSendingMessage;

  return (
    <SidebarProvider>
      <Sidebar>
          <SidebarContentComponent
            user={user}
            agents={agents}
            conversations={conversations.filter(c => c.agentId === activeAgentId)}
            activeAgentId={activeAgentId}
            activeConversationId={activeConversationId}
            onSelectAgent={handleSelectAgent}
            onSelectConversation={setActiveConversationId}
            onNewConversation={() => handleCreateNewConversation(activeAgentId, activeConversation?.clientContext || CLIENTS[0].id)}
            onLogout={logout}
            isLoading={isUiLoading}
          />
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen p-2">
        <ChatInterface
          key={activeConversationId} // Re-mount when conversation changes
          agent={activeAgent}
          conversation={activeConversation}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onNewConversation={() => handleCreateNewConversation(activeAgentId, activeConversation?.clientContext || CLIENTS[0].id)}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
