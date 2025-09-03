"""
MCP Server Configurations
Defines configurations for all available MCP servers
"""

import os
import logging
from typing import Dict, List, Any
from mcp_auth import get_auth_manager

logger = logging.getLogger(__name__)

def get_mcp_server_configs() -> Dict[str, Dict[str, Any]]:
    """Get all MCP server configurations"""
    auth_manager = get_auth_manager()
    
    configs = {
        # GitHub MCP Server
        "github": {
            "name": "GitHub Integration",
            "description": "Manage GitHub repositories, issues, and pull requests",
            "command": "npx",
            "args": ["@modelcontextprotocol/server-github"],
            "env": auth_manager.get_environment_for_server("github"),
            "tools": [
                "create_repository",
                "get_repository",
                "list_repositories", 
                "create_issue",
                "update_issue",
                "list_issues",
                "create_pull_request",
                "get_file_contents",
                "create_file",
                "update_file",
                "delete_file",
                "search_repositories",
                "search_code",
                "get_repository_structure"
            ],
            "enabled": True,
            "install_command": "npm install -g @modelcontextprotocol/server-github",
            "requirements": ["Node.js", "GitHub Token"]
        },
        
        # Google Drive MCP Server
        "google_drive": {
            "name": "Google Drive Integration", 
            "description": "Create, read, and manage Google Drive documents",
            "command": "python",
            "args": ["-m", "google_drive_mcp_server"],
            "env": auth_manager.get_environment_for_server("google_drive"),
            "tools": [
                "create_document",
                "create_spreadsheet",
                "create_presentation",
                "read_document",
                "update_document",
                "list_files",
                "search_files",
                "share_file",
                "download_file",
                "upload_file",
                "create_folder",
                "move_file",
                "copy_file",
                "delete_file"
            ],
            "enabled": True,
            "install_command": "pip install google-drive-mcp-server",
            "requirements": ["Google API Credentials", "Python 3.8+"]
        },
        
        # JIRA MCP Server
        "jira": {
            "name": "JIRA Integration",
            "description": "Create and manage JIRA tickets and projects",
            "command": "python",
            "args": ["-m", "jira_mcp_server"],
            "env": auth_manager.get_environment_for_server("jira"),
            "tools": [
                "create_issue",
                "update_issue",
                "get_issue",
                "delete_issue",
                "search_issues",
                "add_comment",
                "assign_issue",
                "transition_issue",
                "create_project",
                "get_project",
                "list_projects",
                "get_project_components",
                "get_project_versions",
                "create_epic",
                "add_issue_to_epic"
            ],
            "enabled": True,
            "install_command": "pip install jira-mcp-server",
            "requirements": ["JIRA API Token", "JIRA URL", "Username"]
        },
        
        # Slack MCP Server
        "slack": {
            "name": "Slack Integration",
            "description": "Send messages and interact with Slack channels",
            "command": "python",
            "args": ["-m", "slack_mcp_server"],
            "env": auth_manager.get_environment_for_server("slack"),
            "tools": [
                "send_message",
                "send_direct_message",
                "list_channels",
                "get_channel_info",
                "create_channel",
                "invite_to_channel",
                "list_users",
                "get_user_info",
                "schedule_message",
                "upload_file",
                "get_message_history",
                "pin_message",
                "react_to_message"
            ],
            "enabled": True,
            "install_command": "pip install slack-mcp-server",
            "requirements": ["Slack Bot Token", "Slack App Token"]
        },
        
        # Linear MCP Server
        "linear": {
            "name": "Linear Integration",
            "description": "Manage Linear issues and projects",
            "command": "npx",
            "args": ["@linear/mcp-server"],
            "env": auth_manager.get_environment_for_server("linear"),
            "tools": [
                "create_issue",
                "update_issue", 
                "get_issue",
                "list_issues",
                "assign_issue",
                "create_project",
                "get_project",
                "list_projects",
                "create_team",
                "get_team",
                "list_teams",
                "add_comment",
                "update_issue_status"
            ],
            "enabled": False,  # Optional integration
            "install_command": "npm install -g @linear/mcp-server",
            "requirements": ["Linear API Key"]
        },
        
        # Notion MCP Server
        "notion": {
            "name": "Notion Integration",
            "description": "Create and manage Notion pages and databases",
            "command": "python",
            "args": ["-m", "notion_mcp_server"],
            "env": auth_manager.get_environment_for_server("notion"),
            "tools": [
                "create_page",
                "update_page",
                "get_page",
                "delete_page",
                "search_pages",
                "create_database",
                "query_database",
                "create_database_entry",
                "update_database_entry",
                "get_database_entry"
            ],
            "enabled": False,  # Optional integration
            "install_command": "pip install notion-mcp-server",
            "requirements": ["Notion API Key"]
        },
        
        # Web Search MCP Server
        "web_search": {
            "name": "Web Search",
            "description": "Search the web for current information",
            "command": "python",
            "args": ["-m", "web_search_mcp_server"],
            "env": {
                "SEARCH_API_KEY": os.getenv("SERP_API_KEY", ""),
                "SEARCH_ENGINE": "google"
            },
            "tools": [
                "web_search",
                "news_search",
                "image_search",
                "video_search",
                "get_page_content",
                "get_page_summary"
            ],
            "enabled": True,
            "install_command": "pip install web-search-mcp-server",
            "requirements": ["Search API Key (SerpAPI, Google Custom Search)"]
        },
        
        # Email MCP Server
        "email": {
            "name": "Email Integration",
            "description": "Send and manage emails",
            "command": "python",
            "args": ["-m", "email_mcp_server"],
            "env": {
                "SMTP_HOST": os.getenv("SMTP_HOST", "smtp.gmail.com"),
                "SMTP_PORT": os.getenv("SMTP_PORT", "587"),
                "SMTP_USERNAME": os.getenv("SMTP_USERNAME", ""),
                "SMTP_PASSWORD": os.getenv("SMTP_PASSWORD", ""),
                "EMAIL_FROM": os.getenv("EMAIL_FROM", "")
            },
            "tools": [
                "send_email",
                "send_html_email",
                "send_email_with_attachment",
                "read_emails",
                "search_emails",
                "mark_email_read",
                "delete_email",
                "create_draft"
            ],
            "enabled": True,
            "install_command": "pip install email-mcp-server",
            "requirements": ["SMTP Credentials", "Email Account"]
        },
        
        # Calendar MCP Server (Google Calendar)
        "google_calendar": {
            "name": "Google Calendar",
            "description": "Manage Google Calendar events and schedules",
            "command": "python",
            "args": ["-m", "google_calendar_mcp_server"],
            "env": auth_manager.get_environment_for_server("google_drive"),  # Same creds as Drive
            "tools": [
                "create_event",
                "update_event",
                "delete_event",
                "get_event",
                "list_events",
                "search_events",
                "create_meeting",
                "list_calendars",
                "get_free_busy",
                "send_invitation"
            ],
            "enabled": True,
            "install_command": "pip install google-calendar-mcp-server",
            "requirements": ["Google API Credentials"]
        },
        
        # Database MCP Server (Generic SQL)
        "database": {
            "name": "Database Integration",
            "description": "Query and manage databases",
            "command": "python",
            "args": ["-m", "database_mcp_server"],
            "env": {
                "DATABASE_URL": os.getenv("DATABASE_URL", ""),
                "DB_TYPE": os.getenv("DB_TYPE", "postgresql")
            },
            "tools": [
                "execute_query",
                "execute_update",
                "list_tables",
                "describe_table",
                "get_table_data",
                "create_table",
                "insert_data",
                "update_data",
                "delete_data"
            ],
            "enabled": False,  # Optional, needs database setup
            "install_command": "pip install database-mcp-server",
            "requirements": ["Database Connection String"]
        }
    }
    
    # Filter enabled servers and validate credentials
    enabled_configs = {}
    for server_id, config in configs.items():
        if config.get("enabled", True):
            # Check if credentials are available
            auth_available = auth_manager.validate_credentials(server_id) or server_id in ["web_search", "email"]
            
            if auth_available or server_id in ["web_search", "email"]:  # Some servers don't need special auth
                enabled_configs[server_id] = config
                logger.info(f"✅ Enabled MCP server: {config['name']}")
            else:
                logger.warning(f"⚠️ Skipping {config['name']} - credentials not available")
    
    return enabled_configs

