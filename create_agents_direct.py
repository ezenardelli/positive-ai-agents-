#!/usr/bin/env python3
"""
Script directo para crear agentes usando la API
"""

import requests
import json

# Configuración
BASE_URL = "https://us-central1-positive-hub-ai.cloudfunctions.net"
TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjlmOWY4OTBmYWIyZDAwOWNhNTVmZDJiOGI3NzZhYzFhY2JjMTM2NzgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vcG9zaXRpdmUtaHViLWFpIiwiYXVkIjoicG9zaXRpdmUtaHViLWFpIiwiYXV0aF90aW1lIjoxNzM1OTQyNzA2LCJ1c2VyX2lkIjoibVo3RXpQVklKemdpYnpPcWxnQXJoRXZmOW1MMiIsInN1YiI6Im1aN0V6UFZJSnpnaWJ6T3FsZ0FyaEV2ZjltTDIiLCJpYXQiOjE3MzU5NDI3MDYsImV4cCI6MTczNTk0NjMwNiwiZW1haWwiOiJlbmFyZGVsbGlAcG9zaXRpdmVpdC5jb20uYXIiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJnb29nbGUuY29tIjpbIjEwMTc2ODUxNzIwOTkyMjcxNDQ5NyJdLCJlbWFpbCI6WyJlbmFyZGVsbGlAcG9zaXRpdmVpdC5jb20uYXIiXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19"

def create_agent(agent_data):
    """Create agent using API"""
    
    url = f"{BASE_URL}/create_agent"
    headers = {
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(url, headers=headers, json=agent_data, timeout=30)
        
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Created: {result.get('agentId')}")
            return True
        else:
            try:
                error = response.json()
                print(f"❌ Error: {error}")
            except:
                print(f"❌ Raw Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

def main():
    """Create test agents"""
    
    print("🚀 Creating Test Agents")
    print("=" * 40)
    
    # Agent 1: Posi Web Search
    agent1 = {
        "agentId": "posi_web",
        "name": "Posi Web Search",
        "description": "Asistente con capacidad de búsqueda web",
        "systemPrompt": """Eres Posi, asistente de Positive IT con capacidad de búsqueda web.

Herramientas disponibles:
- web_search: Buscar información en internet
- search_web: Búsqueda web alternativa  
- get_page_content: Obtener contenido de páginas específicas

Usa estas herramientas para encontrar información actualizada cuando el usuario lo solicite. Responde de manera amigable y profesional.""",
        "tools": ["web_search", "search_web", "get_page_content"],
        "avatar": "🌐",
        "category": "general"
    }
    
    # Agent 2: Simple Assistant
    agent2 = {
        "agentId": "simple_assistant",
        "name": "Asistente Simple",
        "description": "Asistente básico sin herramientas",
        "systemPrompt": "Eres un asistente amigable y útil. Responde a las preguntas de los usuarios de manera clara y concisa.",
        "tools": [],
        "avatar": "💬",
        "category": "general"
    }
    
    agents = [agent1, agent2]
    
    created = 0
    for i, agent in enumerate(agents, 1):
        print(f"\n📝 Creating Agent {i}: {agent['name']}")
        if create_agent(agent):
            created += 1
    
    print(f"\n🏁 Created {created}/{len(agents)} agents successfully!")

if __name__ == "__main__":
    main()
