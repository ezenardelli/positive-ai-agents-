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
  createConversation,
  deleteConversation,
  getConversations,
  sendChatMessage,
  updateConversationTitle
} from '@/services/client-service';
import AdminPanel from './admin-panel';
import ChatInterface from './chat/chat-interface';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Settings } from 'lucide-react';
import LoginPage from './login-page';


// =================================================================================
// MODO DE PRUEBA: Cambia este valor para alternar entre modos.
// `true`: Omite el login y Firebase. Usa estado local y un usuario simulado. (Para previsualizador/local)
// `false`: Usa el login real y Firebase. (Para producción)
// =================================================================================
const FORCE_TEST_MODE = process.env.NEXT_PUBLIC_FORCE_TEST_MODE === 'true';

export default function AppShell() {
  const { user, loading: authLoading, logout, login } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isUiLoading, setIsUiLoading] = useState(true);
  const [isSendingMessage, startSendMessageTransition] = useTransition();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const { toast } = useToast();
  
  const isTestMode = FORCE_TEST_MODE || !user || (user && user.uid.startsWith('mock-'));

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
          agentId: 'posiAgent', 
          clientContext: undefined,
          messages: [],
          title: 'Nueva Conversación',
          createdAt: new Date(),
        };
      } else {
        console.log(`[AppShell] Creating new conversation for user ${user.uid}`);
        const createdConvo = await createConversation(user.uid, 'posiAgent');
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
    
    // Check if user is admin (for now, check email domain)
    const checkAdminStatus = async () => {
      try {
        if (user.email?.endsWith('@positiveit.com.ar')) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    
    checkAdminStatus();

    if (isTestMode) {
        console.log("[AppShell Test Mode] Starting in test mode. Auto-creating first conversation.");
        if (conversations.length === 0) {
            handleCreateNewConversation();
        }
        setIsUiLoading(false);
        return;
    }

    getConversations(user.uid)
      .then(history => {
        const historyWithDates = history.map(c => ({
          ...c,
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
          messages: (c.messages || []).map(m => ({...m, createdAt: m.createdAt ? new Date(m.createdAt) : new Date()}))
        })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        setConversations(historyWithDates);
  
        if (historyWithDates.length > 0) {
          setActiveConversationId(historyWithDates[0].id);
        } else {
          handleCreateNewConversation();
        }
      })
      .catch(err => {
        console.error("Failed to load history:", err);
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        
        // Si es un error de permisos o conexión, mostrar mensaje específico
        if (errorMessage.includes('permisos') || errorMessage.includes('conexión')) {
          toast({
            variant: 'destructive',
            title: 'Error de Conexión',
            description: errorMessage,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: `No se pudo cargar el historial de conversaciones. ${errorMessage}`,
          });
        }
        
        // If history fails, still try to create a new conversation
        if (conversations.length === 0) {
            handleCreateNewConversation();
        }
      })
      .finally(() => {
          setIsUiLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, isTestMode]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleSendMessage = (message: string, forConversation: Conversation) => {
    if (!user) return;

    const optimisticUserMessage: Message = { id: `optimistic-user-${Date.now()}`, role: 'user', content: message, createdAt: new Date() };
    const currentMessages = conversations.find(c => c.id === forConversation.id)?.messages ?? [];
    
    setConversations(prev => prev.map(c =>
        c.id === forConversation.id
            ? { ...c, messages: [...c.messages, optimisticUserMessage] }
            : c
    ));
    
    startSendMessageTransition(async () => {
      try {
        if (isTestMode) {
            // In test mode, we just simulate the AI response and update state locally.
            const modelResponse: Message = {
                id: `msg-model-${Date.now()}`, 
                role: 'model', 
                content: 'Esta es una respuesta simulada en modo de prueba.', 
                createdAt: new Date(),
            };
            setConversations(prev =>
                prev.map(c => {
                    if (c.id === forConversation.id) {
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
  
        // In production mode, call the client service and then re-fetch history to sync state.
        await sendChatMessage(
          forConversation.id, forConversation.agentId, message, forConversation.clientContext, isTestMode, currentMessages,
        );
        
        const updatedHistory = await getConversations(user.uid);
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
        // Rollback optimistic update on error
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
      // For now, just update local state since we're using client-side services
      console.log("Context updated locally");
    }
  };
  
  const handleEditTitle = async (conversationId: string, currentTitle: string | null) => {
    const newTitle = prompt("Ingresa el nuevo nombre para la conversación:", currentTitle ?? "");
    if (newTitle && newTitle.trim() !== (currentTitle ?? "")) {
        const finalTitle = newTitle.trim();
        const originalConversations = conversations;
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, title: finalTitle } : c));

        if (!isTestMode) {
            try {
                await updateConversationTitle(conversationId, finalTitle);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: `No se pudo actualizar el nombre. ${error}` });
                setConversations(originalConversations);
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
            try {
                await deleteConversation(conversationId);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: `No se pudo eliminar la conversación. ${error}` });
                setConversations(originalConversations);
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

  return (
    <SidebarProvider>
      <Sidebar>
          {(user || isTestMode) && (
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
              isAdmin={isAdmin}
              onToggleAdminPanel={() => setShowAdminPanel(!showAdminPanel)}
              showAdminPanel={showAdminPanel}
            />
          )}
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen p-0 bg-card shadow-none border-0">
        {showAdminPanel ? (
          <div className="flex-1 overflow-auto p-6">
            <AdminPanel />
          </div>
        ) : (
          <>
            {isUiLoading && !activeConversation ? (
               <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
               </div>
            ) : (
                <ChatInterface
                  key={activeConversationId}
                  conversation={activeConversation}
                  onSendMessage={handleSendMessage}
                  onNewConversation={handleCreateNewConversation}
                  onContextChange={handleContextChange}
                  isLoading={isSendingMessage}
                />
            )}
          </>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
