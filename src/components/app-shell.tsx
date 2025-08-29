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
import { generateMeetingMinutes } from '@/ai/flows/generate-meeting-minutes';


// =================================================================================
// MODO DE PRUEBA: Cambia este valor para alternar entre modos.
// `true`: Omite el login y Firebase. Usa estado local y un usuario simulado. (Para previsualizador/local)
// `false`: Usa el login real y Firebase. (Para producción)
// =================================================================================
const FORCE_TEST_MODE = true;

export default function AppShell() {
  const { user, loading: authLoading, logout, login } = useAuth();
  
  const [agents] = useState<Agent[]>(AGENTS);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<AgentId>('minutaMaker');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isUiLoading, setIsUiLoading] = useState(true);
  const [isSendingMessage, startSendMessageTransition] = useTransition();

  const { toast } = useToast();

  const handleCreateNewConversation = async (clientContext?: string) => {
    if (!user) return;
    
    let newConversation: Conversation | undefined;
    
    try {
        if (FORCE_TEST_MODE) {
            console.log("[AppShell] Creating new MOCK conversation (Client-side)");
            newConversation = {
                id: `mock_convo_${Date.now()}`,
                userId: user.uid,
                agentId: activeAgentId,
                clientContext: clientContext,
                messages: [],
                title: 'Nueva Conversación (Test)',
                createdAt: new Date(),
            };
        } else {
            console.log(`[AppShell] Creating new conversation for user ${user.uid} with agent ${activeAgentId}`);
            const createdConvo = await createConversationAction(user.uid, activeAgentId, clientContext);
            newConversation = {
                ...createdConvo,
                createdAt: new Date(createdConvo.createdAt),
                messages: createdConvo.messages.map(m => ({...m, createdAt: new Date(m.createdAt)}))
            };
        }
        setConversations(prev => [newConversation!, ...prev]);
        setActiveConversationId(newConversation!.id);
        return newConversation;
      } catch (error) {
          console.error('Failed to create new conversation:', error);
          toast({
              variant: 'destructive',
              title: 'Error',
              description: `No se pudo crear una nueva conversación. ${error instanceof Error ? error.message : ''}`,
          });
      }
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

    if (FORCE_TEST_MODE) {
        console.log("[AppShell] Test mode is active. Skipping history fetch.");
        setConversations([]);
        setActiveConversationId(null);
        setIsUiLoading(false);
        return;
    }

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
  }, [user, authLoading, activeAgentId]);


  const activeAgent = agents.find(a => a.id === activeAgentId)!;
  const activeConversation = conversations.find(c => c.id === activeConversationId);


  const handleSelectAgent = (agentId: AgentId) => {
    if (agentId !== activeAgentId) {
      setActiveConversationId(null);
      setConversations([]);
      setIsUiLoading(true); 
      setActiveAgentId(agentId);
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
        let modelResponse: Message;

        if(FORCE_TEST_MODE) {
          console.log("[AppShell] Sending message in test mode (client-side flow)");
           const result = await generateMeetingMinutes({
            transcript: message,
            pastParticipants: [],
            isTestMode: true,
          });
          modelResponse = {
            id: `model-response-${Date.now()}`,
            role: 'model',
            content: result.fullGeneratedText,
            createdAt: new Date(),
          };
        } else {
          modelResponse = await sendMessageAction(
            activeConversationId,
            activeAgentId,
            message,
            activeConversation?.clientContext
          );
        }
        
        // After getting the real response, update the conversation state
        setConversations(prev =>
          prev.map(c => {
            if (c.id === activeConversationId) {
              // Replace optimistic message with the final one and add model response
              const finalMessages = c.messages.filter(m => m.id !== optimisticUserMessage.id);
              finalMessages.push(optimisticUserMessage, modelResponse);
              return { ...c, messages: finalMessages };
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
              onNewConversation={() => handleCreateNewConversation(activeClientContext)}
              onLogout={logout}
              isLoading={isUiLoading}
            />
          )}
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen p-0 bg-card rounded-lg border-0 shadow-none">
        {isUiLoading && !activeConversation && conversations.length === 0 && !FORCE_TEST_MODE ? (
           <div className="flex items-center justify-center h-full">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
           </div>
        ) : (
            <ChatInterface
              key={activeConversationId || 'new'}
              agent={activeAgent}
              conversation={activeConversation}
              onSendMessage={handleSendMessage}
              isLoading={isProcessing}
              onNewConversation={handleCreateNewConversation}
            />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
