"""
MCP Tool Executor
Main coordinator for executing tools via MCP servers
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from mcp_client import MCPClient, ToolCall, ToolResult, get_mcp_client, initialize_mcp_system
from mcp_function_calling import FunctionCallParser, GeminiFunctionCallHandler, format_multiple_results_for_llm
from mcp_servers import get_mcp_server_configs, get_tools_for_agent, get_function_definitions_for_gemini
from mcp_auth import get_auth_manager

logger = logging.getLogger(__name__)

@dataclass
class ExecutionContext:
    """Context for tool execution"""
    agent_id: str
    user_id: str
    conversation_id: str
    client_context: Optional[str] = None

class MCPToolExecutor:
    """Main coordinator for MCP tool execution"""
    
    def __init__(self):
        self.mcp_client: Optional[MCPClient] = None
        self.function_parser = FunctionCallParser()
        self.auth_manager = get_auth_manager()
        self.initialized = False
        self.execution_stats = {
            "total_executions": 0,
            "successful_executions": 0,
            "failed_executions": 0,
            "total_execution_time": 0.0
        }
    
    async def initialize(self) -> bool:
        """Initialize the MCP tool executor"""
        try:
            logger.info("🚀 Initializing MCP Tool Executor...")
            
            # Get MCP client
            self.mcp_client = await get_mcp_client()
            
            # Get server configurations
            server_configs = get_mcp_server_configs()
            
            if not server_configs:
                logger.warning("⚠️ No MCP servers configured")
                return False
            
            # Initialize MCP system
            success = await initialize_mcp_system(server_configs)
            
            if success:
                self.initialized = True
                logger.info(f"✅ MCP Tool Executor initialized with {len(server_configs)} servers")
                
                # Log available tools
                tools = self.mcp_client.get_available_tools()
                logger.info(f"📋 Available tools: {len(tools)}")
                for tool_name, info in tools.items():
                    logger.debug(f"  - {tool_name} ({info['server_name']})")
                
                return True
            else:
                logger.error("❌ Failed to initialize MCP system")
                return False
                
        except Exception as e:
            logger.error(f"💥 Exception during MCP initialization: {e}")
            return False
    
    async def process_llm_response(self, 
                                 llm_response: str, 
                                 context: ExecutionContext,
                                 gemini_response=None) -> Tuple[str, List[ToolResult]]:
        """Process LLM response and execute any function calls"""
        
        if not self.initialized:
            logger.warning("⚠️ MCP Tool Executor not initialized")
            return llm_response, []
        
        try:
            # Get available tools for the agent
            available_tools = get_tools_for_agent(context.agent_id)
            if not available_tools:
                logger.debug(f"No tools available for agent: {context.agent_id}")
                return llm_response, []
            
            # Extract function calls
            tool_calls = []
            
            # Try Gemini native function calling first
            if gemini_response:
                tool_calls.extend(GeminiFunctionCallHandler.extract_from_gemini_response(gemini_response))
            
            # Fallback to text parsing
            if not tool_calls:
                parsed_calls = self.function_parser.parse_llm_response(llm_response, available_tools)
                tool_calls.extend(self.function_parser.create_tool_calls(parsed_calls))
            
            if not tool_calls:
                logger.debug("No function calls found in LLM response")
                return llm_response, []
            
            logger.info(f"🔧 Found {len(tool_calls)} function calls to execute")
            
            # Execute tools
            results = await self.execute_tools(tool_calls, context)
            
            # Update stats
            self.execution_stats["total_executions"] += len(tool_calls)
            self.execution_stats["successful_executions"] += sum(1 for r in results if r.success)
            self.execution_stats["failed_executions"] += sum(1 for r in results if not r.success)
            self.execution_stats["total_execution_time"] += sum(r.execution_time or 0 for r in results)
            
            # Format results for LLM
            tool_results_text = format_multiple_results_for_llm(results)
            
            # Combine original response with tool results
            if tool_results_text:
                enhanced_response = f"{llm_response}\n\n{tool_results_text}"
            else:
                enhanced_response = llm_response
            
            return enhanced_response, results
            
        except Exception as e:
            logger.error(f"💥 Error processing LLM response: {e}")
            return llm_response, []
    
    async def execute_tools(self, 
                          tool_calls: List[ToolCall], 
                          context: ExecutionContext) -> List[ToolResult]:
        """Execute a list of tool calls"""
        
        if not self.mcp_client:
            logger.error("❌ MCP client not available")
            return []
        
        results = []
        
        try:
            # Validate tool calls
            validated_calls = []
            available_tools = get_tools_for_agent(context.agent_id)
            
            for call in tool_calls:
                if call.name in available_tools:
                    validated_calls.append(call)
                    logger.info(f"✅ Validated tool call: {call.name}")
                else:
                    logger.warning(f"⚠️ Tool not allowed for agent {context.agent_id}: {call.name}")
                    results.append(ToolResult(
                        success=False,
                        content=None,
                        error=f"Tool '{call.name}' not available for agent '{context.agent_id}'",
                        tool_name=call.name
                    ))
            
            if not validated_calls:
                logger.warning("No valid tool calls to execute")
                return results
            
            # Execute tools (can be parallel or sequential based on dependencies)
            if len(validated_calls) == 1:
                # Single tool execution
                result = await self.mcp_client.execute_tool(validated_calls[0])
                results.append(result)
            else:
                # Batch execution for multiple tools
                batch_results = await self.mcp_client.batch_execute(validated_calls)
                results.extend(batch_results)
            
            # Log execution summary
            successful = sum(1 for r in results if r.success)
            failed = sum(1 for r in results if not r.success)
            total_time = sum(r.execution_time or 0 for r in results)
            
            logger.info(f"📊 Tool execution complete: {successful} success, {failed} failed, {total_time:.2f}s total")
            
            return results
            
        except Exception as e:
            logger.error(f"💥 Error executing tools: {e}")
            # Return error results for all calls
            error_results = []
            for call in tool_calls:
                error_results.append(ToolResult(
                    success=False,
                    content=None,
                    error=str(e),
                    tool_name=call.name
                ))
            return error_results
    
    def get_available_tools_for_agent(self, agent_id: str) -> List[str]:
        """Get list of tools available for a specific agent"""
        return get_tools_for_agent(agent_id)
    
    def get_function_definitions(self, agent_id: str) -> List[Dict[str, Any]]:
        """Get function definitions for Gemini function calling"""
        tools = get_tools_for_agent(agent_id)
        return get_function_definitions_for_gemini(tools)
    
    async def test_tool(self, tool_name: str, parameters: Dict[str, Any]) -> ToolResult:
        """Test a specific tool with given parameters"""
        if not self.mcp_client:
            return ToolResult(
                success=False,
                content=None,
                error="MCP client not initialized",
                tool_name=tool_name
            )
        
        tool_call = ToolCall(
            id=f"test_{int(time.time())}",
            name=tool_name,
            parameters=parameters
        )
        
        return await self.mcp_client.execute_tool(tool_call)
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on MCP system"""
        if not self.mcp_client:
            return {
                "status": "error",
                "message": "MCP client not initialized",
                "servers": {},
                "tools": []
            }
        
        try:
            # Check server health
            server_health = await self.mcp_client.health_check()
            
            # Get available tools
            tools = self.mcp_client.get_available_tools()
            
            # Calculate overall status
            healthy_servers = sum(1 for status in server_health.values() if status)
            total_servers = len(server_health)
            
            status = "healthy" if healthy_servers == total_servers else "partial" if healthy_servers > 0 else "unhealthy"
            
            return {
                "status": status,
                "servers": server_health,
                "tools": list(tools.keys()),
                "stats": self.execution_stats,
                "healthy_servers": f"{healthy_servers}/{total_servers}",
                "total_tools": len(tools)
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "servers": {},
                "tools": []
            }
    
    def get_execution_stats(self) -> Dict[str, Any]:
        """Get execution statistics"""
        stats = self.execution_stats.copy()
        
        if stats["total_executions"] > 0:
            stats["success_rate"] = stats["successful_executions"] / stats["total_executions"]
            stats["average_execution_time"] = stats["total_execution_time"] / stats["total_executions"]
        else:
            stats["success_rate"] = 0.0
            stats["average_execution_time"] = 0.0
        
        return stats
    
    async def cleanup(self):
        """Cleanup MCP resources"""
        if self.mcp_client:
            await self.mcp_client.cleanup()
        
        logger.info("🧹 MCP Tool Executor cleanup completed")

# Global executor instance
_tool_executor = None

async def get_tool_executor() -> MCPToolExecutor:
    """Get or create the global tool executor instance"""
    global _tool_executor
    if _tool_executor is None:
        _tool_executor = MCPToolExecutor()
        await _tool_executor.initialize()
    return _tool_executor

async def execute_agent_tools(llm_response: str, 
                            agent_id: str,
                            user_id: str, 
                            conversation_id: str,
                            client_context: Optional[str] = None,
                            gemini_response=None) -> Tuple[str, List[ToolResult]]:
    """High-level function to execute tools from agent response"""
    
    context = ExecutionContext(
        agent_id=agent_id,
        user_id=user_id,
        conversation_id=conversation_id,
        client_context=client_context
    )
    
    executor = await get_tool_executor()
    return await executor.process_llm_response(llm_response, context, gemini_response)
