"""
MCP Servers Package
Contains all MCP server implementations for different services
"""

# Import core functions from mcp_servers.py
try:
    import sys
    import os
    # Add the parent directory to the path so we can import mcp_servers.py
    sys.path.append(os.path.dirname(os.path.dirname(__file__)))
    
    from mcp_servers import (
        get_mcp_server_configs,
        get_tools_for_agent,
        get_function_definitions_for_gemini,
        get_available_tools,
        get_tool_to_server_mapping,
        get_server_installation_status
    )
except ImportError as e:
    print(f"Warning: Could not import core MCP functions: {e}")
    # Create placeholder functions
    def get_mcp_server_configs():
        return {}
    def get_tools_for_agent(agent_id):
        return []
    def get_function_definitions_for_gemini(tools):
        return []
    def get_available_tools():
        return []
    def get_tool_to_server_mapping():
        return {}
    def get_server_installation_status():
        return {}

# Import servers with error handling for missing dependencies
try:
    from .github_server import (
        get_github_server,
        create_issue as github_create_issue,
        get_repository as github_get_repository,
        list_issues as github_list_issues,
        get_file_contents as github_get_file_contents,
        create_file as github_create_file,
        search_repositories as github_search_repositories
    )
    GITHUB_AVAILABLE = True
except ImportError as e:
    print(f"Warning: GitHub server not available: {e}")
    get_github_server = None
    github_create_issue = None
    github_get_repository = None
    github_list_issues = None
    github_get_file_contents = None
    github_create_file = None
    github_search_repositories = None
    GITHUB_AVAILABLE = False

try:
    from .jira_server import (
        get_jira_server,
        create_issue as jira_create_issue,
        get_issue as jira_get_issue,
        update_issue as jira_update_issue,
        search_issues as jira_search_issues,
        add_comment as jira_add_comment,
        transition_issue as jira_transition_issue,
        list_projects as jira_list_projects
    )
    JIRA_AVAILABLE = True
except ImportError as e:
    print(f"Warning: JIRA server not available: {e}")
    get_jira_server = None
    jira_create_issue = None
    jira_get_issue = None
    jira_update_issue = None
    jira_search_issues = None
    jira_add_comment = None
    jira_transition_issue = None
    jira_list_projects = None
    JIRA_AVAILABLE = False

try:
    from .google_drive_server import (
        get_gdrive_server,
        create_document as gdrive_create_document,
        create_spreadsheet as gdrive_create_spreadsheet,
        read_document as gdrive_read_document,
        update_document as gdrive_update_document,
        list_files as gdrive_list_files,
        share_file as gdrive_share_file
    )
    GDRIVE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Google Drive server not available: {e}")
    get_gdrive_server = None
    gdrive_create_document = None
    gdrive_create_spreadsheet = None
    gdrive_read_document = None
    gdrive_update_document = None
    gdrive_list_files = None
    gdrive_share_file = None
    GDRIVE_AVAILABLE = False

try:
    from .web_search_server import (
        get_web_search_server,
        web_search,
        news_search,
        get_page_content,
        get_page_summary
    )
    WEB_SEARCH_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Web search server not available: {e}")
    get_web_search_server = None
    web_search = None
    news_search = None
    get_page_content = None
    get_page_summary = None
    WEB_SEARCH_AVAILABLE = False

try:
    from .email_server import (
        get_email_server,
        send_email,
        send_html_email,
        send_email_with_attachment,
        create_draft
    )
    EMAIL_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Email server not available: {e}")
    get_email_server = None
    send_email = None
    send_html_email = None
    send_email_with_attachment = None
    create_draft = None
    EMAIL_AVAILABLE = False

# Export availability flags
__all__ = [
    # Core MCP functions
    'get_mcp_server_configs',
    'get_tools_for_agent',
    'get_function_definitions_for_gemini',
    'get_available_tools',
    'get_tool_to_server_mapping',
    'get_server_installation_status',
    
    # Availability flags
    'GITHUB_AVAILABLE',
    'JIRA_AVAILABLE', 
    'GDRIVE_AVAILABLE',
    'WEB_SEARCH_AVAILABLE',
    'EMAIL_AVAILABLE',
    
    # Server instances
    'get_github_server',
    'get_jira_server',
    'get_gdrive_server',
    'get_web_search_server',
    'get_email_server',
    
    # GitHub tools
    'github_create_issue',
    'github_get_repository',
    'github_list_issues',
    'github_get_file_contents',
    'github_create_file',
    'github_search_repositories',
    
    # JIRA tools
    'jira_create_issue',
    'jira_get_issue',
    'jira_update_issue',
    'jira_search_issues',
    'jira_add_comment',
    'jira_transition_issue',
    'jira_list_projects',
    
    # Google Drive tools
    'gdrive_create_document',
    'gdrive_create_spreadsheet',
    'gdrive_read_document',
    'gdrive_update_document',
    'gdrive_list_files',
    'gdrive_share_file',
    
    # Web search tools
    'web_search',
    'news_search',
    'get_page_content',
    'get_page_summary',
    
    # Email tools
    'send_email',
    'send_html_email',
    'send_email_with_attachment',
    'create_draft'
]