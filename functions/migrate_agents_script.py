#!/usr/bin/env python3
"""
Script temporal para migrar agentes legacy a Firestore
"""

import os
import sys
import logging
from firebase_admin import initialize_app, firestore

# Add the functions directory to Python path
sys.path.append(os.path.dirname(__file__))

from agent_management import get_agent_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firebase
app = initialize_app()

# Legacy agent configurations with MCP tools
LEGACY_AGENTS = {
    "posiAgent": {
        "name": "Posi",
        "description": "Asistente general de Positive IT",
        "tools": ["web_search", "search_web", "get_page_content", "read_document", "list_files", "send_email"],
        "context_type": "general",
        "avatar": "🤖",
        "category": "general",
        "system_prompt": """Eres Posi, el asistente de IA de Positive IT. Tu objetivo es ayudar a los empleados con información sobre la empresa, procesos internos y cualquier consulta relacionada con Positive IT.

Contexto sobre Positive IT:
- Somos una empresa de desarrollo de software
- Especializados en soluciones empresariales
- Trabajamos con tecnologías modernas
- Tenemos un equipo de profesionales altamente calificados

Herramientas disponibles:
- web_search: Buscar información actualizada en internet
- get_page_content: Obtener contenido de páginas web específicas
- read_document: Leer y analizar documentos
- list_files: Listar archivos disponibles
- send_email: Enviar correos electrónicos

Responde de manera amigable y profesional. Si no tienes información específica sobre algo, indícalo claramente y usa las herramientas disponibles para buscar la información."""
    },
    "minutaMaker": {
        "name": "Minuta Maker",
        "description": "Especialista en crear minutas de reuniones",
        "tools": ["create_document", "send_email", "read_document"],
        "context_type": "client_specific",
        "avatar": "📝",
        "category": "productivity",
        "system_prompt": """Eres Minuta Maker, un agente especializado en crear minutas de reuniones profesionales y estructuradas.

Tu función es:
1. Procesar transcripciones o notas de reuniones
2. Identificar puntos clave, decisiones y acciones
3. Crear minutas estructuradas y profesionales
4. Enviar minutas por email a los participantes

Estructura de minutas:
- Fecha y hora
- Participantes
- Temas tratados
- Decisiones tomadas
- Acciones pendientes (con responsables y fechas)
- Próximos pasos

Herramientas disponibles:
- create_document: Crear documentos de minutas
- send_email: Enviar minutas a participantes
- read_document: Leer documentos fuente

Crea minutas claras, concisas y accionables."""
    },
    "jiraAssistant": {
        "name": "JIRA Assistant",
        "description": "Gestor de tarjetas JIRA",
        "tools": ["create_jira_issue", "update_issue", "get_issue", "search_issues", "add_comment", "transition_issue", "list_projects"],
        "context_type": "client_specific",
        "avatar": "🎫",
        "category": "project_management",
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

Herramientas disponibles:
- create_jira_issue: Crear nuevas tarjetas
- update_issue: Actualizar tarjetas existentes
- get_issue: Obtener información de tarjetas
- search_issues: Buscar tarjetas
- add_comment: Añadir comentarios
- transition_issue: Cambiar estado de tarjetas
- list_projects: Listar proyectos disponibles

Información requerida para crear tarjetas:
- Título claro y descriptivo
- Descripción detallada
- Tipo de tarjeta
- Proyecto (ej. "PROYECTO-A")
- Prioridad (ej. "High", "Medium", "Low")
- Asignado (opcional)
- Estimación de tiempo (opcional)

Si falta información, pregunta al usuario de forma clara y concisa."""
    }
}

def migrate_agents():
    """Migrate legacy agents to Firestore"""
    
    logger.info("Starting agent migration...")
    
    try:
        agent_manager = get_agent_manager()
        migrated_count = 0
        
        for agent_id, config in LEGACY_AGENTS.items():
            logger.info(f"Migrating agent: {agent_id}")
            
            # Check if agent already exists
            existing = agent_manager.get_agent(agent_id)
            if existing:
                logger.info(f"Updating existing agent: {agent_id}")
                
                # Update existing agent with new tools and prompt
                success = agent_manager.update_agent(
                    agent_id=agent_id,
                    name=config.get('name', agent_id),
                    description=config.get('description', ''),
                    system_prompt=config.get('system_prompt', ''),
                    tools=config.get('tools', []),
                    context_type=config.get('context_type', 'general'),
                    user_id='system_migration',
                    avatar=config.get('avatar', '🤖'),
                    category=config.get('category', 'general')
                )
            else:
                logger.info(f"Creating new agent: {agent_id}")
                
                # Create new agent
                success = agent_manager.create_agent(
                    agent_id=agent_id,
                    name=config.get('name', agent_id),
                    description=config.get('description', ''),
                    system_prompt=config.get('system_prompt', ''),
                    tools=config.get('tools', []),
                    context_type=config.get('context_type', 'general'),
                    user_id='system_migration',
                    avatar=config.get('avatar', '🤖'),
                    category=config.get('category', 'general')
                )
            
            if success:
                migrated_count += 1
                logger.info(f"✅ Successfully migrated: {agent_id}")
            else:
                logger.error(f"❌ Failed to migrate: {agent_id}")
        
        logger.info(f"Migration complete! Migrated {migrated_count}/{len(LEGACY_AGENTS)} agents")
        return True
        
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        return False

if __name__ == "__main__":
    success = migrate_agents()
    sys.exit(0 if success else 1)
