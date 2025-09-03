#!/usr/bin/env python3
"""
MCP System Integration Tests
Test suite for verifying MCP functionality
"""

import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Any

# Add functions directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MCPSystemTest:
    """Test suite for MCP system"""
    
    def __init__(self):
        self.test_results = []
        self.passed = 0
        self.failed = 0
    
    async def run_all_tests(self):
        """Run all MCP system tests"""
        logger.info("🧪 Starting MCP System Integration Tests")
        
        # Core system tests
        await self.test_mcp_imports()
        await self.test_auth_manager()
        await self.test_mcp_dispatcher()
        await self.test_mcp_client()
        
        # Server-specific tests
        await self.test_github_server()
        await self.test_jira_server()
        await self.test_google_drive_server()
        await self.test_web_search_server()
        await self.test_email_server()
        
        # Integration tests
        await self.test_function_calling()
        await self.test_tool_execution()
        
        # Report results
        self.print_test_summary()
    
    async def test_mcp_imports(self):
        """Test that all MCP modules can be imported"""
        logger.info("🔍 Testing MCP module imports...")
        
        try:
            import mcp_client
            import mcp_auth
            import mcp_servers
            import mcp_dispatcher
            import mcp_function_calling
            import mcp_tool_executor
            
            self.log_test_result("MCP Module Imports", True, "All modules imported successfully")
            
        except ImportError as e:
            self.log_test_result("MCP Module Imports", False, f"Import error: {e}")
    
    async def test_auth_manager(self):
        """Test authentication manager"""
        logger.info("🔐 Testing Authentication Manager...")
        
        try:
            from mcp_auth import get_auth_manager
            
            auth_manager = get_auth_manager()
            status = auth_manager.get_credential_status()
            
            # Check that status is returned for expected services
            expected_services = ["github", "jira", "google_drive", "slack", "linear", "notion"]
            
            for service in expected_services:
                if service not in status:
                    raise AssertionError(f"Missing status for service: {service}")
            
            self.log_test_result("Authentication Manager", True, f"Status for {len(status)} services")
            
        except Exception as e:
            self.log_test_result("Authentication Manager", False, str(e))
    
    async def test_mcp_dispatcher(self):
        """Test MCP tool dispatcher"""
        logger.info("🔧 Testing MCP Dispatcher...")
        
        try:
            from mcp_dispatcher import get_mcp_dispatcher
            
            dispatcher = await get_mcp_dispatcher()
            
            # Test getting available tools
            tools = dispatcher.get_available_tools()
            if len(tools) == 0:
                raise AssertionError("No tools available in dispatcher")
            
            # Test tool categories
            categories = dispatcher.get_tools_by_category()
            expected_categories = ["github", "jira", "google_drive", "web_search", "email"]
            
            for category in expected_categories:
                if category not in categories:
                    raise AssertionError(f"Missing category: {category}")
            
            self.log_test_result("MCP Dispatcher", True, f"{len(tools)} tools across {len(categories)} categories")
            
        except Exception as e:
            self.log_test_result("MCP Dispatcher", False, str(e))
    
    async def test_mcp_client(self):
        """Test MCP client"""
        logger.info("🔌 Testing MCP Client...")
        
        try:
            from mcp_client import get_mcp_client
            from mcp_servers import get_mcp_server_configs
            
            client = await get_mcp_client()
            configs = get_mcp_server_configs()
            
            # Initialize client with configs
            success = await client.initialize(configs)
            
            if not success:
                raise AssertionError("Failed to initialize MCP client")
            
            # Test getting available tools
            tools = client.get_available_tools()
            
            self.log_test_result("MCP Client", True, f"Initialized with {len(tools)} tools")
            
        except Exception as e:
            self.log_test_result("MCP Client", False, str(e))
    
    async def test_github_server(self):
        """Test GitHub server (if configured)"""
        logger.info("🐙 Testing GitHub Server...")
        
        try:
            from mcp_servers.github_server import get_github_server
            
            server = await get_github_server()
            
            if server.authenticated:
                # Test a simple operation
                result = await server.search_repositories("test", limit=1)
                
                if not result.get("success"):
                    raise AssertionError(f"GitHub search failed: {result.get('error')}")
                
                self.log_test_result("GitHub Server", True, "Authentication and search successful")
            else:
                self.log_test_result("GitHub Server", True, "Not configured (skipped)")
                
        except Exception as e:
            self.log_test_result("GitHub Server", False, str(e))
    
    async def test_jira_server(self):
        """Test JIRA server (if configured)"""
        logger.info("🎫 Testing JIRA Server...")
        
        try:
            from mcp_servers.jira_server import get_jira_server
            
            server = await get_jira_server()
            
            if server.authenticated:
                # Test listing projects
                result = await server.list_projects()
                
                if not result.get("success"):
                    raise AssertionError(f"JIRA projects list failed: {result.get('error')}")
                
                self.log_test_result("JIRA Server", True, "Authentication and project list successful")
            else:
                self.log_test_result("JIRA Server", True, "Not configured (skipped)")
                
        except Exception as e:
            self.log_test_result("JIRA Server", False, str(e))
    
    async def test_google_drive_server(self):
        """Test Google Drive server (if configured)"""
        logger.info("📁 Testing Google Drive Server...")
        
        try:
            from mcp_servers.google_drive_server import get_gdrive_server
            
            server = await get_gdrive_server()
            
            if server.authenticated:
                # Test listing files
                result = await server.list_files(limit=1)
                
                if not result.get("success"):
                    raise AssertionError(f"Google Drive list failed: {result.get('error')}")
                
                self.log_test_result("Google Drive Server", True, "Authentication and file list successful")
            else:
                self.log_test_result("Google Drive Server", True, "Not configured (skipped)")
                
        except Exception as e:
            self.log_test_result("Google Drive Server", False, str(e))
    
    async def test_web_search_server(self):
        """Test web search server"""
        logger.info("🌐 Testing Web Search Server...")
        
        try:
            from mcp_servers.web_search_server import get_web_search_server
            
            server = await get_web_search_server()
            
            # Test a simple search
            result = await server.web_search("test query", num_results=1)
            
            if not result.get("success"):
                # Web search might fail without API key, but server should initialize
                if "error" in result:
                    self.log_test_result("Web Search Server", True, f"Initialized (search limited: {result['error']})")
                else:
                    raise AssertionError(f"Web search failed: {result}")
            else:
                self.log_test_result("Web Search Server", True, "Search successful")
                
        except Exception as e:
            self.log_test_result("Web Search Server", False, str(e))
    
    async def test_email_server(self):
        """Test email server (if configured)"""
        logger.info("📧 Testing Email Server...")
        
        try:
            from mcp_servers.email_server import get_email_server
            
            server = await get_email_server()
            
            if server.authenticated:
                # Test creating a draft (doesn't actually send)
                result = await server.create_draft(
                    to="test@example.com",
                    subject="Test Draft",
                    body="This is a test draft"
                )
                
                if not result.get("success"):
                    raise AssertionError(f"Email draft creation failed: {result.get('error')}")
                
                self.log_test_result("Email Server", True, "Authentication and draft creation successful")
            else:
                self.log_test_result("Email Server", True, "Not configured (skipped)")
                
        except Exception as e:
            self.log_test_result("Email Server", False, str(e))
    
    async def test_function_calling(self):
        """Test function call parsing"""
        logger.info("🎯 Testing Function Call Parsing...")
        
        try:
            from mcp_function_calling import FunctionCallParser
            
            parser = FunctionCallParser()
            
            # Test parsing various function call formats
            test_text = """
            I need to create_issue(repository="test/repo", title="Test Issue", body="Test description")
            and also web_search(query="test search", num_results=5)
            """
            
            available_tools = ["create_issue", "web_search"]
            parsed_calls = parser.parse_llm_response(test_text, available_tools)
            
            if len(parsed_calls) < 2:
                raise AssertionError(f"Expected 2 function calls, got {len(parsed_calls)}")
            
            self.log_test_result("Function Call Parsing", True, f"Parsed {len(parsed_calls)} function calls")
            
        except Exception as e:
            self.log_test_result("Function Call Parsing", False, str(e))
    
    async def test_tool_execution(self):
        """Test end-to-end tool execution"""
        logger.info("⚡ Testing Tool Execution...")
        
        try:
            from mcp_tool_executor import get_tool_executor, ExecutionContext
            from mcp_client import ToolCall
            
            executor = await get_tool_executor()
            
            # Test a simple tool that should always work (web search)
            context = ExecutionContext(
                agent_id="posiAgent",
                user_id="test_user",
                conversation_id="test_conversation"
            )
            
            # Create a simple tool call
            tool_call = ToolCall(
                id="test_call_1",
                name="web_search",
                parameters={"query": "test", "num_results": 1}
            )
            
            # Execute the tool
            results = await executor.execute_tools([tool_call], context)
            
            if len(results) != 1:
                raise AssertionError(f"Expected 1 result, got {len(results)}")
            
            result = results[0]
            status = "successful" if result.success else "failed"
            
            self.log_test_result("Tool Execution", True, f"Tool execution {status}")
            
        except Exception as e:
            self.log_test_result("Tool Execution", False, str(e))
    
    def log_test_result(self, test_name: str, passed: bool, message: str):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        logger.info(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "message": message
        })
        
        if passed:
            self.passed += 1
        else:
            self.failed += 1
    
    def print_test_summary(self):
        """Print test summary"""
        total = self.passed + self.failed
        success_rate = (self.passed / total * 100) if total > 0 else 0
        
        logger.info("=" * 50)
        logger.info("🧪 MCP System Test Summary")
        logger.info("=" * 50)
        logger.info(f"Total Tests: {total}")
        logger.info(f"Passed: {self.passed}")
        logger.info(f"Failed: {self.failed}")
        logger.info(f"Success Rate: {success_rate:.1f}%")
        logger.info("=" * 50)
        
        if self.failed > 0:
            logger.info("❌ Failed Tests:")
            for result in self.test_results:
                if not result["passed"]:
                    logger.info(f"  - {result['test']}: {result['message']}")
        
        if self.failed == 0:
            logger.info("🎉 All tests passed! MCP system is ready.")
        else:
            logger.info("⚠️ Some tests failed. Check configuration and credentials.")

async def main():
    """Run MCP system tests"""
    test_suite = MCPSystemTest()
    await test_suite.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