def get_tool_to_server_mapping() -> Dict[str, str]:
    """Get mapping of tool names to their server IDs"""
    configs = get_mcp_server_configs()
    mapping = {}
    
    for server_id, config in configs.items():
        for tool in config.get("tools", []):
            mapping[tool] = server_id
    
    return mapping

def get_available_tools() -> List[str]:
    """Get list of all available tools across all servers"""
    tools = []
    configs = get_mcp_server_configs()
    
    for config in configs.values():
        tools.extend(config.get("tools", []))
    
    return tools

def get_tools_for_agent(agent_id: str) -> List[str]:
    """Get tools available for specific agent based on their configuration"""
    # This maps agent IDs to their allowed tools
    agent_tool_mapping = {
        "posiAgent": [
            "web_search", "news_search", "get_page_content",
            "search_files", "read_document", "list_files",
            "list_events", "create_event", "get_free_busy",
            "send_email"
        ],
        "minutaMaker": [
            "create_document", "update_document", "read_document",
            "create_spreadsheet", "share_file", "upload_file",
            "create_event", "send_invitation", "send_email",
            "send_email_with_attachment"
        ],
        "jiraAssistant": [
            "create_issue", "update_issue", "get_issue", "search_issues",
            "add_comment", "assign_issue", "transition_issue",
            "create_project", "get_project", "list_projects",
            "create_epic", "add_issue_to_epic",
            "read_document", "create_document"  # For documentation
        ]
    }
    
    return agent_tool_mapping.get(agent_id, [])

