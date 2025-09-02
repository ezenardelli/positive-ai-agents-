'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { getAgentConfigs, updateAgentConfig } from '@/services/firebase-functions';
import { Bot, Settings, FileText, Upload, Save, Edit3, X, Plus, Trash2 } from 'lucide-react';

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  availableTools: string[];
  availableToolsAll: string[];
}

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const AVAILABLE_TOOLS: Tool[] = [
  { id: 'web_search', name: 'Búsqueda Web', description: 'Buscar información actualizada en internet', icon: '🌐' },
  { id: 'google_calendar', name: 'Google Calendar', description: 'Acceder y gestionar calendarios', icon: '📅' },
  { id: 'google_drive', name: 'Google Drive', description: 'Crear, leer y gestionar documentos', icon: '📁' },
  { id: 'jira', name: 'JIRA', description: 'Crear y gestionar tickets de proyecto', icon: '🎫' },
  { id: 'email', name: 'Email', description: 'Enviar correos electrónicos', icon: '📧' },
];

export default function AdminPanel() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingTools, setEditingTools] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    loadAgentConfigs();
  }, []);

  const loadAgentConfigs = async () => {
    try {
      setLoading(true);
      const response = await getAgentConfigs();
      if (response.agents) {
        setAgents(Object.entries(response.agents).map(([id, config]: [string, any]) => ({
          id,
          name: config.name || id,
          description: config.description || '',
          systemPrompt: config.system_prompt || '',
          tools: config.tools || [],
          availableTools: config.available_tools || [],
          availableToolsAll: response.available_tools_all || []
        })));
      }
    } catch (error) {
      console.error('Error loading agent configs:', error);
      toast.error('Error al cargar configuraciones de agentes');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAgent = (agent: AgentConfig) => {
    setEditingAgent(agent);
    setEditingPrompt(agent.systemPrompt);
    setEditingTools([...agent.tools]);
    setUploadedFiles([]);
    setIsEditModalOpen(true);
  };

  const handleSaveAgent = async () => {
    if (!editingAgent) return;

    console.log('=== DEBUGGING SAVE AGENT ===');
    console.log('Editing agent:', editingAgent);
    console.log('Editing prompt:', editingPrompt);
    console.log('Editing tools:', editingTools);
    console.log('Editing tools length:', editingTools.length);

    try {
      await updateAgentConfig(editingAgent.id, editingPrompt, editingTools);
      toast.success('Agente actualizado correctamente');
      setIsEditModalOpen(false);
      loadAgentConfigs(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating agent:', error);
      toast.error('Error al actualizar el agente');
    }
  };

  const handleToolToggle = (toolId: string) => {
    console.log('Toggling tool:', toolId);
    setEditingTools(prev => {
      const newTools = prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId];
      console.log('New tools array:', newTools);
      return newTools;
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getToolIcon = (toolId: string) => {
    const tool = AVAILABLE_TOOLS.find(t => t.id === toolId);
    return tool ? tool.icon : '🔧';
  };

  const getToolName = (toolId: string) => {
    const tool = AVAILABLE_TOOLS.find(t => t.id === toolId);
    return tool ? tool.name : toolId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Bot className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Cargando configuraciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground">Configura y personaliza tus agentes de IA</p>
        </div>
        <Button onClick={loadAgentConfigs} variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <Tabs defaultValue="agentes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agentes">Agentes</TabsTrigger>
          <TabsTrigger value="herramientas">Herramientas</TabsTrigger>
          <TabsTrigger value="configuracion">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="agentes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditAgent(agent)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription>{agent.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Prompt del Sistema:</Label>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                      {agent.systemPrompt || 'Sin prompt configurado'}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Herramientas Activas:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {agent.tools.length > 0 ? (
                        agent.tools.map((toolId) => (
                          <Badge key={toolId} variant="secondary" className="text-xs">
                            {getToolIcon(toolId)} {getToolName(toolId)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin herramientas</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="herramientas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Herramientas Disponibles</CardTitle>
              <CardDescription>
                Gestiona las herramientas que pueden usar tus agentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AVAILABLE_TOOLS.map((tool) => (
                  <div key={tool.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <span className="text-2xl">{tool.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium">{tool.name}</h4>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </div>
                    <Badge variant="outline">{tool.id}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuracion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>
                Ajustes globales del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Modo de Desarrollo</Label>
                  <p className="text-sm text-muted-foreground">
                    Habilita funciones de desarrollo y debugging
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Logs Detallados</Label>
                  <p className="text-sm text-muted-foreground">
                    Registra información detallada de las operaciones
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Agent Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Agente: {editingAgent?.name}</DialogTitle>
            <DialogDescription>
              Personaliza el prompt del sistema y las herramientas disponibles
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* System Prompt */}
            <div className="space-y-2">
              <Label htmlFor="system-prompt">Prompt del Sistema</Label>
              <Textarea
                id="system-prompt"
                placeholder="Define el comportamiento y personalidad del agente..."
                value={editingPrompt}
                onChange={(e) => setEditingPrompt(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {editingPrompt.length} caracteres
              </p>
            </div>

            {/* Tools Selection */}
            <div className="space-y-3">
              <Label>Herramientas Disponibles</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVAILABLE_TOOLS.map((tool) => (
                  <div key={tool.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Switch
                      checked={editingTools.includes(tool.id)}
                      onCheckedChange={() => handleToolToggle(tool.id)}
                    />
                    <span className="text-2xl">{tool.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium">{tool.name}</h4>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* File Upload for RAG */}
            <div className="space-y-3">
              <Label>Archivos de Contexto (RAG)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
                <Input
                  type="file"
                  multiple
                  accept=".txt,.md,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>Seleccionar Archivos</span>
                  </Button>
                </Label>
              </div>
              
              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Archivos Cargados:</Label>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {(file.size / 1024).toFixed(1)} KB
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAgent}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
