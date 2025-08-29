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
} from '@/components/ui/sidebar';
import { Logo } from './icons';
import type { Agent, AgentId, Conversation } from '@/lib/types';
import type { User } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { BotMessageSquare, History, LogOut, MessageSquare, Plus } from 'lucide-react';
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

interface SidebarContentComponentProps {
  user: User;
  agents: Agent[];
  conversations: Conversation[];
  activeAgentId: AgentId;
  activeConversationId: string | null;
  onSelectAgent: (agentId: AgentId) => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onLogout: () => void;
  isLoading: boolean;
}

export default function SidebarContentComponent({
  user,
  agents,
  conversations,
  activeAgentId,
  activeConversationId,
  onSelectAgent,
  onSelectConversation,
  onNewConversation,
  onLogout,
  isLoading,
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

  const groupedConversations = groupConversationsByDate(
    conversations.filter(c => c.agentId === activeAgentId)
  );

  // This check prevents crash on render if user is momentarily null
  if (!user) {
    return null;
  }

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <Logo />
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-sidebar-foreground font-headline">Positive AI</span>
            <span className="text-xs text-sidebar-foreground/70">Agent Hub</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <BotMessageSquare className="size-4" />
              Agentes
            </SidebarGroupLabel>
            <SidebarMenu>
              {agents.map(agent => (
                <SidebarMenuItem key={agent.id}>
                  <SidebarMenuButton
                    onClick={() => onSelectAgent(agent.id)}
                    isActive={activeAgentId === agent.id}
                  >
                    <span>{agent.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <div className="flex items-center justify-between mb-2 px-2">
              <SidebarGroupLabel className="flex items-center gap-2 p-0 h-auto">
                <History className="size-4" />
                Historial
              </SidebarGroupLabel>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onNewConversation}
                disabled={isLoading}
              >
                <Plus className="size-4" />
                <span className="sr-only">Nueva conversación</span>
              </Button>
            </div>
            {isLoading ? (
              <div className="flex flex-col gap-2 px-2">
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
              </div>
            ) : (
            <SidebarMenu>
              {Object.entries(groupedConversations).map(([date, convos]) => (
                <div key={date} className="mt-2">
                  <p className="px-2 text-xs text-sidebar-foreground/60 mb-1">{date}</p>
                  {convos.map(convo => (
                    <SidebarMenuItem key={convo.id}>
                      <SidebarMenuButton
                        onClick={() => onSelectConversation(convo.id)}
                        isActive={activeConversationId === convo.id}
                      >
                         <MessageSquare />
                        <span>{convo.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </div>
              ))}
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
