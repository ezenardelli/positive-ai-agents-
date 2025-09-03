"""
MCP (Model Context Protocol) Client Implementation
Handles connection and communication with MCP servers
"""

import asyncio
import json
import logging
import os
import subprocess
import uuid
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ToolCall:
    """Represents a function call to be executed"""
    id: str
    name: str
    parameters: Dict[str, Any]
    
@dataclass
class ToolResult:
    """Represents the result of a tool execution"""
    success: bool
    content: Any
    error: Optional[str] = None
    tool_name: Optional[str] = None
    execution_time: Optional[float] = None

@dataclass
class MCPServer:
    """Configuration for an MCP server"""
    id: str
    name: str
    command: str
    args: List[str]
    env: Dict[str, str]
    tools: List[str]
    description: str
    enabled: bool = True

class MCPClient:
    """Main MCP Client for managing server connections and tool execution"""
    
    def __init__(self):
        self.servers: Dict[str, MCPServer] = {}
        self.processes: Dict[str, subprocess.Popen] = {}
        self.tool_to_server: Dict[str, str] = {}
        self.initialized = False
        
    async def initialize(self, server_configs: Dict[str, Dict]) -> bool:
        """Initialize MCP client with server configurations"""
        try:
            logger.info("🚀 Initializing MCP Client...")
            
            # Load server configurations
            for server_id, config in server_configs.items():
                server = MCPServer(
                    id=server_id,
                    name=config.get('name', server_id),
                    command=config['command'],
                    args=config.get('args', []),
                    env=config.get('env', {}),
                    tools=config.get('tools', []),
                    description=config.get('description', ''),
                    enabled=config.get('enabled', True)
                )
                
                if server.enabled:
                    self.servers[server_id] = server
                    # Map tools to their server
                    for tool in server.tools:
                        self.tool_to_server[tool] = server_id
                    
                    logger.info(f"✅ Loaded server: {server.name} ({len(server.tools)} tools)")
            
            self.initialized = True
            logger.info(f"🎉 MCP Client initialized with {len(self.servers)} servers")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize MCP Client: {e}")
            return False
    
    def get_available_tools(self) -> Dict[str, Dict]:
        """Get all available tools from all servers"""
        tools = {}
        for server_id, server in self.servers.items():
            for tool_name in server.tools:
                tools[tool_name] = {
                    'server': server_id,
                    'server_name': server.name,
                    'description': f"Tool from {server.name}"
                }
        return tools
    
    def get_server_for_tool(self, tool_name: str) -> Optional[str]:
        """Get the server ID responsible for a specific tool"""
        return self.tool_to_server.get(tool_name)
    
    async def execute_tool(self, tool_call: ToolCall) -> ToolResult:
        """Execute a tool via its MCP server"""
        import time
        start_time = time.time()
        
        try:
            server_id = self.get_server_for_tool(tool_call.name)
            if not server_id:
                return ToolResult(
                    success=False,
                    content=None,
                    error=f"Tool '{tool_call.name}' not found in any server",
                    tool_name=tool_call.name
                )
            
            server = self.servers[server_id]
            logger.info(f"🔧 Executing {tool_call.name} via {server.name}")
            
            # Execute tool via MCP server
            result = await self._call_mcp_server(server, tool_call)
            
            execution_time = time.time() - start_time
            
            if result.success:
                logger.info(f"✅ Tool {tool_call.name} executed successfully in {execution_time:.2f}s")
            else:
                logger.error(f"❌ Tool {tool_call.name} failed: {result.error}")
            
            result.execution_time = execution_time
            result.tool_name = tool_call.name
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"💥 Exception executing {tool_call.name}: {e}")
            return ToolResult(
                success=False,
                content=None,
                error=str(e),
                tool_name=tool_call.name,
                execution_time=execution_time
            )
    
    async def _call_mcp_server(self, server: MCPServer, tool_call: ToolCall) -> ToolResult:
        """Internal method to call MCP server via dispatcher"""
        try:
            # Use the MCP dispatcher instead of external commands
            from mcp_dispatcher import get_mcp_dispatcher
            
            dispatcher = await get_mcp_dispatcher()
            result = await dispatcher.dispatch_tool(tool_call)
            
            return result
                
        except Exception as e:
            return ToolResult(
                success=False,
                content=None,
                error=str(e)
            )
    
    async def batch_execute(self, tool_calls: List[ToolCall]) -> List[ToolResult]:
        """Execute multiple tools in batch"""
        logger.info(f"🔄 Batch executing {len(tool_calls)} tools")
        
        tasks = [self.execute_tool(call) for call in tool_calls]
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
    
    def get_tool_schema(self, tool_name: str) -> Optional[Dict]:
        """Get the schema definition for a tool (for function calling)"""
        # This would be extended to query the actual MCP server for schema
        # For now, return basic schema
        server_id = self.get_server_for_tool(tool_name)
        if not server_id:
            return None
            
        return {
            "name": tool_name,
            "description": f"Execute {tool_name} tool",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    
    def get_all_tool_schemas(self) -> List[Dict]:
        """Get schemas for all available tools"""
        schemas = []
        for tool_name in self.tool_to_server.keys():
            schema = self.get_tool_schema(tool_name)
            if schema:
                schemas.append(schema)
        return schemas
    
    async def health_check(self) -> Dict[str, bool]:
        """Check health of all MCP servers"""
        health_status = {}
        
        for server_id, server in self.servers.items():
            try:
                # Simple health check - try to execute a test command
                process = await asyncio.create_subprocess_exec(
                    server.command, '--version',
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                await asyncio.wait_for(process.communicate(), timeout=5.0)
                health_status[server_id] = process.returncode == 0
            except:
                health_status[server_id] = False
                
        return health_status
    
    async def cleanup(self):
        """Cleanup resources and close connections"""
        logger.info("🧹 Cleaning up MCP Client...")
        
        for process in self.processes.values():
            if process.poll() is None:  # Still running
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), timeout=5.0)
                except asyncio.TimeoutError:
                    process.kill()
        
        self.processes.clear()
        logger.info("✅ MCP Client cleanup completed")

# Global MCP client instance
_mcp_client = None

async def get_mcp_client() -> MCPClient:
    """Get or create the global MCP client instance"""
    global _mcp_client
    if _mcp_client is None:
        _mcp_client = MCPClient()
    return _mcp_client

async def initialize_mcp_system(server_configs: Dict[str, Dict]) -> bool:
    """Initialize the MCP system with server configurations"""
    client = await get_mcp_client()
    return await client.initialize(server_configs)
