import os
import json
from firebase_functions import https_fn
from firebase_admin import initialize_app, auth, firestore
import google.generativeai as genai

# Initialize Firebase
initialize_app()

# CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600'
}

# Initialize Gemini
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
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        print(f"Gemini initialized with API key: {api_key[:10]}...")
    else:
        print("Warning: No Gemini API key found")
        model = None
except Exception as e:
    print(f"Error initializing Gemini: {e}")
    model = None

# Agent configurations with tools
AGENT_CONFIGS = {
    "posiAgent": {
        "name": "Posi",
        "description": "Asistente general de Positive IT",
        "tools": ["web_search", "google_calendar", "google_drive"],
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
        "tools": ["google_drive", "google_calendar", "email"],
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
        "tools": ["jira", "google_drive", "google_calendar"],
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

# Available tools
AVAILABLE_TOOLS = {
    "web_search": {
        "name": "Búsqueda Web",
        "description": "Buscar información actualizada en internet",
        "icon": "🌐"
    },
    "google_calendar": {
        "name": "Google Calendar",
        "description": "Acceder y gestionar calendarios",
        "icon": "📅"
    },
    "google_drive": {
        "name": "Google Drive",
        "description": "Crear, leer y gestionar documentos",
        "icon": "📁"
    },
    "jira": {
        "name": "JIRA",
        "description": "Crear y gestionar tickets de proyecto",
        "icon": "🎫"
    },
    "email": {
        "name": "Email",
        "description": "Enviar correos electrónicos",
        "icon": "📧"
    }
}

@https_fn.on_request()
def chat_with_agent(req: https_fn.Request) -> https_fn.Response:
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
        
        # Get agent config from Firestore first, fallback to defaults
        db = firestore.client()
        agent_configs_ref = db.collection('agent_configs').document(agent_id)
        agent_doc = agent_configs_ref.get()
        
        print(f"=== DEBUGGING CHAT WITH AGENT ===")
        print(f"Agent ID: {agent_id}")
        print(f"Checking Firestore collection: agent_configs")
        print(f"Document exists: {agent_doc.exists}")
        
        agent_config = {}
        if agent_doc.exists:
            # Use custom configuration from Firestore
            agent_config = agent_doc.to_dict()
            print(f"✅ USING CUSTOM CONFIG")
        else:
            # Use default configuration
            default_config = AGENT_CONFIGS.get(agent_id)
            if not default_config:
                return https_fn.Response(
                    json.dumps({"error": "Agent not found"}), 
                    status=404, 
                    headers={**CORS_HEADERS, "Content-Type": "application/json"}
                )
            agent_config = default_config
            print(f"❌ USING DEFAULT CONFIG")
            
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

        # Add available tools info to context
        tools_info = []
        for tool_id in tools:
            if tool_id in AVAILABLE_TOOLS:
                tool = AVAILABLE_TOOLS[tool_id]
                tools_info.append(f"- {tool['icon']} {tool['name']}: {tool['description']}")
        
        if tools_info:
            context_parts.append(f"\n\nHerramientas disponibles:\n" + "\n".join(tools_info))

        final_context = "\n".join(context_parts)
        
        print(f"Final context length: {len(final_context)} chars")
        print(f"Final context preview: {final_context[:300]}...")
        print(f"=== END DEBUGGING ===")
        
        # --- Chat History Retrieval ---
        history = []
        if conversation_id:
            try:
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
        
        # --- Gemini Response Generation ---
        response_text = ""
        if model:
            try:
                # Start a chat session with system prompt and history
                chat = model.start_chat(history=history)
                
                # Prepend system context to the user's message
                full_message = f"{final_context}\n\nUsuario: {message}"
                
                response = chat.send_message(full_message)
                response_text = response.text
                print(f"Gemini response generated: {len(response_text)} chars")
                
            except Exception as e:
                print(f"Error with Gemini: {e}")
                response_text = f"¡Hola! Soy el agente {agent_id}. Has dicho: '{message}'. Estoy teniendo un problema con la IA. Por favor, intenta de nuevo."
        else:
            response_text = f"¡Hola! Soy el agente {agent_id}. Has dicho: '{message}'. La IA no está configurada."
        
        # Save to Firestore if conversation_id provided
        if conversation_id:
            try:
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
        
        return https_fn.Response(
            json.dumps({
                "response": response_text,
                "agentId": agent_id,
                "tools": tools
            }),
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
    """Endpoint para obtener configuraciones de agentes"""
    print("get_agent_configs called - FULL VERSION")
    
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
        
        # Check if user is admin
        is_admin = user_id.endswith('@positiveit.com.ar') if '@' in user_id else False
        
        # Get custom configs from Firestore
        db = firestore.client()
        custom_configs = {}
        try:
            configs_ref = db.collection('agent_configs')
            docs = configs_ref.stream()
            for doc in docs:
                custom_configs[doc.id] = doc.to_dict()
        except Exception as e:
            print(f"Error reading custom configs: {e}")
        
        # Return agent configs
        configs = {}
        for agent_id, config in AGENT_CONFIGS.items():
            configs[agent_id] = {
                "name": config["name"],
                "description": config["description"],
                "tools": config["tools"],
                "context_type": config["context_type"],
                "available_tools": {tool_id: AVAILABLE_TOOLS[tool_id] for tool_id in config["tools"] if tool_id in AVAILABLE_TOOLS}
            }
            
            # Use custom config if available, otherwise default
            if agent_id in custom_configs:
                custom_config = custom_configs[agent_id]
                configs[agent_id]["system_prompt"] = custom_config.get("system_prompt", config["system_prompt"])
                configs[agent_id]["tools"] = custom_config.get("tools", config["tools"])
            else:
                configs[agent_id]["system_prompt"] = config["system_prompt"]
                configs[agent_id]["tools"] = config["tools"]
            
            # Only return editable fields for admins
            if is_admin:
                configs[agent_id]["editable"] = True
                configs[agent_id]["available_tools_all"] = AVAILABLE_TOOLS
        
        print(f"Returning configs for user {user_id}, admin: {is_admin}")
        
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
    """Endpoint para actualizar configuraciones de agentes (solo admins)"""
    print("update_agent_config called - FULL VERSION")
    
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
        
        print(f"User {user_email} (uid: {user_id}) - Admin: {is_admin}")
        
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
        
        print(f"Admin {user_email} (uid: {user_id}) updating agent {agent_id}")
        print(f"System prompt length: {len(system_prompt) if system_prompt else 0}")
        print(f"Tools received: {tools}")
        print(f"Tools count: {len(tools)}")
        
        if not agent_id or agent_id not in AGENT_CONFIGS:
            return https_fn.Response(
                json.dumps({"error": "Invalid agent ID"}), 
                status=400, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        # Update agent configuration in Firestore
        db = firestore.client()
        agent_ref = db.collection('agent_configs').document(agent_id)
        
        update_data = {
            'system_prompt': system_prompt,
            'tools': tools,
            'updated_by': user_id,
            'updated_at': firestore.SERVER_TIMESTAMP
        }
        
        agent_ref.set(update_data, merge=True)
        
        print(f"Agent {agent_id} configuration updated successfully")
        
        return https_fn.Response(
            json.dumps({"message": "Agent configuration updated successfully"}), 
            status=200, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )
        
    except Exception as e:
        print(f"Error in update_agent_config: {str(e)}")
        return https_fn.Response(
            json.dumps({"error": f"Internal server error: {str(e)}"}), 
            status=500, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )