import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/hooks/use-auth';


interface ChatMessagesProps {
  messages: Message[];
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
  const { user: authUser } = useAuth();

  return (
    <div className="space-y-8">
      {messages.map((message, index) => (
        <div
          key={index}
          className={cn(
            'flex items-start gap-4',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          {message.role === 'model' && (
            <Avatar className="w-8 h-8 border">
              <AvatarFallback>
                <Bot className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
          )}

          <div
            className={cn(
              'max-w-2xl px-4 py-3 rounded-xl shadow-sm',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground border'
            )}
          >
            <ReactMarkdown
              className="prose prose-sm dark:prose-invert max-w-none"
              remarkPlugins={[remarkGfm]}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {message.role === 'user' && (
            <Avatar className="w-8 h-8 border">
              {authUser?.photoURL ? (
                <AvatarImage src={authUser.photoURL} alt="User" data-ai-hint="profile picture" />
              ) : (
                <AvatarImage src="https://picsum.photos/100/100" alt="User" data-ai-hint="profile picture"/>
              )}
              <AvatarFallback>
                <User className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      ))}
    </div>
  );
}
