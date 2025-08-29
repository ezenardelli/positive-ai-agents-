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
  deleteConversationAction,
  getHistoryAction,
  sendMessageAction,
  updateConversationContextAction,
  updateConversationTitleAction
} from '@/app/actions';
import ChatInterface from './chat/chat-interface';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import LoginPage from './login-page';


// =================================================================================
// MODO DE PRUEBA: Cambia este valor para alternar entre modos.
// `true`: Omite el login y Firebase. Usa estado local y un usuario simulado. (Para previsualizador/local)
// `false`: Usa el login real y Firebase. (Para producción)
// =================================================================================
const FORCE_TEST_MODE = true;

export default function AppShell() {
  const { user, loading: authLoading, logout, login } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isUiLoading, setIsUiLoading] = useState(true);
  const [isSendingMessage, startSendMessageTransition] = useTransition();

  const { toast } = useToast();

  const handleCreateNewConversation = async (): Promise<Conversation | undefined> => {
    if (!user) return;
    
    setIsUiLoading(true);
    try {
        let newConversation: Conversation;
        if (FORCE_TEST_MODE) {
            console.log("[AppShell Test Mode] Creating new MOCK conversation (Client-side)");
            newConversation = {
                id: `mock_convo_${Date.now()}`,
                userId: user.uid,
                agentId: 'posiAgent', // Default agent
                clientContext: undefined,
                messages: [],
                title: 'Nueva Conversación',
                createdAt: new Date(),
            };
        } else {
            console.log(`[AppShell] Creating new conversation for user ${user.uid}`);
            const createdConvo = await createConversationAction(user.uid, 'posiAgent');
            newConversation = {
                ...createdConvo,
                createdAt: new Date(createdConvo.createdAt),
                messages: createdConvo.messages.map(m => ({...m, createdAt: new Date(m.createdAt)}))
            };
        }
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
        return newConversation;
    } catch (error) {
        console.error('Failed to create new conversation:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: `No se pudo crear una nueva conversación. ${error instanceof Error ? error.message : ''}`,
        });
        return undefined;
    } finally {
        setIsUiLoading(false);
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
        console.log("[AppShell Test Mode] Starting in test mode. Auto-creating first conversation.");
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
          // No history, create a new conversation to start
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


  const handleSendMessage = (message: string, forConversation: Conversation) => {
    if (!user) return;

    const optimisticUserMessage: Message = { id: `optimistic-user-${Date.now()}`, role: 'user', content: message, createdAt: new Date() };
    
    // Optimistic UI update for the user's message
    setConversations(prev =>
        prev.map(c =>
            c.id === forConversation.id
                ? { ...c, messages: [...c.messages, optimisticUserMessage] }
                : c
        )
    );

    startSendMessageTransition(async () => {
      try {
        const modelResponse = await sendMessageAction(
          forConversation.id,
          forConversation.agentId,
          message,
          forConversation.clientContext,
          FORCE_TEST_MODE,
        );

         // Final state update with model's response
         setConversations(prev =>
              prev.map(c => {
                  if (c.id === forConversation.id) {
                      // Replace optimistic message with the real one and add model response
                      const finalMessages = c.messages.filter(m => m.id !== optimisticUserMessage.id);
                      finalMessages.push({ ...optimisticUserMessage, id: `user-${Date.now()}` }, {...modelResponse, createdAt: new Date(modelResponse.createdAt)});
                      
                      // Also, update the title if it's the first exchange
                      let newTitle = c.title;
                      if (finalMessages.length === 2 && !c.title) {
                        const potentialTitle = message.substring(0, 30) + "...";
                        newTitle = potentialTitle
                      }
                      return { ...c, messages: finalMessages, title: newTitle };
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
                c.id === forConversation.id ? {...c, messages: c.messages.filter(m => m.id !== optimisticUserMessage.id)} : c
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

    updateConversationContextAction(conversationId, newAgentId, newClientContext, FORCE_TEST_MODE)
      .catch(err => {
        console.error("Failed to update context in DB:", err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo guardar el cambio de contexto.',
        });
        // NOTE: Could add rollback logic here if needed
      });
  };
  
  const handleEditTitle = async (conversationId: string, currentTitle: string | null) => {
    const newTitle = prompt("Ingresa el nuevo nombre para la conversación:", currentTitle ?? "");
    if (newTitle && newTitle.trim() !== (currentTitle ?? "")) {
        // Optimistic UI update
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, title: newTitle } : c));

        if (!FORCE_TEST_MODE) {
            const { success, error } = await updateConversationTitleAction(conversationId, newTitle.trim());
            if (!success) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: `No se pudo actualizar el nombre. ${error}`,
                });
                // Rollback
                setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, title: currentTitle } : c));
            }
        }
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.")) {
        // Optimistic UI update
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        // If we are deleting the active conversation, select a new one
        if (activeConversationId === conversationId) {
             const remainingConversations = conversations.filter(c => c.id !== conversationId);
             setActiveConversationId(remainingConversations.length > 0 ? remainingConversations[0].id : null);
        }

        if (!FORCE_TEST_MODE) {
            const { success, error } = await deleteConversationAction(conversationId);
            if (!success) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: `No se pudo eliminar la conversación. ${error}`,
                });
                // Rollback would be complex here, would need to re-fetch or re-insert.
                // For simplicity, we can just reload the history.
                if(user) getHistoryAction(user.uid).then(setConversations);
            }
        }
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
              onEditTitle={handleEditTitle}
              onDelete={handleDeleteConversation}
            />
          )}
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen p-0 bg-card shadow-none border-0">
        {isUiLoading && !activeConversation ? (
           <div className="flex items-center justify-center h-full">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
           </div>
        ) : (
            <ChatInterface
              key={activeConversationId} // Re-mount when conversation changes
              conversation={activeConversation}
              onSendMessage={handleSendMessage}
              onNewConversation={handleCreateNewConversation}
              onContextChange={handleContextChange}
              isLoading={isProcessing}
            />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
