"""
Agent Management System
Complete CRUD operations for dynamic agent management
"""

import json
import logging
import uuid
from typing import Dict, List, Any, Optional
from firebase_admin import firestore
from datetime import datetime

logger = logging.getLogger(__name__)

class AgentManager:
    """Complete agent management system"""
    
    def __init__(self):
        self.db = firestore.client()
        self.collection_name = 'agent_configs'
    
    def get_all_agents(self) -> Dict[str, Dict[str, Any]]:
        """Get all agents from Firestore"""
        try:
            agents = {}
            docs = self.db.collection(self.collection_name).stream()
            
            for doc in docs:
                agent_data = doc.to_dict()
                agents[doc.id] = {
                    'id': doc.id,
                    'name': agent_data.get('name', doc.id),
                    'description': agent_data.get('description', ''),
                    'system_prompt': agent_data.get('system_prompt', ''),
                    'tools': agent_data.get('tools', []),
                    'context_type': agent_data.get('context_type', 'general'),
                    'enabled': agent_data.get('enabled', True),
                    'created_at': agent_data.get('created_at'),
                    'updated_at': agent_data.get('updated_at'),
                    'created_by': agent_data.get('created_by'),
                    'updated_by': agent_data.get('updated_by'),
                    'avatar': agent_data.get('avatar', '🤖'),
                    'category': agent_data.get('category', 'general'),
                    'version': agent_data.get('version', '1.0.0')
                }
            
            logger.info(f"Retrieved {len(agents)} agents from Firestore")
            return agents
            
        except Exception as e:
            logger.error(f"Error getting agents: {e}")
            return {}
    
    def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get single agent by ID"""
        try:
            doc_ref = self.db.collection(self.collection_name).document(agent_id)
            doc = doc_ref.get()
            
            if doc.exists:
                agent_data = doc.to_dict()
                return {
                    'id': agent_id,
                    'name': agent_data.get('name', agent_id),
                    'description': agent_data.get('description', ''),
                    'system_prompt': agent_data.get('system_prompt', ''),
                    'tools': agent_data.get('tools', []),
                    'context_type': agent_data.get('context_type', 'general'),
                    'enabled': agent_data.get('enabled', True),
                    'created_at': agent_data.get('created_at'),
                    'updated_at': agent_data.get('updated_at'),
                    'created_by': agent_data.get('created_by'),
                    'updated_by': agent_data.get('updated_by'),
                    'avatar': agent_data.get('avatar', '🤖'),
                    'category': agent_data.get('category', 'general'),
                    'version': agent_data.get('version', '1.0.0')
                }
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error getting agent {agent_id}: {e}")
            return None
    
    def create_agent(self, agent_id: str, name: str, description: str, 
                    system_prompt: str, tools: List[str] = None, 
                    context_type: str = 'general', user_id: str = None,
                    avatar: str = '🤖', category: str = 'custom') -> bool:
        """Create new agent"""
        try:
            # Check if agent already exists
            if self.get_agent(agent_id):
                logger.warning(f"Agent {agent_id} already exists")
                return False
            
            agent_data = {
                'name': name,
                'description': description,
                'system_prompt': system_prompt,
                'tools': tools or [],
                'context_type': context_type,
                'enabled': True,
                'avatar': avatar,
                'category': category,
                'version': '1.0.0',
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP,
                'created_by': user_id or 'system',
                'updated_by': user_id or 'system'
            }
            
            doc_ref = self.db.collection(self.collection_name).document(agent_id)
            doc_ref.set(agent_data)
            
            logger.info(f"Created agent {agent_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating agent {agent_id}: {e}")
            return False
    
    def update_agent(self, agent_id: str, name: str = None, description: str = None,
                    system_prompt: str = None, tools: List[str] = None,
                    context_type: str = None, enabled: bool = None,
                    user_id: str = None, avatar: str = None, 
                    category: str = None) -> bool:
        """Update existing agent"""
        try:
            # Check if agent exists
            if not self.get_agent(agent_id):
                logger.warning(f"Agent {agent_id} not found")
                return False
            
            update_data = {
                'updated_at': firestore.SERVER_TIMESTAMP,
                'updated_by': user_id or 'system'
            }
            
            # Add only provided fields to update
            if name is not None:
                update_data['name'] = name
            if description is not None:
                update_data['description'] = description
            if system_prompt is not None:
                update_data['system_prompt'] = system_prompt
            if tools is not None:
                update_data['tools'] = tools
            if context_type is not None:
                update_data['context_type'] = context_type
            if enabled is not None:
                update_data['enabled'] = enabled
            if avatar is not None:
                update_data['avatar'] = avatar
            if category is not None:
                update_data['category'] = category
            
            doc_ref = self.db.collection(self.collection_name).document(agent_id)
            doc_ref.update(update_data)
            
            logger.info(f"Updated agent {agent_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating agent {agent_id}: {e}")
            return False
    
    def delete_agent(self, agent_id: str, user_id: str = None, hard_delete: bool = False) -> bool:
        """Delete agent (soft delete by default)"""
        try:
            if hard_delete:
                return self.hard_delete_agent(agent_id, user_id)
            else:
                return self.soft_delete_agent(agent_id, user_id)
                
        except Exception as e:
            logger.error(f"Error deleting agent {agent_id}: {e}")
            return False
    
    def soft_delete_agent(self, agent_id: str, user_id: str = None) -> bool:
        """Soft delete agent (disable)"""
        try:
            return self.update_agent(agent_id, enabled=False, user_id=user_id)
            
        except Exception as e:
            logger.error(f"Error soft deleting agent {agent_id}: {e}")
            return False
    
    def hard_delete_agent(self, agent_id: str, user_id: str = None) -> bool:
        """Hard delete agent (permanent)"""
        try:
            doc_ref = self.db.collection(self.collection_name).document(agent_id)
            doc_ref.delete()
            
            logger.info(f"Hard deleted agent {agent_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error hard deleting agent {agent_id}: {e}")
            return False
    
    def get_enabled_agents(self) -> Dict[str, Dict[str, Any]]:
        """Get only enabled agents"""
        all_agents = self.get_all_agents()
        return {
            agent_id: agent_data 
            for agent_id, agent_data in all_agents.items() 
            if agent_data.get('enabled', True)
        }
    
    def get_agents_by_category(self, category: str = None) -> Dict[str, Dict[str, Any]]:
        """Get agents filtered by category"""
        try:
            query = self.db.collection(self.collection_name)
            
            if category:
                query = query.where('category', '==', category)
            
            query = query.where('enabled', '==', True)
            
            agents = {}
            docs = query.stream()
            
            for doc in docs:
                agent_data = doc.to_dict()
                agents[doc.id] = {
                    'id': doc.id,
                    **agent_data
                }
            
            return agents
            
        except Exception as e:
            logger.error(f"Error getting agents by category {category}: {e}")
            return {}
    
    def validate_agent_tools(self, agent_id: str, available_tools: List[str]) -> Dict[str, Any]:
        """Validate that agent tools are available in MCP system"""
        try:
            agent = self.get_agent(agent_id)
            if not agent:
                return {"valid": False, "error": "Agent not found"}
            
            agent_tools = agent.get('tools', [])
            invalid_tools = [tool for tool in agent_tools if tool not in available_tools]
            
            return {
                "valid": len(invalid_tools) == 0,
                "agent_tools": agent_tools,
                "invalid_tools": invalid_tools,
                "available_tools": available_tools
            }
            
        except Exception as e:
            logger.error(f"Error validating tools for agent {agent_id}: {e}")
            return {"valid": False, "error": str(e)}
    
    def migrate_legacy_agents(self, legacy_configs: Dict[str, Dict]) -> bool:
        """Migrate legacy hardcoded agents to Firestore"""
        try:
            migrated_count = 0
            
            for agent_id, config in legacy_configs.items():
                # Check if already exists in Firestore
                if self.get_agent(agent_id):
                    logger.info(f"Agent {agent_id} already exists, skipping migration")
                    continue
                
                success = self.create_agent(
                    agent_id=agent_id,
                    name=config.get('name', agent_id),
                    description=config.get('description', ''),
                    system_prompt=config.get('system_prompt', ''),
                    tools=config.get('tools', []),
                    context_type=config.get('context_type', 'general'),
                    user_id='system_migration',
                    category='migrated'
                )
                
                if success:
                    migrated_count += 1
            
            logger.info(f"Migrated {migrated_count} legacy agents")
            return True
            
        except Exception as e:
            logger.error(f"Error migrating legacy agents: {e}")
            return False


# Global functions
def get_all_mcp_tool_definitions() -> Dict[str, Any]:
    """Get all MCP tool definitions"""
    try:
        from mcp_servers import get_available_tools
        return get_available_tools()
    except Exception as e:
        logger.error(f"Error getting MCP tools: {e}")
        return {}

# Global agent manager instance
_agent_manager = None

def get_agent_manager() -> AgentManager:
    """Get singleton agent manager instance"""
    global _agent_manager
    if _agent_manager is None:
        _agent_manager = AgentManager()
    return _agent_manager

async def get_agent_config_from_firestore(agent_id: str) -> Optional[Dict[str, Any]]:
    """Get agent configuration from Firestore (async wrapper)"""
    try:
        manager = get_agent_manager()
        return manager.get_agent(agent_id)
    except Exception as e:
        logger.error(f"Error getting agent config for {agent_id}: {e}")
        return None