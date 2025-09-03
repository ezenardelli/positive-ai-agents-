"""
Agent Management Endpoints
CRUD API endpoints for dynamic agent management
"""

import asyncio
import json
import logging
from firebase_functions import https_fn
from firebase_admin import auth
from agent_management import get_agent_manager
from mcp_servers import get_available_tools, get_mcp_server_configs
from mcp_dispatcher import get_mcp_dispatcher

logger = logging.getLogger(__name__)

# CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600'
}

def verify_admin_auth(req: https_fn.Request) -> tuple[str, str]:
    """Verify admin authentication and return user_id and email"""
    auth_header = req.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise ValueError("Unauthorized - no token provided")
    
    token = auth_header.split('Bearer ')[1]
    decoded_token = auth.verify_id_token(token)
    user_id = decoded_token['uid']
    user_email = decoded_token.get('email', '')
    
    # Check if user is admin
    is_admin = user_email.endswith('@positiveit.com.ar') if user_email else False
    
    if not is_admin:
        raise ValueError("Admin access required")
    
    return user_id, user_email

@https_fn.on_request()
def get_all_agents(req: https_fn.Request) -> https_fn.Response:
    """Get all agents with their configurations"""
    if req.method == 'OPTIONS':
        return https_fn.Response(status=200, headers=CORS_HEADERS)
    
    try:
        logger.info("🔍 Starting get_all_agents endpoint v3 - SIMPLIFIED")
        
        # Verify authentication (admin not required for viewing)
        auth_header = req.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.warning("❌ No authorization header")
            return https_fn.Response(
                json.dumps({"error": "Unauthorized"}), 
                status=401, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        logger.info("🔑 Verifying token...")
        token = auth_header.split('Bearer ')[1]
        decoded_token = auth.verify_id_token(token)
        user_email = decoded_token.get('email', '')
        is_admin = user_email.endswith('@positiveit.com.ar') if user_email else False
        logger.info(f"✅ User authenticated: {user_email}, admin: {is_admin}")
        
        # TEMPORARY: Return hardcoded agents to test the endpoint
        logger.info("🤖 Using temporary hardcoded agents...")
        agents = {
            "posiAgent": {
                "id": "posiAgent",
                "name": "Posi",
                "description": "Asistente general de Positive IT",
                "system_prompt": "Eres Posi, el asistente de IA de Positive IT.",
                "tools": ["web_search", "search_web", "get_page_content"],
                "context_type": "general",
                "enabled": True,
                "avatar": "🤖",
                "category": "general"
            },
            "minutaMaker": {
                "id": "minutaMaker",
                "name": "Minuta Maker",
                "description": "Especialista en crear minutas de reuniones",
                "system_prompt": "Eres Minuta Maker, especialista en minutas.",
                "tools": ["create_document", "send_email"],
                "context_type": "client_specific",
                "enabled": True,
                "avatar": "📝",
                "category": "productivity"
            }
        }
        
        # Add available tools info for admins
        if is_admin:
            logger.info("🔧 Adding available tools for admin...")
            try:
                available_tools = get_available_tools()
                for agent_id, agent_data in agents.items():
                    agent_data['available_tools_all'] = available_tools
            except Exception as tool_error:
                logger.warning(f"Could not load available tools: {tool_error}")
                for agent_id, agent_data in agents.items():
                    agent_data['available_tools_all'] = []
        
        logger.info(f"✅ Returning {len(agents)} agents")
        
        return https_fn.Response(
            json.dumps({
                "agents": agents,
                "count": len(agents),
                "is_admin": is_admin
            }), 
            status=200, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )
        
    except ValueError as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}), 
            status=401, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )
    except Exception as e:
        logger.error(f"Error in get_all_agents: {e}")
        return https_fn.Response(
            json.dumps({"error": "Internal server error"}), 
            status=500, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )

