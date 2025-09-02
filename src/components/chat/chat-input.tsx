'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Paperclip, Send, Mic } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
// import { processFileAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = 'Escribe tu mensaje...',
  disabled = false,
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
    if (message.trim() && !isLoading && !disabled) {
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
        // const result = await processFileAction(base64File);
        const result = { success: false, error: 'File processing not available in static export' };
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
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[44px] max-h-[200px] resize-none pr-20"
          disabled={disabled || isLoading}
        />
        
        {/* File upload button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      
      <Button
        type="submit"
        size="sm"
        disabled={!message.trim() || isLoading || disabled || isUploading}
        className="h-11 px-4"
      >
        {isLoading || isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
}
