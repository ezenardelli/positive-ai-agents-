"""
MCP Tool Dispatcher
Routes tool calls to the appropriate MCP server implementations
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Callable
from mcp_client import ToolCall, ToolResult

# Import all MCP servers
from mcp_servers import (
    # GitHub
    github_create_issue,
    github_get_repository,
    github_list_issues,
    github_get_file_contents,
    github_create_file,
    github_search_repositories,
    
    # JIRA
    jira_create_issue,
    jira_get_issue,
    jira_update_issue,
    jira_search_issues,
    jira_add_comment,
    jira_transition_issue,
    jira_list_projects,
    
    # Google Drive
    gdrive_create_document,
    gdrive_create_spreadsheet,
    gdrive_read_document,
    gdrive_update_document,
    gdrive_list_files,
    gdrive_share_file,
    
    # Web Search
    web_search,
    news_search,
    get_page_content,
    get_page_summary,
    
    # Email
    send_email,
    send_html_email,
    send_email_with_attachment,
    create_draft
)

logger = logging.getLogger(__name__)

class MCPToolDispatcher:
    """Dispatches tool calls to appropriate MCP server functions"""
    
    def __init__(self):
        self.tool_mapping = self._build_tool_mapping()
        self.initialized = False
    
    def _build_tool_mapping(self) -> Dict[str, Callable]:
        """Build mapping of tool names to server functions"""
        return {
            # GitHub tools
            "create_issue": github_create_issue,
            "github_create_issue": github_create_issue,
            "get_repository": github_get_repository,
            "github_get_repository": github_get_repository,
            "list_issues": github_list_issues,
            "github_list_issues": github_list_issues,
            "get_file_contents": github_get_file_contents,
            "github_get_file_contents": github_get_file_contents,
            "create_file": github_create_file,
            "github_create_file": github_create_file,
            "search_repositories": github_search_repositories,
            "github_search_repositories": github_search_repositories,
            
            # JIRA tools - use jira_ prefix to avoid conflicts
            "create_jira_issue": jira_create_issue,
            "jira_create_issue": jira_create_issue,
            "get_issue": jira_get_issue,
            "jira_get_issue": jira_get_issue,
            "update_issue": jira_update_issue,
            "jira_update_issue": jira_update_issue,
            "search_issues": jira_search_issues,
            "jira_search_issues": jira_search_issues,
            "add_comment": jira_add_comment,
            "jira_add_comment": jira_add_comment,
            "transition_issue": jira_transition_issue,
            "jira_transition_issue": jira_transition_issue,
            "list_projects": jira_list_projects,
            "jira_list_projects": jira_list_projects,
            
            # Google Drive tools
            "create_document": gdrive_create_document,
            "gdrive_create_document": gdrive_create_document,
            "create_spreadsheet": gdrive_create_spreadsheet,
            "gdrive_create_spreadsheet": gdrive_create_spreadsheet,
            "read_document": gdrive_read_document,
            "gdrive_read_document": gdrive_read_document,
            "update_document": gdrive_update_document,
            "gdrive_update_document": gdrive_update_document,
            "list_files": gdrive_list_files,
            "gdrive_list_files": gdrive_list_files,
            "search_files": gdrive_list_files,  # Alias
            "share_file": gdrive_share_file,
            "gdrive_share_file": gdrive_share_file,
            
            # Web Search tools
            "web_search": web_search,
            "search_web": web_search,  # Alias
            "news_search": news_search,
            "search_news": news_search,  # Alias
            "get_page_content": get_page_content,
            "fetch_page": get_page_content,  # Alias
            "get_page_summary": get_page_summary,
            "summarize_page": get_page_summary,  # Alias
            
            # Email tools
            "send_email": send_email,
            "email_send": send_email,  # Alias
            "send_html_email": send_html_email,
            "send_email_with_attachment": send_email_with_attachment,
            "email_with_attachment": send_email_with_attachment,  # Alias
            "create_draft": create_draft,
            "create_email_draft": create_draft,  # Alias
            
            # Calendar tools (these would map to Google Calendar when implemented)
            "create_event": self._not_implemented("create_event"),
            "list_events": self._not_implemented("list_events"),
            "get_free_busy": self._not_implemented("get_free_busy"),
        }
    
    def _not_implemented(self, tool_name: str) -> Callable:
        """Return a function that indicates the tool is not yet implemented"""
        async def not_implemented(**kwargs):
            return {
                "error": f"Tool '{tool_name}' is not yet implemented",
                "available_soon": True
            }
        return not_implemented
    
    async def initialize(self) -> bool:
        """Initialize the dispatcher"""
        try:
            logger.info(f"🔧 MCP Tool Dispatcher initialized with {len(self.tool_mapping)} tools")
            self.initialized = True
            return True
        except Exception as e:
            logger.error(f"❌ Failed to initialize MCP Tool Dispatcher: {e}")
            return False
    
    async def dispatch_tool(self, tool_call: ToolCall) -> ToolResult:
        """Dispatch a tool call to the appropriate server function"""
        import time
        start_time = time.time()
        
        try:
            if not self.initialized:
                return ToolResult(
                    success=False,
                    content=None,
                    error="MCP Tool Dispatcher not initialized",
                    tool_name=tool_call.name
                )
            
            # Get the function for this tool
            tool_function = self.tool_mapping.get(tool_call.name)
            
            if not tool_function:
                return ToolResult(
                    success=False,
                    content=None,
                    error=f"Tool '{tool_call.name}' not found. Available tools: {list(self.tool_mapping.keys())}",
                    tool_name=tool_call.name
                )
            
            logger.info(f"🔧 Dispatching tool: {tool_call.name} with parameters: {tool_call.parameters}")
            
            # Call the tool function
            result = await tool_function(**tool_call.parameters)
            
            execution_time = time.time() - start_time
            
            # Check if the result indicates success
            if isinstance(result, dict):
                if result.get("success", True) and "error" not in result:
                    return ToolResult(
                        success=True,
                        content=result,
                        tool_name=tool_call.name,
                        execution_time=execution_time
                    )
                else:
                    return ToolResult(
                        success=False,
                        content=result,
                        error=result.get("error", "Unknown error"),
                        tool_name=tool_call.name,
                        execution_time=execution_time
                    )
            else:
                # Non-dict result, assume success
                return ToolResult(
                    success=True,
                    content=result,
                    tool_name=tool_call.name,
                    execution_time=execution_time
                )
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"💥 Error dispatching tool {tool_call.name}: {e}")
            return ToolResult(
                success=False,
                content=None,
                error=str(e),
                tool_name=tool_call.name,
                execution_time=execution_time
            )
    
    async def dispatch_batch(self, tool_calls: List[ToolCall]) -> List[ToolResult]:
        """Dispatch multiple tool calls in parallel"""
        logger.info(f"🔄 Dispatching {len(tool_calls)} tools in batch")
        
        tasks = [self.dispatch_tool(call) for call in tool_calls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle exceptions in results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append(ToolResult(
                    success=False,
                    content=None,
                    error=str(result),
                    tool_name=tool_calls[i].name
                ))
            else:
                processed_results.append(result)
        
        return processed_results
    
    def get_available_tools(self) -> List[str]:
        """Get list of all available tools"""
        return list(self.tool_mapping.keys())
    
    def get_tool_info(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific tool"""
        if tool_name not in self.tool_mapping:
            return None
        
        # Basic tool info - could be extended with schemas
        return {
            "name": tool_name,
            "available": True,
            "function": self.tool_mapping[tool_name].__name__,
            "module": self.tool_mapping[tool_name].__module__
        }
    
    def get_tools_by_category(self) -> Dict[str, List[str]]:
        """Group tools by category"""
        categories = {
            "github": [],
            "jira": [],
            "google_drive": [],
            "web_search": [],
            "email": [],
            "calendar": [],
            "other": []
        }
        
        for tool_name in self.tool_mapping.keys():
            if "github" in tool_name or tool_name in ["create_issue", "get_repository", "list_issues", "get_file_contents", "create_file", "search_repositories"]:
                categories["github"].append(tool_name)
            elif "jira" in tool_name or tool_name in ["get_issue", "update_issue", "search_issues", "add_comment", "transition_issue", "list_projects"]:
                categories["jira"].append(tool_name)
            elif "gdrive" in tool_name or tool_name in ["create_document", "create_spreadsheet", "read_document", "update_document", "list_files", "share_file", "search_files"]:
                categories["google_drive"].append(tool_name)
            elif "search" in tool_name or tool_name in ["web_search", "news_search", "get_page_content", "get_page_summary", "fetch_page", "summarize_page"]:
                categories["web_search"].append(tool_name)
            elif "email" in tool_name or tool_name in ["send_email", "send_html_email", "send_email_with_attachment", "create_draft"]:
                categories["email"].append(tool_name)
            elif "event" in tool_name or "calendar" in tool_name or tool_name in ["create_event", "list_events", "get_free_busy"]:
                categories["calendar"].append(tool_name)
            else:
                categories["other"].append(tool_name)
        
        return categories

# Global dispatcher instance
_dispatcher = None

async def get_mcp_dispatcher() -> MCPToolDispatcher:
    """Get or create the global MCP dispatcher instance"""
    global _dispatcher
    if _dispatcher is None:
        _dispatcher = MCPToolDispatcher()
        await _dispatcher.initialize()
    return _dispatcher
