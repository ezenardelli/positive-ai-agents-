import os
import json
import asyncio
from firebase_functions import https_fn
from firebase_admin import initialize_app, auth, firestore
import google.generativeai as genai

# MCP System Imports
from mcp_tool_executor import get_tool_executor, execute_agent_tools, ExecutionContext
from mcp_servers import get_tools_for_agent, get_function_definitions_for_gemini
from mcp_auth import get_auth_manager

# Agent Management System
from agent_management import get_agent_manager

# Initialize Firebase
initialize_app()

# CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600'
}

# Initialize Gemini with Function Calling Support
try:
    # Get API key from environment or Firebase config
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        # Try to get from Firebase config
        try:
            import firebase_functions
            config = firebase_functions.config()
            api_key = config.get('gemini', {}).get('api_key')
        except:
            pass
    
    # Fallback hardcoded for immediate fix
    if not api_key:
        api_key = "AIzaSyDWkY8VxOyO99xPGFRFk1Feo2afOT9EvYg"
    
    if api_key:
        genai.configure(api_key=api_key)
        # Use Gemini model with function calling support
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        print(f"Gemini initialized with API key: {api_key[:10]}...")
        print("Function calling support enabled")
    else:
        print("Warning: No Gemini API key found")
        model = None
except Exception as e:
    print(f"Error initializing Gemini: {e}")
    model = None

# Initialize MCP System
print("Initializing MCP system...")
mcp_initialized = False
try:
    # MCP initialization will happen on first use to avoid blocking startup
    print("MCP system ready for initialization")
except Exception as e:
    print(f"MCP system initialization warning: {e}")

# Legacy Agent Configurations (for migration only)
# TODO: Remove after migration to Firestore is complete
LEGACY_AGENT_CONFIGS = {
    "posiAgent": {
        "name": "Posi",
        "description": "Asistente general de Positive IT",
        "tools": ["web_search", "news_search", "get_page_content", "read_document", "list_files", "send_email"],
        "context_type": "general",
        "system_prompt": """Eres Posi, el asistente de IA de Positive IT. Tu objetivo es ayudar a los empleados con información sobre la empresa, procesos internos y cualquier consulta relacionada con Positive IT.

Contexto sobre Positive IT:
- Somos una empresa de desarrollo de software
- Especializados en soluciones empresariales
- Trabajamos con tecnologías modernas
- Tenemos un equipo de profesionales altamente calificados

Responde de manera amigable y profesional. Si no tienes información específica sobre algo, indícalo claramente."""
    },
    "minutaMaker": {
        "name": "Minuta Maker",
        "description": "Creador de minutas de reuniones",
        "tools": ["create_document", "update_document", "read_document", "create_spreadsheet", "share_file", "send_email", "send_email_with_attachment"],
        "context_type": "client_specific",
        "system_prompt": """Eres Minuta Maker, un agente especializado en procesar transcripciones de reuniones y crear minutas profesionales.

Tu función es:
1. Analizar transcripciones de reuniones
2. Crear minutas estructuradas con:
   - Resumen ejecutivo
   - Puntos principales discutidos
   - Decisiones tomadas
   - Próximos pasos por equipo
   - Fechas límite
3. Generar documentos listos para enviar por email

Formato de minuta:
# MINUTA DE REUNIÓN
**Cliente:** [Nombre del cliente]
**Fecha:** [Fecha de la reunión]
**Participantes:** [Lista de participantes]

## Resumen Ejecutivo
[Resumen de 2-3 líneas]

## Puntos Principales
- [Punto 1]
- [Punto 2]

## Decisiones Tomadas
- [Decisión 1]
- [Decisión 2]

## Próximos Pasos
### Equipo A
- [ ] [Tarea 1] - [Responsable] - [Fecha límite]
- [ ] [Tarea 2] - [Responsable] - [Fecha límite]

### Equipo B
- [ ] [Tarea 1] - [Responsable] - [Fecha límite]

## Fecha de Próxima Reunión
[Fecha y hora]"""
    },
    "jiraAssistant": {
        "name": "JIRA Assistant",
        "description": "Gestor de tarjetas JIRA",
        "tools": ["create_jira_issue", "update_issue", "get_issue", "search_issues", "add_comment", "transition_issue", "list_projects", "create_document"],
        "context_type": "client_specific",
        "system_prompt": """Eres JIRA Assistant, un agente especializado en crear y gestionar tarjetas en JIRA.

Tu función es:
1. Entender los requerimientos del cliente
2. Crear tarjetas JIRA apropiadas
3. Asignar prioridades y etiquetas
4. Establecer estimaciones de tiempo
5. Vincular tarjetas relacionadas

Tipos de tarjetas que puedes crear:
- Story: Funcionalidad desde la perspectiva del usuario
- Bug: Problemas reportados
- Task: Trabajo técnico
- Epic: Grupo de historias relacionadas

Información requerida para crear tarjetas:
- Título claro y descriptivo
- Descripción detallada
- Tipo de tarjeta
- Proyecto (ej. "PROYECTO-A")
- Prioridad (ej. "High", "Medium", "Low")
- Asignado (opcional)
- Estimación de tiempo (opcional)

Ejemplo de cómo solicitar información:
"Necesito crear una Story para el proyecto 'PROYECTO-X' con el título 'Implementar login de usuarios' y descripción 'Desarrollar la funcionalidad de inicio de sesión y registro'."

Si falta información, pregunta al usuario de forma clara y concisa."""
    }
}