def get_server_installation_status() -> Dict[str, Dict[str, Any]]:
    """Check which MCP servers are properly installed and configured"""
    configs = get_mcp_server_configs()
    auth_manager = get_auth_manager()
    status = {}
    
    for server_id, config in configs.items():
        try:
            # Check credentials
            has_credentials = auth_manager.validate_credentials(server_id)
            
            # Check if command exists
            import shutil
            command_available = shutil.which(config["command"]) is not None
            
            status[server_id] = {
                "name": config["name"],
                "enabled": config.get("enabled", True),
                "has_credentials": has_credentials,
                "command_available": command_available,
                "ready": has_credentials and command_available and config.get("enabled", True),
                "install_command": config.get("install_command", ""),
                "requirements": config.get("requirements", []),
                "tools_count": len(config.get("tools", []))
            }
            
        except Exception as e:
            status[server_id] = {
                "name": config["name"],
                "enabled": False,
                "has_credentials": False,
                "command_available": False,
                "ready": False,
                "error": str(e),
                "install_command": config.get("install_command", ""),
                "requirements": config.get("requirements", []),
                "tools_count": 0
            }
    
    return status

def get_function_definitions_for_gemini(tools: List[str]) -> List[Dict[str, Any]]:
    """Generate function definitions for Gemini function calling"""
    
    # Tool schemas for Gemini function calling
    tool_schemas = {
        # GitHub tools
        "create_issue": {
            "name": "create_issue",
            "description": "Create a new GitHub issue",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Issue title"},
                    "body": {"type": "string", "description": "Issue description"},
                    "labels": {"type": "array", "items": {"type": "string"}, "description": "Issue labels"},
                    "assignees": {"type": "array", "items": {"type": "string"}, "description": "Issue assignees"}
                },
                "required": ["title", "body"]
            }
        },
        
        # Google Drive tools
        "create_document": {
            "name": "create_document",
            "description": "Create a new Google Docs document",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Document title"},
                    "content": {"type": "string", "description": "Document content"},
                    "folder_id": {"type": "string", "description": "Parent folder ID"}
                },
                "required": ["title", "content"]
            }
        },
        
        # JIRA tools
        "create_issue": {
            "name": "create_jira_issue",
            "description": "Create a new JIRA issue",
            "parameters": {
                "type": "object",
                "properties": {
                    "project": {"type": "string", "description": "Project key"},
                    "issue_type": {"type": "string", "description": "Issue type (Story, Bug, Task, Epic)"},
                    "summary": {"type": "string", "description": "Issue summary/title"},
                    "description": {"type": "string", "description": "Issue description"},
                    "priority": {"type": "string", "description": "Issue priority"},
                    "assignee": {"type": "string", "description": "Assignee username"}
                },
                "required": ["project", "issue_type", "summary"]
            }
        },
        
        # Web search tools
        "web_search": {
            "name": "web_search",
            "description": "Search the web for current information",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "num_results": {"type": "integer", "description": "Number of results to return", "default": 5}
                },
                "required": ["query"]
            }
        },
        
        # Email tools
        "send_email": {
            "name": "send_email",
            "description": "Send an email",
            "parameters": {
                "type": "object",
                "properties": {
                    "to": {"type": "string", "description": "Recipient email address"},
                    "subject": {"type": "string", "description": "Email subject"},
                    "body": {"type": "string", "description": "Email body"},
                    "cc": {"type": "string", "description": "CC recipients"},
                    "bcc": {"type": "string", "description": "BCC recipients"}
                },
                "required": ["to", "subject", "body"]
            }
        },
        
        # Calendar tools
        "create_event": {
            "name": "create_event",
            "description": "Create a calendar event",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Event title"},
                    "start_time": {"type": "string", "description": "Event start time (ISO format)"},
                    "end_time": {"type": "string", "description": "Event end time (ISO format)"},
                    "description": {"type": "string", "description": "Event description"},
                    "attendees": {"type": "array", "items": {"type": "string"}, "description": "Attendee emails"}
                },
                "required": ["title", "start_time", "end_time"]
            }
        }
    }
    
    # Return schemas for requested tools
    function_definitions = []
    for tool in tools:
        if tool in tool_schemas:
            function_definitions.append(tool_schemas[tool])
    
    return function_definitions
