'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CLIENTS } from '@/lib/data';

interface ClientSelectorProps {
  selectedClient: string | undefined;
  onClientChange: (clientId: string) => void;
}

export default function ClientSelector({ selectedClient, onClientChange }: ClientSelectorProps) {
  return (
    <Select value={selectedClient} onValueChange={onClientChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Seleccionar Cliente" />
      </SelectTrigger>
      <SelectContent>
        {CLIENTS.map(client => (
          <SelectItem key={client.id} value={client.id}>
            {client.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