# Backward compatibility - will be removed
AGENT_CONFIGS = LEGACY_AGENT_CONFIGS

@https_fn.on_request()
def chat_with_agent(req: https_fn.Request) -> https_fn.Response:
    """Endpoint principal para chat con agentes - wrapper para función async"""
    return asyncio.run(_chat_with_agent_async(req))

async def _chat_with_agent_async(req: https_fn.Request) -> https_fn.Response:
    """Endpoint principal para chat con agentes"""
    print("chat_with_agent called - FULL VERSION")
    
    # Handle CORS preflight
    if req.method == 'OPTIONS':
        return https_fn.Response(
            status=200,
            headers=CORS_HEADERS
        )
    
    try:
        # Verify authentication
        auth_header = req.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return https_fn.Response(
                json.dumps({"error": "Unauthorized"}), 
                status=401, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        token = auth_header.split('Bearer ')[1]
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['uid']
        
        print(f"User authenticated: {user_id}")
        
        # Parse request
        data = req.get_json()
        agent_id = data.get('agentId')
        message = data.get('message')
        conversation_id = data.get('conversationId')
        client_context = data.get('clientContext')
        
        print(f"Agent: {agent_id}, Message: {message}")
        
        # Get agent config from Firestore using new Agent Management System
        agent_manager = get_agent_manager()
        agent_config = agent_manager.get_agent(agent_id)
        
        print(f"=== DEBUGGING CHAT WITH AGENT ===")
        print(f"Agent ID: {agent_id}")
        print(f"Using Agent Management System")
        
        if not agent_config:
            return https_fn.Response(
                json.dumps({"error": f"Agent '{agent_id}' not found or disabled"}), 
                status=404, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        if not agent_config.get('enabled', True):
            return https_fn.Response(
                json.dumps({"error": f"Agent '{agent_id}' is currently disabled"}), 
                status=403, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        print(f"USING DYNAMIC AGENT CONFIG")
            
        system_prompt = agent_config.get('system_prompt', '')
        tools = agent_config.get('tools', [])
        
        print(f"System prompt length: {len(system_prompt)}")
        print(f"Tools count: {len(tools)}")
        print(f"Tools: {tools}")
        print(f"Prompt preview: {system_prompt[:200]}...")

        # Build context for the model
        context_parts = []
        if system_prompt:
            context_parts.append(system_prompt)

        if client_context:
            context_parts.append(f"\n\nContexto del cliente: {client_context}")

        # Add MCP tools info to context
        tools_info = []
        try:
            from mcp_dispatcher import get_mcp_dispatcher
            dispatcher = await get_mcp_dispatcher()
            available_mcp_tools = dispatcher.get_available_tools()
            
            for tool_id in tools:
                if tool_id in available_mcp_tools:
                    # Get tool info from MCP system
                    tool_info = dispatcher.get_tool_info(tool_id)
                    if tool_info:
                        tools_info.append(f"- {tool_id}: Available MCP tool")
                    else:
                        tools_info.append(f"- {tool_id}: MCP tool")
            
            if tools_info:
                context_parts.append(f"\n\nHerramientas MCP disponibles:\n" + "\n".join(tools_info))
                print(f"Added {len(tools_info)} MCP tools to context")
        except Exception as e:
            print(f"Warning: Could not load MCP tools info: {e}")
            # Fallback to basic tools list
            if tools:
                context_parts.append(f"\n\nHerramientas: {', '.join(tools)}")

        final_context = "\n".join(context_parts)
        
        print(f"Final context length: {len(final_context)} chars")
        print(f"Final context preview: {final_context[:300]}...")
        print(f"=== END DEBUGGING ===")
        
        # --- Chat History Retrieval ---
        history = []
        if conversation_id:
            try:
                db = firestore.client()
                conversation_ref = db.collection('conversations').document(conversation_id)
                conversation_doc = conversation_ref.get()
                if conversation_doc.exists:
                    conversation_data = conversation_doc.to_dict()
                    messages = conversation_data.get('messages', [])
                    
                    # Convert Firestore messages to Gemini history format
                    for msg in messages:
                        role = 'user' if msg.get('role') == 'user' else 'model'
                        history.append({'role': role, 'parts': [msg.get('content', '')]})
                    
                    print(f"Retrieved {len(history)} messages from history.")
            
            except Exception as e:
                print(f"Error retrieving conversation history: {e}")
        
        # --- MCP-Enhanced Gemini Response Generation ---
        response_text = ""
        tool_results = []
        
        if model:
            try:
                # Get function definitions for this agent
                function_definitions = get_function_definitions_for_gemini(tools)
                
                print(f"Agent {agent_id} has {len(function_definitions)} tools available")
                
                # Configure model with function calling if tools are available
                if function_definitions:
                    model_with_tools = genai.GenerativeModel(
                        'gemini-1.5-flash-latest',
                        tools=function_definitions
                    )
                    chat = model_with_tools.start_chat(history=history)
                else:
                    chat = model.start_chat(history=history)
                
                # Prepend system context to the user's message
                full_message = f"{final_context}\n\nUsuario: {message}"
                
                # Send message and get response
                response = chat.send_message(full_message)
                response_text = response.text or ""
                
                print(f"Gemini response generated: {len(response_text)} chars")
                
                # Process function calls if any
                if function_definitions:
                    print("🔍 Checking for function calls...")
                    
                    # Use MCP system to execute tools
                    try:
                        enhanced_response, tool_results = await execute_agent_tools(
                            llm_response=response_text,
                            agent_id=agent_id,
                            user_id=user_id,
                            conversation_id=conversation_id,
                            client_context=client_context,
                            gemini_response=response
                        )
                        response_text = enhanced_response
                        
                        if tool_results:
                            print(f"Executed {len(tool_results)} tools successfully")
                        
                    except Exception as e:
                        print(f"Error executing tools: {e}")
                        # Continue with original response if tool execution fails
                
            except Exception as e:
                print(f"Error with Gemini: {e}")
                response_text = f"¡Hola! Soy el agente {agent_id}. Has dicho: '{message}'. Estoy teniendo un problema con la IA. Por favor, intenta de nuevo."
        else:
            response_text = f"¡Hola! Soy el agente {agent_id}. Has dicho: '{message}'. La IA no está configurada."
        
        # Save to Firestore if conversation_id provided
        if conversation_id:
            try:
                db = firestore.client()
                conversation_ref = db.collection('conversations').document(conversation_id)
                
                # Add messages to conversation
                new_message = {
                    'role': 'user',
                    'content': message,
                    'timestamp': firestore.SERVER_TIMESTAMP
                }
                
                conversation_ref.update({
                    'messages': firestore.ArrayUnion([new_message])
                })
                
                # Add assistant response
                assistant_message = {
                    'role': 'assistant',
                    'content': response_text,
                    'timestamp': firestore.SERVER_TIMESTAMP
                }
                
                conversation_ref.update({
                    'messages': firestore.ArrayUnion([assistant_message])
                })
                
                print(f"Messages saved to conversation {conversation_id}")
                
            except Exception as e:
                print(f"Error saving to Firestore: {e}")
        
        # Prepare response data
        response_data = {
            "response": response_text,
            "agentId": agent_id,
            "tools": tools,
            "toolResults": [
                {
                    "toolName": result.tool_name,
                    "success": result.success,
                    "executionTime": result.execution_time
                } for result in tool_results
            ] if tool_results else [],
            "toolsExecuted": len(tool_results)
        }
        
        return https_fn.Response(
            json.dumps(response_data),
            status=200,
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )
        
    except Exception as e:
        print(f"Error in chat_with_agent: {str(e)}")
        return https_fn.Response(
            json.dumps({"error": f"Internal server error: {str(e)}"}), 
            status=500, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )

@https_fn.on_request()
def get_agent_configs(req: https_fn.Request) -> https_fn.Response:
    """Endpoint para obtener configuraciones de agentes - DEPRECATED"""
    print("get_agent_configs called - REDIRECTING TO NEW SYSTEM")
    
    # Handle CORS preflight
    if req.method == 'OPTIONS':
        return https_fn.Response(
            status=200,
            headers=CORS_HEADERS
        )
    
    try:
        # Verify authentication
        auth_header = req.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return https_fn.Response(
                json.dumps({"error": "Unauthorized"}), 
                status=401, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        token = auth_header.split('Bearer ')[1]
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['uid']
        user_email = decoded_token.get('email', '')
        
        print(f"User authenticated: {user_email}")
        
        # Check if user is admin
        is_admin = user_email.endswith('@positiveit.com.ar') if user_email else False
        
        # Use new Agent Management System
        agent_manager = get_agent_manager()
        agents = agent_manager.get_enabled_agents()
        
        # Convert to legacy format for backward compatibility
        configs = {}
        for agent_id, agent_data in agents.items():
            configs[agent_id] = {
                "name": agent_data.get("name", agent_id),
                "description": agent_data.get("description", ""),
                "tools": agent_data.get("tools", []),
                "context_type": agent_data.get("context_type", "general"),
                "system_prompt": agent_data.get("system_prompt", ""),
                "enabled": agent_data.get("enabled", True),
                "avatar": agent_data.get("avatar", "robot"),
                "category": agent_data.get("category", "general")
            }
            
            # Only return editable fields for admins
            if is_admin:
                configs[agent_id]["editable"] = True
                # Get MCP tools for admin
                try:
                    from mcp_servers import get_available_tools
                    configs[agent_id]["available_tools_all"] = get_available_tools()
                except Exception as e:
                    print(f"Could not load MCP tools: {e}")
                    configs[agent_id]["available_tools_all"] = []
        
        print(f"Returning {len(configs)} agents for user {user_email}, admin: {is_admin}")
        
        return https_fn.Response(
            json.dumps({"agents": configs}), 
            status=200, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )
        
    except Exception as e:
        print(f"Error in get_agent_configs: {str(e)}")
        return https_fn.Response(
            json.dumps({"error": f"Internal server error: {str(e)}"}), 
            status=500, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )

@https_fn.on_request()
def update_agent_config(req: https_fn.Request) -> https_fn.Response:
    """Endpoint para actualizar configuraciones de agentes - USING NEW SYSTEM"""
    print("update_agent_config called - USING AGENT MANAGEMENT SYSTEM")
    
    # Handle CORS preflight
    if req.method == 'OPTIONS':
        return https_fn.Response(
            status=200,
            headers=CORS_HEADERS
        )
    
    try:
        # Verify authentication
        auth_header = req.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return https_fn.Response(
                json.dumps({"error": "Unauthorized"}), 
                status=401, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        token = auth_header.split('Bearer ')[1]
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['uid']
        user_email = decoded_token.get('email', '')
        
        # Check if user is admin
        is_admin = user_email.endswith('@positiveit.com.ar') if user_email else False
        
        print(f"User {user_email} - Admin: {is_admin}")
        
        if not is_admin:
            return https_fn.Response(
                json.dumps({"error": "Admin access required"}), 
                status=403, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        # Parse request
        data = req.get_json()
        agent_id = data.get('agentId')
        system_prompt = data.get('systemPrompt')
        tools = data.get('tools', [])
        name = data.get('name')
        description = data.get('description')
        context_type = data.get('contextType')
        enabled = data.get('enabled')
        avatar = data.get('avatar')
        category = data.get('category')
        
        print(f"Admin {user_email} updating agent {agent_id}")
        print(f"System prompt length: {len(system_prompt) if system_prompt else 0}")
        print(f"Tools received: {tools}")
        
        if not agent_id:
            return https_fn.Response(
                json.dumps({"error": "Agent ID is required"}), 
                status=400, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        # Use Agent Management System
        agent_manager = get_agent_manager()
        
        success = agent_manager.update_agent(
            agent_id=agent_id,
            name=name,
            description=description,
            system_prompt=system_prompt,
            tools=tools,
            context_type=context_type,
            enabled=enabled,
            user_id=user_id,
            avatar=avatar,
            category=category
        )
        
        if success:
            print(f"Agent {agent_id} updated successfully via Agent Management System")
            return https_fn.Response(
                json.dumps({"message": "Agent configuration updated successfully"}), 
                status=200, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        else:
            return https_fn.Response(
                json.dumps({"error": "Failed to update agent"}), 
                status=400, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
    except Exception as e:
        print(f"Error in update_agent_config: {str(e)}")
        return https_fn.Response(
            json.dumps({"error": f"Internal server error: {str(e)}"}), 
            status=500, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )

@https_fn.on_request()
def get_mcp_status(req: https_fn.Request) -> https_fn.Response:
    """Endpoint para obtener el estado del sistema MCP"""
    return asyncio.run(_get_mcp_status_async(req))

async def _get_mcp_status_async(req: https_fn.Request) -> https_fn.Response:
    """Endpoint async para obtener el estado del sistema MCP"""
    print("get_mcp_status called")
    
    # Handle CORS preflight
    if req.method == 'OPTIONS':
        return https_fn.Response(
            status=200,
            headers=CORS_HEADERS
        )
    
    try:
        # Verify authentication
        auth_header = req.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return https_fn.Response(
                json.dumps({"error": "Unauthorized"}), 
                status=401, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        token = auth_header.split('Bearer ')[1]
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['uid']
        user_email = decoded_token.get('email', '')
        
        print(f"MCP status requested by: {user_email}")
        
        # Get MCP system status
        try:
            executor = await get_tool_executor()
            health_status = await executor.health_check()
            execution_stats = executor.get_execution_stats()
            
            # Get available tools per agent
            agent_tools = {}
            for agent_id in AGENT_CONFIGS.keys():
                agent_tools[agent_id] = get_tools_for_agent(agent_id)
            
            # Get authentication status
            auth_manager = get_auth_manager()
            auth_status = auth_manager.get_credential_status()
            
            status_data = {
                "mcpSystem": health_status,
                "executionStats": execution_stats,
                "agentTools": agent_tools,
                "authenticationStatus": auth_status,
                "timestamp": firestore.SERVER_TIMESTAMP
            }
            
            return https_fn.Response(
                json.dumps(status_data, default=str),
                status=200,
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
            
        except Exception as e:
            print(f"Error getting MCP status: {e}")
            return https_fn.Response(
                json.dumps({
                    "error": "MCP system not available",
                    "details": str(e),
                    "mcpSystem": {"status": "error", "message": str(e)}
                }),
                status=200,  # Return 200 but with error info
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
    except Exception as e:
        print(f"Error in get_mcp_status: {str(e)}")
        return https_fn.Response(
            json.dumps({"error": f"Internal server error: {str(e)}"}), 
            status=500, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )

# Import new CRUD endpoints for Firebase Functions
# These will be automatically deployed as separate Cloud Functions
from agent_endpoints import (
    get_all_agents,
    create_agent, 
    update_agent,
    delete_agent,
    get_available_mcp_tools,
    migrate_legacy_agents
)