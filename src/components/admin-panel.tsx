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
import { 
  getAgentConfigs, 
  updateAgentConfig, 
  getAllAgents, 
  createAgent, 
  deleteAgent, 
  getAvailableMCPTools,
  getMCPStatus 
} from '@/services/firebase-functions';
import { 
  Bot, Settings, FileText, Upload, Save, Edit3, X, Plus, Trash2, 
  Loader2, AlertTriangle, CheckCircle, XCircle, Zap, Eye, Sparkles,
  Monitor, Activity, Shield, Database, Globe, Terminal, Play
} from 'lucide-react';

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  enabled?: boolean;
  avatar?: string;
  category?: string;
  contextType?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface MCPTool {
  id: string;
  name: string;
  description: string;
  server: string;
  category: string;
  icon: string;
}

interface MCPServerStatus {
  status: 'available' | 'error' | 'not_configured';
  tools: string[];
  message?: string;
}

interface MCPStatus {
  status: string;
  total_tools: number;
  servers: Record<string, MCPServerStatus>;
  credentials: Record<string, string>;
  last_check: string;
}

export default function AdminPanel() {
  // Agent management states
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingTools, setEditingTools] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Create agent states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentId, setNewAgentId] = useState('');
  const [newAgentDescription, setNewAgentDescription] = useState('');
  const [newAgentPrompt, setNewAgentPrompt] = useState('');
  const [newAgentTools, setNewAgentTools] = useState<string[]>([]);
  const [newAgentAvatar, setNewAgentAvatar] = useState('🤖');
  const [newAgentCategory, setNewAgentCategory] = useState('custom');
  const [isCreating, setIsCreating] = useState(false);
  
  // MCP tools and status states
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [mcpStatus, setMcpStatus] = useState<MCPStatus | null>(null);
  const [mcpLoading, setMcpLoading] = useState(false);
  
  // Test mode states
  const [testAgent, setTestAgent] = useState<AgentConfig | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  
  // Delete confirmation states
  const [deleteAgent, setDeleteAgent] = useState<AgentConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      loadAgentConfigs(),
      loadMCPTools(),
      loadMCPStatus()
    ]);
  };

  const loadAgentConfigs = async () => {
    try {
      setLoading(true);
      const response = await getAllAgents();
      if (response.agents) {
        const agentList = Object.entries(response.agents).map(([id, config]: [string, any]) => ({
          id,
          name: config.name || id,
          description: config.description || '',
          systemPrompt: config.system_prompt || '',
          tools: Array.isArray(config.tools) ? config.tools : [],
          enabled: config.enabled !== false,
          avatar: config.avatar || '🤖',
          category: config.category || 'general',
          contextType: config.context_type || 'general',
          createdAt: config.created_at,
          updatedAt: config.updated_at
        }));
        setAgents(agentList);
      }
    } catch (error) {
      console.error('Error loading agent configs:', error);
      toast.error('Error al cargar configuraciones de agentes');
    } finally {
      setLoading(false);
    }
  };

  const loadMCPTools = async () => {
    try {
      const response = await getAvailableMCPTools();
      if (response.tools) {
        // Handle both array and object responses
        let toolsArray: MCPTool[] = [];
        
        if (Array.isArray(response.tools)) {
          toolsArray = response.tools;
        } else if (typeof response.tools === 'object') {
          // Convert object to array if needed
          toolsArray = Object.entries(response.tools).map(([id, tool]: [string, any]) => ({
            id,
            name: tool.name || id,
            description: tool.description || '',
            server: tool.server || 'unknown',
            category: tool.category || 'general',
            icon: tool.icon || '🔧'
          }));
        }
        
        setMcpTools(toolsArray);
      } else {
        setMcpTools([]);
      }
    } catch (error) {
      console.error('Error loading MCP tools:', error);
      toast.error('Error al cargar herramientas MCP');
      setMcpTools([]);
    }
  };

  const loadMCPStatus = async () => {
    try {
      setMcpLoading(true);
      const response = await getMCPStatus();
      setMcpStatus(response);
    } catch (error) {
      console.error('Error loading MCP status:', error);
      // Don't show error toast for status as it might be expected if not configured
    } finally {
      setMcpLoading(false);
    }
  };

  const handleEditAgent = (agent: AgentConfig) => {
    setEditingAgent(agent);
    setEditingPrompt(agent.systemPrompt);
    setEditingTools(Array.isArray(agent.tools) ? [...agent.tools] : []);
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

  const handleToolToggle = (toolId: string, isNewAgent = false) => {
    if (isNewAgent) {
      setNewAgentTools(prev => 
        prev.includes(toolId) 
          ? prev.filter(id => id !== toolId)
          : [...prev, toolId]
      );
    } else {
      setEditingTools(prev => 
        prev.includes(toolId) 
          ? prev.filter(id => id !== toolId)
          : [...prev, toolId]
      );
    }
  };

  const handleCreateAgent = async () => {
    if (!newAgentId || !newAgentName || !newAgentDescription || !newAgentPrompt) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setIsCreating(true);
    try {
      await createAgent({
        agentId: newAgentId,
        name: newAgentName,
        description: newAgentDescription,
        systemPrompt: newAgentPrompt,
        tools: newAgentTools,
        avatar: newAgentAvatar,
        category: newAgentCategory,
        contextType: 'general'
      });
      
      toast.success(`Agente "${newAgentName}" creado correctamente`);
      setIsCreateModalOpen(false);
      resetCreateForm();
      loadAgentConfigs();
    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast.error(error.message || 'Error al crear el agente');
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewAgentName('');
    setNewAgentId('');
    setNewAgentDescription('');
    setNewAgentPrompt('');
    setNewAgentTools([]);
    setNewAgentAvatar('🤖');
    setNewAgentCategory('custom');
  };

  const handleDeleteAgent = async (agentToDelete: AgentConfig) => {
    if (!agentToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteAgent(agentToDelete.id);
      toast.success(`Agente "${agentToDelete.name}" eliminado correctamente`);
      setDeleteAgent(null);
      loadAgentConfigs();
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      toast.error(error.message || 'Error al eliminar el agente');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTestAgent = async () => {
    if (!testAgent || !testMessage.trim()) {
      toast.error('Selecciona un agente y escribe un mensaje de prueba');
      return;
    }

    setIsTesting(true);
    try {
      // Here you would call your chat endpoint with the test agent
      // For now, we'll simulate a response
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestResponse(`Respuesta simulada del agente ${testAgent.name}: "${testMessage}"`);
      toast.success('Prueba realizada correctamente');
    } catch (error) {
      console.error('Error testing agent:', error);
      toast.error('Error al probar el agente');
    } finally {
      setIsTesting(false);
    }
  };

  const generateAgentId = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 20);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getToolIcon = (toolId: string) => {
    const tool = mcpTools.find(t => t.id === toolId);
    return tool ? tool.icon : '🔧';
  };

  const getToolName = (toolId: string) => {
    const tool = mcpTools.find(t => t.id === toolId);
    return tool ? tool.name : toolId;
  };

  const getToolsByCategory = () => {
    const categories: Record<string, MCPTool[]> = {};
    
    // Ensure mcpTools is an array before using forEach
    if (Array.isArray(mcpTools)) {
      mcpTools.forEach(tool => {
        if (!categories[tool.category]) {
          categories[tool.category] = [];
        }
        categories[tool.category].push(tool);
      });
    }
    
    return categories;
  };

  const getMCPServerStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'not_configured': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getCredentialStatusIcon = (status: string) => {
    switch (status) {
      case 'configured': return <Shield className="h-4 w-4 text-green-500" />;
      case 'not_configured': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'invalid': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <XCircle className="h-4 w-4 text-gray-400" />;
    }
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
        <div className="flex gap-2">
          <Button onClick={loadInitialData} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Crear Agente
          </Button>
        </div>
      </div>

      <Tabs defaultValue="agentes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="agentes" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="herramientas" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Herramientas
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Status MCP
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Test Mode
          </TabsTrigger>
          <TabsTrigger value="configuracion" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agentes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{agent.avatar}</span>
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">
                          {agent.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditAgent(agent)}
                        title="Editar agente"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteAgent(agent)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Eliminar agente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="mt-2">{agent.description}</CardDescription>
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
                      {Array.isArray(agent.tools) && agent.tools.length > 0 ? (
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Herramientas MCP</h2>
              <p className="text-muted-foreground">
                {mcpTools.length} herramientas disponibles en el sistema
              </p>
            </div>
            <Button onClick={loadMCPTools} variant="outline" disabled={mcpLoading}>
              {mcpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
              Actualizar
            </Button>
          </div>

          {Object.entries(getToolsByCategory()).map(([category, tools]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                  <Badge variant="secondary">{tools.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Herramientas de {category.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tools.map((tool) => (
                    <div key={tool.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <span className="text-2xl">{tool.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{tool.name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{tool.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{tool.server}</Badge>
                          <Badge variant="outline" className="text-xs">{tool.id}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Estado del Sistema MCP</h2>
              <p className="text-muted-foreground">
                Monitoreo en tiempo real de servidores y credenciales
              </p>
            </div>
            <Button onClick={loadMCPStatus} variant="outline" disabled={mcpLoading}>
              {mcpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
              Actualizar Estado
            </Button>
          </div>

          {mcpStatus ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Server Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Servidores MCP
                  </CardTitle>
                  <CardDescription>
                    Estado de conexión de los servidores
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mcpStatus.servers && Object.entries(mcpStatus.servers).map(([serverName, serverData]) => (
                    <div key={serverName} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getMCPServerStatusIcon(serverData.status)}
                        <div>
                          <h4 className="font-medium">{serverName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {serverData.tools.length} herramientas
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        serverData.status === 'available' ? 'default' : 
                        serverData.status === 'error' ? 'destructive' : 'secondary'
                      }>
                        {serverData.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Credentials Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Credenciales API
                  </CardTitle>
                  <CardDescription>
                    Estado de configuración de las API keys
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mcpStatus.credentials && Object.entries(mcpStatus.credentials).map(([service, status]) => (
                    <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getCredentialStatusIcon(status)}
                        <div>
                          <h4 className="font-medium">{service.replace('_', ' ').toUpperCase()}</h4>
                          <p className="text-sm text-muted-foreground">
                            API Key {status === 'configured' ? 'configurada' : 'no configurada'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={status === 'configured' ? 'default' : 'secondary'}>
                        {status === 'configured' ? 'Configurada' : 'Pendiente'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    Resumen del Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{mcpStatus.total_tools}</div>
                      <div className="text-sm text-muted-foreground">Herramientas Totales</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {mcpStatus.servers ? Object.values(mcpStatus.servers).filter(s => s.status === 'available').length : 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Servidores Activos</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {mcpStatus.credentials ? Object.values(mcpStatus.credentials).filter(c => c === 'configured').length : 0}
                      </div>
                      <div className="text-sm text-muted-foreground">APIs Configuradas</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{agents.length}</div>
                      <div className="text-sm text-muted-foreground">Agentes Activos</div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Última verificación:</strong> {new Date(mcpStatus.last_check).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <p className="text-lg font-medium">Estado MCP no disponible</p>
                  <p className="text-sm text-muted-foreground">
                    No se pudo cargar el estado del sistema MCP
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Modo de Prueba
              </CardTitle>
              <CardDescription>
                Prueba tus agentes antes de desplegarlos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Seleccionar Agente para Probar</Label>
                    <select 
                      className="w-full mt-1 p-2 border rounded-md"
                      value={testAgent?.id || ''}
                      onChange={(e) => setTestAgent(agents.find(a => a.id === e.target.value) || null)}
                    >
                      <option value="">Selecciona un agente...</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.avatar} {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Mensaje de Prueba</Label>
                    <Textarea
                      placeholder="Escribe un mensaje para probar el agente..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button 
                    onClick={handleTestAgent} 
                    disabled={!testAgent || !testMessage.trim() || isTesting}
                    className="w-full"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Probando...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Probar Agente
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-4">
                  {testAgent && (
                    <div className="p-4 border rounded-lg bg-blue-50">
                      <h4 className="font-medium mb-2">Agente Seleccionado:</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{testAgent.avatar}</span>
                        <div>
                          <p className="font-medium">{testAgent.name}</p>
                          <p className="text-sm text-muted-foreground">{testAgent.description}</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <strong>Herramientas:</strong> {Array.isArray(testAgent.tools) && testAgent.tools.length > 0 ? testAgent.tools.join(', ') : 'Ninguna'}
                      </div>
                    </div>
                  )}

                  {testResponse && (
                    <div className="p-4 border rounded-lg bg-green-50">
                      <h4 className="font-medium mb-2">Respuesta del Agente:</h4>
                      <p className="text-sm">{testResponse}</p>
                    </div>
                  )}
                </div>
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
              <Label>Herramientas MCP Disponibles ({mcpTools.length})</Label>
              <div className="max-h-64 overflow-y-auto">
                {Object.entries(getToolsByCategory()).map(([category, tools]) => (
                  <div key={category} className="mb-4">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                      {category} ({tools.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {tools.map((tool) => (
                        <div key={tool.id} className="flex items-center space-x-3 p-2 border rounded-lg">
                          <Switch
                            checked={editingTools.includes(tool.id)}
                            onCheckedChange={() => handleToolToggle(tool.id)}
                          />
                          <span className="text-lg">{tool.icon}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{tool.name}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-1">{tool.description}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">{tool.server}</Badge>
                        </div>
                      ))}
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

      {/* Create Agent Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Crear Nuevo Agente
            </DialogTitle>
            <DialogDescription>
              Define un nuevo agente con sus capacidades y herramientas
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agent-name">Nombre del Agente *</Label>
                <Input
                  id="agent-name"
                  placeholder="Ej: Asistente de Marketing"
                  value={newAgentName}
                  onChange={(e) => {
                    setNewAgentName(e.target.value);
                    setNewAgentId(generateAgentId(e.target.value));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-id">ID del Agente *</Label>
                <Input
                  id="agent-id"
                  placeholder="marketing_assistant"
                  value={newAgentId}
                  onChange={(e) => setNewAgentId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Solo letras, números y guiones bajos
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-description">Descripción *</Label>
              <Textarea
                id="agent-description"
                placeholder="Describe las funciones y capacidades del agente..."
                value={newAgentDescription}
                onChange={(e) => setNewAgentDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agent-avatar">Avatar</Label>
                <Input
                  id="agent-avatar"
                  placeholder="🤖"
                  value={newAgentAvatar}
                  onChange={(e) => setNewAgentAvatar(e.target.value)}
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-category">Categoría</Label>
                <select 
                  id="agent-category"
                  className="w-full p-2 border rounded-md"
                  value={newAgentCategory}
                  onChange={(e) => setNewAgentCategory(e.target.value)}
                >
                  <option value="custom">Personalizado</option>
                  <option value="general">General</option>
                  <option value="business">Negocios</option>
                  <option value="technical">Técnico</option>
                  <option value="creative">Creativo</option>
                </select>
              </div>
            </div>

            {/* System Prompt */}
            <div className="space-y-2">
              <Label htmlFor="new-system-prompt">Prompt del Sistema *</Label>
              <Textarea
                id="new-system-prompt"
                placeholder="Define el comportamiento, personalidad y rol del agente..."
                value={newAgentPrompt}
                onChange={(e) => setNewAgentPrompt(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {newAgentPrompt.length} caracteres
              </p>
            </div>

            {/* Tools Selection */}
            <div className="space-y-3">
              <Label>Herramientas MCP ({mcpTools.length} disponibles)</Label>
              <div className="max-h-64 overflow-y-auto">
                {Object.entries(getToolsByCategory()).map(([category, tools]) => (
                  <div key={category} className="mb-4">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                      {category} ({tools.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {tools.map((tool) => (
                        <div key={tool.id} className="flex items-center space-x-3 p-2 border rounded-lg">
                          <Switch
                            checked={newAgentTools.includes(tool.id)}
                            onCheckedChange={() => handleToolToggle(tool.id, true)}
                          />
                          <span className="text-lg">{tool.icon}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{tool.name}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-1">{tool.description}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">{tool.server}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                Herramientas seleccionadas: {newAgentTools.length}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateAgent} 
              disabled={isCreating || !newAgentName || !newAgentId || !newAgentDescription || !newAgentPrompt}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Crear Agente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteAgent} onOpenChange={() => setDeleteAgent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El agente será eliminado permanentemente.
            </DialogDescription>
          </DialogHeader>
          
          {deleteAgent && (
            <div className="p-4 border rounded-lg bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{deleteAgent.avatar}</span>
                <div>
                  <p className="font-medium">{deleteAgent.name}</p>
                  <p className="text-sm text-muted-foreground">{deleteAgent.description}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <strong>ID:</strong> {deleteAgent.id} | 
                <strong> Herramientas:</strong> {Array.isArray(deleteAgent.tools) ? deleteAgent.tools.length : 0}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAgent(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteAgent && handleDeleteAgent(deleteAgent)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Agente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