@https_fn.on_request()
def create_agent(req: https_fn.Request) -> https_fn.Response:
    """Create new agent (admin only)"""
    if req.method == 'OPTIONS':
        return https_fn.Response(status=200, headers=CORS_HEADERS)
    
    try:
        user_id, user_email = verify_admin_auth(req)
        
        data = req.get_json()
        agent_id = data.get('agentId')
        name = data.get('name')
        description = data.get('description')
        system_prompt = data.get('systemPrompt')
        tools = data.get('tools', [])
        context_type = data.get('contextType', 'general')
        avatar = data.get('avatar', '🤖')
        category = data.get('category', 'custom')
        
        # Validate required fields
        if not all([agent_id, name, description, system_prompt]):
            return https_fn.Response(
                json.dumps({"error": "Missing required fields: agentId, name, description, systemPrompt"}), 
                status=400, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        # Validate agent_id format (alphanumeric + underscore)
        import re
        if not re.match(r'^[a-zA-Z0-9_]+$', agent_id):
            return https_fn.Response(
                json.dumps({"error": "Agent ID must be alphanumeric with underscores only"}), 
                status=400, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        agent_manager = get_agent_manager()
        
        success = agent_manager.create_agent(
            agent_id=agent_id,
            name=name,
            description=description,
            system_prompt=system_prompt,
            tools=tools,
            context_type=context_type,
            user_id=user_id,
            avatar=avatar,
            category=category
        )
        
        if success:
            return https_fn.Response(
                json.dumps({
                    "message": "Agent created successfully",
                    "agentId": agent_id
                }), 
                status=201, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        else:
            return https_fn.Response(
                json.dumps({"error": "Failed to create agent"}), 
                status=400, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
    except ValueError as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}), 
            status=401, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )
    except Exception as e:
        logger.error(f"Error in create_agent: {e}")
        return https_fn.Response(
            json.dumps({"error": "Internal server error"}), 
            status=500, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )

@https_fn.on_request()
def update_agent(req: https_fn.Request) -> https_fn.Response:
    """Update existing agent (admin only)"""
    if req.method == 'OPTIONS':
        return https_fn.Response(status=200, headers=CORS_HEADERS)
    
    try:
        user_id, user_email = verify_admin_auth(req)
        
        data = req.get_json()
        agent_id = data.get('agentId')
        
        if not agent_id:
            return https_fn.Response(
                json.dumps({"error": "Agent ID is required"}), 
                status=400, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        agent_manager = get_agent_manager()
        
        # Check if agent exists
        if not agent_manager.get_agent(agent_id):
            return https_fn.Response(
                json.dumps({"error": "Agent not found"}), 
                status=404, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        success = agent_manager.update_agent(
            agent_id=agent_id,
            name=data.get('name'),
            description=data.get('description'),
            system_prompt=data.get('systemPrompt'),
            tools=data.get('tools'),
            context_type=data.get('contextType'),
            enabled=data.get('enabled'),
            user_id=user_id,
            avatar=data.get('avatar'),
            category=data.get('category')
        )
        
        if success:
            return https_fn.Response(
                json.dumps({
                    "message": "Agent updated successfully",
                    "agentId": agent_id
                }), 
                status=200, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        else:
            return https_fn.Response(
                json.dumps({"error": "Failed to update agent"}), 
                status=400, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
    except ValueError as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}), 
            status=401, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )
    except Exception as e:
        logger.error(f"Error in update_agent: {e}")
        return https_fn.Response(
            json.dumps({"error": "Internal server error"}), 
            status=500, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )

@https_fn.on_request()
def delete_agent(req: https_fn.Request) -> https_fn.Response:
    """Delete agent (admin only) - soft delete by disabling"""
    if req.method == 'OPTIONS':
        return https_fn.Response(status=200, headers=CORS_HEADERS)
    
    try:
        user_id, user_email = verify_admin_auth(req)
        
        data = req.get_json()
        agent_id = data.get('agentId')
        hard_delete = data.get('hardDelete', False)
        
        if not agent_id:
            return https_fn.Response(
                json.dumps({"error": "Agent ID is required"}), 
                status=400, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        agent_manager = get_agent_manager()
        
        # Check if agent exists
        if not agent_manager.get_agent(agent_id):
            return https_fn.Response(
                json.dumps({"error": "Agent not found"}), 
                status=404, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
        if hard_delete:
            success = agent_manager.hard_delete_agent(agent_id, user_id)
            action = "permanently deleted"
        else:
            success = agent_manager.delete_agent(agent_id, user_id)
            action = "disabled"
        
        if success:
            return https_fn.Response(
                json.dumps({
                    "message": f"Agent {action} successfully",
                    "agentId": agent_id
                }), 
                status=200, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        else:
            return https_fn.Response(
                json.dumps({"error": f"Failed to {action.split()[0]} agent"}), 
                status=400, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
    except ValueError as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}), 
            status=401, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )
    except Exception as e:
        logger.error(f"Error in delete_agent: {e}")
        return https_fn.Response(
            json.dumps({"error": "Internal server error"}), 
            status=500, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )

@https_fn.on_request()
def get_available_mcp_tools(req: https_fn.Request) -> https_fn.Response:
    """Get all available MCP tools with metadata"""
    if req.method == 'OPTIONS':
        return https_fn.Response(status=200, headers=CORS_HEADERS)
    
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
        
        # Get MCP tools info
        try:
            dispatcher = asyncio.run(get_mcp_dispatcher())
            tools = dispatcher.get_available_tools()
            categories = dispatcher.get_tools_by_category()
            
            # Get server configs for tool metadata
            server_configs = get_mcp_server_configs()
            
            # Enrich tools with server information
            enriched_tools = {}
            for tool_name in tools:
                tool_info = {
                    "name": tool_name,
                    "description": f"Tool: {tool_name}",
                    "server": "unknown",
                    "category": "other",
                    "icon": "🔧"
                }
                
                # Find which server provides this tool
                for server_id, config in server_configs.items():
                    if tool_name in config.get("tools", []):
                        tool_info.update({
                            "server": server_id,
                            "server_name": config.get("name", server_id),
                            "description": f"{tool_name} - {config.get('description', 'No description')}",
                            "icon": "🔧"  # Could be mapped from server type
                        })
                        break
                
                # Determine category
                for category, category_tools in categories.items():
                    if tool_name in category_tools:
                        tool_info["category"] = category
                        break
                
                enriched_tools[tool_name] = tool_info
            
            return https_fn.Response(
                json.dumps({
                    "tools": enriched_tools,
                    "categories": categories,
                    "total_tools": len(enriched_tools),
                    "servers": list(server_configs.keys())
                }), 
                status=200, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
            
        except Exception as e:
            logger.error(f"Error getting MCP tools: {e}")
            # Fallback to basic tools list
            basic_tools = get_available_tools()
            return https_fn.Response(
                json.dumps({
                    "tools": {tool: {"name": tool, "description": f"Tool: {tool}"} for tool in basic_tools},
                    "categories": {"general": basic_tools},
                    "total_tools": len(basic_tools),
                    "servers": [],
                    "note": "MCP system not fully available, showing basic tools"
                }), 
                status=200, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
    except Exception as e:
        logger.error(f"Error in get_available_mcp_tools: {e}")
        return https_fn.Response(
            json.dumps({"error": "Internal server error"}), 
            status=500, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )

@https_fn.on_request()
def migrate_legacy_agents(req: https_fn.Request) -> https_fn.Response:
    """Migrate legacy hardcoded agents to Firestore (admin only)"""
    if req.method == 'OPTIONS':
        return https_fn.Response(status=200, headers=CORS_HEADERS)
    
    try:
        user_id, user_email = verify_admin_auth(req)
        
        # Import legacy configs
        from main import AGENT_CONFIGS
        
        agent_manager = get_agent_manager()
        success = agent_manager.migrate_legacy_agents(AGENT_CONFIGS)
        
        if success:
            return https_fn.Response(
                json.dumps({
                    "message": "Legacy agents migrated successfully",
                    "migrated_agents": list(AGENT_CONFIGS.keys())
                }), 
                status=200, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        else:
            return https_fn.Response(
                json.dumps({"error": "Failed to migrate legacy agents"}), 
                status=400, 
                headers={**CORS_HEADERS, "Content-Type": "application/json"}
            )
        
    except ValueError as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}), 
            status=401, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )
    except Exception as e:
        logger.error(f"Error in migrate_legacy_agents: {e}")
        return https_fn.Response(
            json.dumps({"error": "Internal server error"}), 
            status=500, 
            headers={**CORS_HEADERS, "Content-Type": "application/json"}
        )
