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

// IMPORTANT: Set this to `true` to bypass Firebase Auth for local/preview testing.
// Set to `false` for production deployment with real authentication.
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
    
    startSendMessageTransition(async () => {
      try {
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
    if (!user || authLoading) {
      setIsUiLoading(authLoading);
      return;
    }
  
    setIsUiLoading(true);
    getHistoryAction(user.uid)
      .then(history => {
        const agentHistory = history.filter(c => c.agentId === activeAgentId);
        const otherHistory = history.filter(c => c.agentId !== activeAgentId);
        const sortedHistory = [...agentHistory, ...otherHistory];
        setConversations(sortedHistory);
  
        if (agentHistory.length > 0) {
          setActiveConversationId(agentHistory[0].id);
        } else {
          // No history for this agent, create a new conversation for them
          const newClientContext = agentHistory.length > 0 ? agentHistory[0].clientContext : (activeAgent.needsClientContext ? CLIENTS[0].id : undefined);
          handleCreateNewConversation(activeAgentId, newClientContext);
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
      setIsUiLoading(true);
      setActiveConversationId(null); // This will trigger the useEffect to load/create convos
      setActiveAgentId(agentId);
    }
  };

  const handleSendMessage = (message: string) => {
    if (!activeConversationId || !user) return;

    const optimisticUserMessage: Message = { role: 'user', content: message, createdAt: new Date() };
    
    // Optimistic UI update for user message
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
        
        // Final state update with model response
        setConversations(prev =>
          prev.map(c => {
            if (c.id === activeConversationId) {
               const updatedMessages = [...c.messages, responseMessage];
               
               // Auto-update title on first real model response
               if (c.messages.length < 2) { 
                 // Fetch the updated history to get the new title
                 getHistoryAction(user.uid).then(updatedHistory => {
                    const freshConvo = updatedHistory.find(uh => uh.id === c.id);
                    if (freshConvo) {
                        setConversations(currentConvos => currentConvos.map(cc => cc.id === c.id ? freshConvo : cc));
                    }
                 });
               }
               return { ...c, messages: updatedMessages };
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
  
  if (authLoading || (!user && !FORCE_TEST_MODE)) {
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
