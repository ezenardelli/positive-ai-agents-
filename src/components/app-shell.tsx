'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import SidebarContentComponent from '@/components/sidebar-content';
import { useEffect, useState, useTransition } from 'react';
import type { AgentId, Conversation, Message } from '@/lib/types';
import {
  createConversationAction,
  getHistoryAction,
  sendMessageAction,
  updateConversationContextAction
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
const FORCE_TEST_MODE = false;

export default function AppShell() {
  const { user, loading: authLoading, logout, login } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isUiLoading, setIsUiLoading] = useState(true);
  const [isSendingMessage, startSendMessageTransition] = useTransition();

  const { toast } = useToast();

  const handleCreateNewConversation = async (): Promise<void> => {
    if (!user) return;
    
    let newConversation: Conversation;
    
    try {
        if (FORCE_TEST_MODE) {
            console.log("[AppShell Test Mode] Creating new MOCK conversation (Client-side)");
            newConversation = {
                id: `mock_convo_${Date.now()}`,
                userId: user.uid,
                agentId: 'posiAgent',
                clientContext: undefined,
                messages: [],
                title: 'Nueva Conversión',
                createdAt: new Date(),
            };
        } else {
            console.log(`[AppShell] Creating new conversation for user ${user.uid}`);
            // New conversations always start with posiAgent by default
            const createdConvo = await createConversationAction(user.uid, 'posiAgent');
            newConversation = {
                ...createdConvo,
                createdAt: new Date(createdConvo.createdAt),
                messages: createdConvo.messages.map(m => ({...m, createdAt: new Date(m.createdAt)}))
            };
        }
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
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
        console.log("[AppShell Test Mode] Skipping history fetch, starting fresh.");
        setConversations([]);
        setActiveConversationId(null);
        handleCreateNewConversation();
        setIsUiLoading(false);
        return;
    }

    getHistoryAction(user.uid)
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
          // If no history, create the first conversation automatically
          handleCreateNewConversation();
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
  }, [user, authLoading]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);


  const handleSendMessage = (message: string) => {
    if (!activeConversationId || !user || !activeConversation) return;

    const optimisticUserMessage: Message = { id: `optimistic-user-${Date.now()}`, role: 'user', content: message, createdAt: new Date() };
    
    // Optimistic UI update for the user's message
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
          console.log("[AppShell Test Mode] Simulating sending message with agent:", activeConversation.agentId);
          let responseContent = '';
          if (activeConversation.agentId === 'minutaMaker') {
            const result = await generateMeetingMinutes({
              transcript: message,
              pastParticipants: [],
              isTestMode: true,
            });
            responseContent = result.fullGeneratedText;
          } else {
            responseContent = `Respuesta simulada para Posi Agent sobre: "${message}"`;
          }
          
          modelResponse = {
            id: `model-response-${Date.now()}`,
            role: 'model',
            content: responseContent,
            createdAt: new Date(),
          };
          
        } else {
          // Production mode logic
          modelResponse = await sendMessageAction(
            activeConversationId,
            activeConversation.agentId,
            message,
            activeConversation.clientContext
          );
        }
         // Final state update with model's response
         setConversations(prev =>
              prev.map(c => {
                  if (c.id === activeConversationId) {
                      const finalMessages = c.messages.filter(m => m.id !== optimisticUserMessage.id);
                      finalMessages.push({ ...optimisticUserMessage, id: `user-${Date.now()}` }, {...modelResponse, createdAt: new Date(modelResponse.createdAt)});
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

  const handleContextChange = (conversationId: string, newAgentId: AgentId, newClientContext: string | null) => {
    // Update the local state optimistically
    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId ? { ...c, agentId: newAgentId, clientContext: newClientContext || undefined } : c
      )
    );

    // If not in test mode, persist the change to the backend
    if (!FORCE_TEST_MODE) {
      updateConversationContextAction(conversationId, newAgentId, newClientContext)
        .catch(err => {
          console.error("Failed to update context in DB:", err);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo guardar el cambio de contexto.',
          });
          // NOTE: Could add rollback logic here if needed
        });
    }
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

  return (
    <SidebarProvider>
      <Sidebar>
          {user && (
            <SidebarContentComponent
              user={user}
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={setActiveConversationId}
              onNewConversation={handleCreateNewConversation}
              onLogout={logout}
              isLoading={isUiLoading}
            />
          )}
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen p-0 bg-background shadow-none border-0">
        {isUiLoading && !activeConversation ? (
           <div className="flex items-center justify-center h-full">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
           </div>
        ) : (
            <ChatInterface
              key={activeConversationId} // Re-mount when conversation changes
              conversation={activeConversation}
              onSendMessage={handleSendMessage}
              onContextChange={handleContextChange}
              isLoading={isProcessing}
            />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
