'use client';

import {
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarFooter,
  SidebarMenuSkeleton,
  SidebarMenuAction,
} from '@/components/ui/sidebar';
import { Logo } from './icons';
import type { Conversation } from '@/lib/types';
import type { User } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { History, LogOut, MessageSquare, Plus, Bot, Briefcase, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { AGENTS, CLIENTS } from '@/lib/data';


interface SidebarContentComponentProps {
  user: User;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onLogout: () => void;
  isLoading: boolean;
  onEditTitle: (id: string, currentTitle: string | null) => void;
  onDelete: (id: string) => void;
}

export default function SidebarContentComponent({
  user,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onLogout,
  isLoading,
  onEditTitle,
  onDelete,
}: SidebarContentComponentProps) {
  
  const groupConversationsByDate = (convos: Conversation[]) => {
    const groups: Record<string, Conversation[]> = {};
    convos.forEach(convo => {
      const date = convo.createdAt;
      let key: string;
      if (isToday(date)) {
        key = 'Hoy';
      } else if (isYesterday(date)) {
        key = 'Ayer';
      } else {
        key = format(date, 'PPP', { locale: es });
      }
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(convo);
    });
    return groups;
  };

  const groupedConversations = groupConversationsByDate(conversations);

  const getAgentById = (id: Conversation['agentId']) => AGENTS.find(a => a.id === id);
  const getClientById = (id: Conversation['clientContext']) => CLIENTS.find(c => c.id === id);

  return (
    <>
      <SidebarHeader className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-sidebar-foreground font-headline">Positive AI</span>
            <span className="text-xs text-sidebar-foreground/70">Agent Hub</span>
          </div>
        </div>
      </SidebarHeader>

      <div className="p-3">
        <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onNewConversation}
            disabled={isLoading}
            >
            <Plus className="size-4 mr-2" />
            Nueva conversación
        </Button>
      </div>

      <SidebarContent className="pt-0">
        <ScrollArea className="h-full px-3">
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <History className="size-4" />
              Historial
            </SidebarGroupLabel>
            {isLoading ? (
              <div className="flex flex-col gap-2">
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
              </div>
            ) : (
            <SidebarMenu>
              {Object.entries(groupedConversations).map(([date, convos]) => (
                <div key={date} className="mt-2">
                  <p className="px-2 text-xs text-sidebar-foreground/60 mb-1">{date}</p>
                  {convos.map(convo => {
                    const agent = getAgentById(convo.agentId);
                    const client = getClientById(convo.clientContext);
                    return (
                        <SidebarMenuItem key={convo.id}>
                            <SidebarMenuButton
                                onClick={() => onSelectConversation(convo.id)}
                                isActive={activeConversationId === convo.id}
                                className="h-auto py-2 flex-col items-start pr-12"
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <MessageSquare className="size-4" />
                                    <span className="truncate flex-1">{convo.title || "Nueva Conversación"}</span>
                                </div>
                                <div className="flex items-center gap-2 pl-6 text-xs text-sidebar-foreground/70 mt-1">
                                    {agent && <><Bot className="size-3" /><span>{agent.name}</span></>}
                                    {client && (
                                        <>
                                            <span className="mx-1">|</span>
                                            <Briefcase className="size-3" />
                                            <span>{client.name}</span>
                                        </>
                                    )}
                                </div>
                            </SidebarMenuButton>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                     <SidebarMenuAction showOnHover>
                                        <MoreHorizontal className="size-4" />
                                        <span className="sr-only">Acciones</span>
                                    </SidebarMenuAction>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-48">
                                    <DropdownMenuItem onClick={() => onEditTitle(convo.id, convo.title)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        <span>Editar nombre</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onDelete(convo.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Eliminar</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    );
                  })}
                </div>
              ))}
                 {conversations.length === 0 && !isLoading && (
                    <p className="px-2 text-sm text-center text-sidebar-foreground/60 mt-4">Crea tu primera conversación para empezar.</p>
                )}
            </SidebarMenu>
            )}
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 p-2 cursor-pointer hover:bg-sidebar-accent rounded-md transition-colors w-full">
              <Avatar className="h-9 w-9">
                {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} data-ai-hint="profile picture" />}
                <AvatarFallback>{user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left overflow-hidden">
                <span className="text-sm font-medium text-sidebar-foreground truncate">{user.displayName}</span>
                <span className="text-xs text-sidebar-foreground/70 truncate">{user.email}</span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mb-2 ml-2" side="top" align="start">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </>
  );
}
