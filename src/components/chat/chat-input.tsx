'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Paperclip, Send, Mic } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { processFileAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
  isExpanded: boolean;
}

export default function ChatInput({
  onSendMessage,
  isLoading,
  placeholder = 'Escribe tu mensaje...',
  isExpanded,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      toast({
        variant: 'destructive',
        title: 'Error de archivo',
        description: 'Por favor, sube un archivo .docx válido.',
      });
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64File = reader.result as string;
        const result = await processFileAction(base64File);
        if (result.success && result.text) {
          setMessage(prev => (prev ? `${prev}\n\n${result.text}` : result.text!));
          // Auto-adjust textarea height after content is set
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            }
          }, 0);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error al procesar el archivo',
            description: result.error || 'No se pudo leer el contenido del archivo.',
          });
        }
      };
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        variant: 'destructive',
        title: 'Error de Carga',
        description: 'Ocurrió un error inesperado al cargar el archivo.',
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'w-full bg-background transition-all duration-300',
        isExpanded ? 'max-w-3xl mx-auto' : 'max-w-xl mx-auto'
      )}
    >
      <div className="relative flex flex-col w-full p-2 border rounded-full shadow-lg bg-card focus-within:ring-2 focus-within:ring-ring">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 w-full bg-transparent border-0 shadow-none resize-none min-h-[40px] max-h-64 pr-24 pl-12 focus-visible:ring-0"
          rows={1}
          disabled={isLoading || isUploading}
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".docx"
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 text-muted-foreground"
          onClick={() => fileInput.current?.click()}
          disabled={isLoading || isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
          <span className="sr-only">Adjuntar archivo</span>
        </Button>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground"
            disabled={isLoading || isUploading}
          >
            <Mic className="w-5 h-5" />
            <span className="sr-only">Usar micrófono</span>
          </Button>
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9"
            disabled={isLoading || isUploading || !message.trim()}
          >
            <Send className="w-5 h-5" />
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
