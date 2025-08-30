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
  
  // Determine if we are in test mode based on the flag OR if there's no real user.
  const isTestMode = FORCE_TEST_MODE || !user || (user && user.uid.startsWith('mock-'));

  // Unified function to create a new conversation
  const handleCreateNewConversation = async (): Promise<Conversation | undefined> => {
    if (!user) return;
    
    setIsUiLoading(true);
    try {
      let newConversation: Conversation;
      if (isTestMode) {
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
        // Convert server timestamps to Date objects
        newConversation = {
          ...createdConvo,
          createdAt: createdConvo.createdAt ? new Date(createdConvo.createdAt) : new Date(),
          messages: (createdConvo.messages || []).map(m => ({...m, createdAt: m.createdAt ? new Date(m.createdAt) : new Date() }))
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

    if (isTestMode) {
        console.log("[AppShell Test Mode] Starting in test mode. Auto-creating first conversation.");
        if (conversations.length === 0) {
            handleCreateNewConversation();
        }
        setIsUiLoading(false);
        return;
    }

    // This is the production logic
    getHistoryAction(user.uid)
      .then(history => {
        // Convert all Firestore Timestamps to JS Dates
        const historyWithDates = history.map(c => ({
          ...c,
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
          messages: (c.messages || []).map(m => ({...m, createdAt: m.createdAt ? new Date(m.createdAt) : new Date()}))
        })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort on client
        
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
          description: `No se pudo cargar el historial de conversaciones. ${err.message}`,
        });
      })
      .finally(() => {
          setIsUiLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, isTestMode]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleSendMessage = (message: string, forConversation: Conversation) => {
    if (!user) return;
  
    // Optimistic UI update
    const optimisticUserMessage: Message = { id: `optimistic-user-${Date.now()}`, role: 'user', content: message, createdAt: new Date() };
    setConversations(prev => prev.map(c =>
        c.id === forConversation.id
            ? { ...c, messages: [...c.messages, optimisticUserMessage] }
            : c
    ));
    
    startSendMessageTransition(async () => {
      try {
        if (isTestMode) {
          const modelResponse: Message = {
            id: `msg-model-${Date.now()}`,
            role: 'model',
            content: 'Esta es una respuesta simulada en modo de prueba.',
            createdAt: new Date(),
          };
          setConversations(prev =>
            prev.map(c => {
              if (c.id === forConversation.id) {
                // Replace optimistic message with a final one
                const finalUserMessage = { ...optimisticUserMessage, id: `user-${Date.now()}` };
                const finalMessages = [...c.messages.filter(m => m.id !== optimisticUserMessage.id), finalUserMessage, modelResponse];
                let newTitle = c.title;
                if (finalMessages.length <= 2 && (c.title === 'Nueva Conversación' || !c.title)) {
                  newTitle = message.substring(0, 30) + "...";
                }
                return { ...c, messages: finalMessages, title: newTitle };
              }
              return c;
            })
          );
          return;
        }
  
        // Production logic
        const currentMessages = conversations.find(c => c.id === forConversation.id)?.messages.filter(m => m.id !== optimisticUserMessage.id) ?? [];

        await sendMessageAction(
          forConversation.id,
          forConversation.agentId,
          message,
          forConversation.clientContext,
          false, // isTestMode is always false here
          currentMessages,
        );
        
        // Re-fetch history to ensure perfect sync with the database state
        // This is the most robust way to ensure consistency
        const updatedHistory = await getHistoryAction(user.uid);
        const historyWithDates = updatedHistory.map(c => ({
            ...c,
            createdAt: new Date(c.createdAt),
            messages: c.messages.map(m => ({...m, createdAt: new Date(m.createdAt)}))
        })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setConversations(historyWithDates);

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
            c.id === forConversation.id ? { ...c, messages: c.messages.filter(m => m.id !== optimisticUserMessage.id) } : c
          )
        );
      }
    });
  };

  const handleContextChange = (conversationId: string, newAgentId: AgentId, newClientContext: string | null) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId ? { ...c, agentId: newAgentId, clientContext: newClientContext || undefined, messages: [] } : c
      )
    );
    if (!isTestMode) {
      updateConversationContextAction(conversationId, newAgentId, newClientContext, false)
        .catch(err => {
          console.error("Failed to update context in DB:", err);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo guardar el cambio de contexto.',
          });
        });
    }
  };
  
  const handleEditTitle = async (conversationId: string, currentTitle: string | null) => {
    const newTitle = prompt("Ingresa el nuevo nombre para la conversación:", currentTitle ?? "");
    if (newTitle && newTitle.trim() !== (currentTitle ?? "")) {
        const finalTitle = newTitle.trim();
        const originalConversations = conversations;
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, title: finalTitle } : c));

        if (!isTestMode) {
            const { success, error } = await updateConversationTitleAction(conversationId, finalTitle);
            if (!success) {
                toast({ variant: 'destructive', title: 'Error', description: `No se pudo actualizar el nombre. ${error}` });
                setConversations(originalConversations); // Rollback
            }
        }
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.")) {
        const originalConversations = conversations;
        const newConversations = conversations.filter(c => c.id !== conversationId);
        setConversations(newConversations);

        let nextActiveId = activeConversationId;
        if (activeConversationId === conversationId) {
            const nextConversation = newConversations.length > 0 ? newConversations[0] : null;
            nextActiveId = nextConversation ? nextConversation.id : null;
            setActiveConversationId(nextActiveId);
            if (!nextConversation) {
               handleCreateNewConversation();
            }
        }

        if (!isTestMode) {
            const { success, error } = await deleteConversationAction(conversationId);
            if (!success) {
                toast({ variant: 'destructive', title: 'Error', description: `No se pudo eliminar la conversación. ${error}` });
                setConversations(originalConversations); // Rollback
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
