#!/usr/bin/env python3
"""
Script para crear agentes de prueba en Firestore
"""

import os
import sys
import logging
from firebase_admin import initialize_app, firestore

# Add the functions directory to Python path
sys.path.append(os.path.dirname(__file__))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test data
TEST_AGENTS = {
    "posiAgent": {
        "name": "Posi",
        "description": "Asistente general de Positive IT",
        "system_prompt": """Eres Posi, el asistente de IA de Positive IT. Tu objetivo es ayudar a los empleados con información sobre la empresa, procesos internos y cualquier consulta relacionada con Positive IT.

Contexto sobre Positive IT:
- Somos una empresa de desarrollo de software
- Especializados en soluciones empresariales
- Trabajamos con tecnologías modernas
- Tenemos un equipo de profesionales altamente calificados

Herramientas disponibles:
- web_search: Buscar información actualizada en internet
- get_page_content: Obtener contenido de páginas web específicas

Responde de manera amigable y profesional. Si no tienes información específica sobre algo, indícalo claramente y usa las herramientas disponibles para buscar la información.""",
        "tools": ["web_search", "search_web", "get_page_content"],
        "context_type": "general",
        "enabled": True,
        "avatar": "🤖",
        "category": "general",
        "version": "1.0.0",
        "created_by": "system_test",
        "updated_by": "system_test"
    },
    "minutaMaker": {
        "name": "Minuta Maker",
        "description": "Especialista en crear minutas de reuniones",
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

Crea minutas claras, concisas y accionables.""",
        "tools": ["create_document", "send_email"],
        "context_type": "client_specific",
        "enabled": True,
        "avatar": "📝",
        "category": "productivity",
        "version": "1.0.0",
        "created_by": "system_test",
        "updated_by": "system_test"
    }
}

def create_test_agents():
    """Create test agents in Firestore"""
    
    try:
        # Initialize Firebase (without credentials for local testing)
        app = initialize_app()
        db = firestore.client()
        
        logger.info("Creating test agents in Firestore...")
        
        created_count = 0
        for agent_id, agent_data in TEST_AGENTS.items():
            try:
                # Add timestamps
                agent_data['created_at'] = firestore.SERVER_TIMESTAMP
                agent_data['updated_at'] = firestore.SERVER_TIMESTAMP
                
                # Create agent document
                doc_ref = db.collection('agent_configs').document(agent_id)
                doc_ref.set(agent_data)
                
                logger.info(f"✅ Created agent: {agent_id}")
                created_count += 1
                
            except Exception as e:
                logger.error(f"❌ Failed to create agent {agent_id}: {e}")
        
        logger.info(f"Successfully created {created_count}/{len(TEST_AGENTS)} test agents")
        return True
        
    except Exception as e:
        logger.error(f"Error creating test agents: {e}")
        return False

if __name__ == "__main__":
    success = create_test_agents()
    sys.exit(0 if success else 1)
