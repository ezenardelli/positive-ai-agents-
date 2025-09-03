#!/usr/bin/env python3
"""
MCP System Status Check
Quick status verification for the MCP system
"""

import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

# Add functions directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MCPStatusChecker:
    """Quick status checker for MCP system"""
    
    def __init__(self):
        self.status = {
            "timestamp": datetime.now().isoformat(),
            "system": {},
            "credentials": {},
            "servers": {},
            "tools": {},
            "overall_status": "unknown"
        }
    
    async def check_system_status(self):
        """Check overall MCP system status"""
        logger.info("🔍 Checking MCP System Status...")
        
        # Check system components
        await self.check_imports()
        await self.check_credentials()
        await self.check_servers()
        await self.check_tools()
        
        # Determine overall status
        self.determine_overall_status()
        
        # Print status report
        self.print_status_report()
        
        return self.status
    
    async def check_imports(self):
        """Check if all MCP modules can be imported"""
        try:
            import mcp_client
            import mcp_auth
            import mcp_servers
            import mcp_dispatcher
            import mcp_function_calling
            import mcp_tool_executor
            
            self.status["system"]["imports"] = {
                "status": "ok",
                "modules": [
                    "mcp_client", "mcp_auth", "mcp_servers", 
                    "mcp_dispatcher", "mcp_function_calling", "mcp_tool_executor"
                ]
            }
            
        except ImportError as e:
            self.status["system"]["imports"] = {
                "status": "error",
                "error": str(e)
            }
    
    async def check_credentials(self):
        """Check authentication status for all services"""
        try:
            from mcp_auth import get_auth_manager
            
            auth_manager = get_auth_manager()
            credential_status = auth_manager.get_credential_status()
            
            configured_services = []
            missing_services = []
            
            for service, info in credential_status.items():
                if info["available"]:
                    configured_services.append(service)
                else:
                    missing_services.append(service)
            
            self.status["credentials"] = {
                "configured": configured_services,
                "missing": missing_services,
                "total_services": len(credential_status),
                "configured_count": len(configured_services)
            }
            
        except Exception as e:
            self.status["credentials"] = {
                "status": "error",
                "error": str(e)
            }
    
    async def check_servers(self):
        """Check status of individual MCP servers"""
        servers = {}
        
        # GitHub Server
        try:
            from mcp_servers.github_server import get_github_server
            server = await get_github_server()
            servers["github"] = {
                "status": "ok" if server.authenticated else "not_configured",
                "authenticated": server.authenticated
            }
        except Exception as e:
            servers["github"] = {"status": "error", "error": str(e)}
        
        # JIRA Server
        try:
            from mcp_servers.jira_server import get_jira_server
            server = await get_jira_server()
            servers["jira"] = {
                "status": "ok" if server.authenticated else "not_configured",
                "authenticated": server.authenticated
            }
        except Exception as e:
            servers["jira"] = {"status": "error", "error": str(e)}
        
        # Google Drive Server
        try:
            from mcp_servers.google_drive_server import get_gdrive_server
            server = await get_gdrive_server()
            servers["google_drive"] = {
                "status": "ok" if server.authenticated else "not_configured",
                "authenticated": server.authenticated
            }
        except Exception as e:
            servers["google_drive"] = {"status": "error", "error": str(e)}
        
        # Web Search Server
        try:
            from mcp_servers.web_search_server import get_web_search_server
            server = await get_web_search_server()
            servers["web_search"] = {
                "status": "ok" if server.authenticated else "limited",
                "authenticated": server.authenticated
            }
        except Exception as e:
            servers["web_search"] = {"status": "error", "error": str(e)}
        
        # Email Server
        try:
            from mcp_servers.email_server import get_email_server
            server = await get_email_server()
            servers["email"] = {
                "status": "ok" if server.authenticated else "not_configured",
                "authenticated": server.authenticated
            }
        except Exception as e:
            servers["email"] = {"status": "error", "error": str(e)}
        
        self.status["servers"] = servers
    
    async def check_tools(self):
        """Check available tools and categories"""
        try:
            from mcp_dispatcher import get_mcp_dispatcher
            from mcp_servers import get_tools_for_agent
            
            dispatcher = await get_mcp_dispatcher()
            
            # Get all available tools
            all_tools = dispatcher.get_available_tools()
            categories = dispatcher.get_tools_by_category()
            
            # Get tools per agent
            agent_tools = {}
            for agent_id in ["posiAgent", "minutaMaker", "jiraAssistant"]:
                agent_tools[agent_id] = get_tools_for_agent(agent_id)
            
            self.status["tools"] = {
                "total_tools": len(all_tools),
                "categories": {cat: len(tools) for cat, tools in categories.items() if tools},
                "agent_tools": {agent: len(tools) for agent, tools in agent_tools.items()}
            }
            
        except Exception as e:
            self.status["tools"] = {
                "status": "error",
                "error": str(e)
            }
    
    def determine_overall_status(self):
        """Determine overall system status"""
        issues = []
        
        # Check imports
        if self.status["system"].get("imports", {}).get("status") != "ok":
            issues.append("Module import issues")
        
        # Check if any services are configured
        configured_count = self.status["credentials"].get("configured_count", 0)
        if configured_count == 0:
            issues.append("No services configured")
        
        # Check server errors
        server_errors = 0
        for server, info in self.status["servers"].items():
            if info.get("status") == "error":
                server_errors += 1
        
        if server_errors > 0:
            issues.append(f"{server_errors} server errors")
        
        # Check tools
        total_tools = self.status["tools"].get("total_tools", 0)
        if total_tools == 0:
            issues.append("No tools available")
        
        # Determine status
        if len(issues) == 0:
            if configured_count >= 2:  # At least 2 services configured
                self.status["overall_status"] = "excellent"
            else:
                self.status["overall_status"] = "good"
        elif len(issues) <= 2 and configured_count > 0:
            self.status["overall_status"] = "partial"
        else:
            self.status["overall_status"] = "needs_setup"
        
        self.status["issues"] = issues
    
    def print_status_report(self):
        """Print formatted status report"""
        print("\n" + "=" * 60)
        print("🤖 POSITIVE AI AGENTS - MCP SYSTEM STATUS")
        print("=" * 60)
        
        # Overall Status
        status_emoji = {
            "excellent": "🟢",
            "good": "🟡", 
            "partial": "🟠",
            "needs_setup": "🔴",
            "unknown": "⚪"
        }
        
        status = self.status["overall_status"]
        print(f"Overall Status: {status_emoji.get(status, '⚪')} {status.upper()}")
        
        if self.status.get("issues"):
            print(f"Issues: {', '.join(self.status['issues'])}")
        
        print()
        
        # System Components
        print("📦 SYSTEM COMPONENTS")
        print("-" * 20)
        imports = self.status["system"].get("imports", {})
        if imports.get("status") == "ok":
            print("✅ All MCP modules imported successfully")
        else:
            print(f"❌ Import error: {imports.get('error', 'Unknown')}")
        
        print()
        
        # Credentials
        print("🔐 AUTHENTICATION")
        print("-" * 18)
        creds = self.status["credentials"]
        if isinstance(creds, dict) and "configured" in creds:
            print(f"📊 Services: {creds['configured_count']}/{creds['total_services']} configured")
            
            if creds["configured"]:
                print("✅ Configured services:")
                for service in creds["configured"]:
                    print(f"   • {service}")
            
            if creds["missing"]:
                print("⚠️ Missing credentials:")
                for service in creds["missing"]:
                    print(f"   • {service}")
        else:
            print(f"❌ Credential check failed: {creds.get('error', 'Unknown')}")
        
        print()
        
        # Servers
        print("🖥️ MCP SERVERS")
        print("-" * 14)
        for server_name, server_info in self.status["servers"].items():
            status_icon = {
                "ok": "✅",
                "not_configured": "⚠️",
                "limited": "🟡",
                "error": "❌"
            }.get(server_info.get("status"), "❓")
            
            print(f"{status_icon} {server_name}: {server_info.get('status', 'unknown')}")
            
            if server_info.get("error"):
                print(f"   Error: {server_info['error']}")
        
        print()
        
        # Tools
        print("🔧 AVAILABLE TOOLS")
        print("-" * 17)
        tools = self.status["tools"]
        if isinstance(tools, dict) and "total_tools" in tools:
            print(f"📊 Total tools: {tools['total_tools']}")
            
            if "categories" in tools:
                print("📁 By category:")
                for category, count in tools["categories"].items():
                    print(f"   • {category}: {count} tools")
            
            if "agent_tools" in tools:
                print("🤖 By agent:")
                for agent, count in tools["agent_tools"].items():
                    print(f"   • {agent}: {count} tools")
        else:
            print(f"❌ Tools check failed: {tools.get('error', 'Unknown')}")
        
        print()
        
        # Recommendations
        print("💡 RECOMMENDATIONS")
        print("-" * 18)
        
        if status == "excellent":
            print("🎉 System is fully operational!")
            print("   • All major services configured")
            print("   • Ready for production use")
        elif status == "good":
            print("👍 System is functional!")
            print("   • Consider configuring more services")
            print("   • Test tool execution with agents")
        elif status == "partial":
            print("⚠️ System needs attention:")
            for issue in self.status.get("issues", []):
                print(f"   • Fix: {issue}")
            print("   • Configure missing services")
        else:
            print("🔧 System setup required:")
            print("   • Run: python setup_mcp.py")
            print("   • Configure API keys in .env.local")
            print("   • Test with: python test_mcp.py")
        
        print("\n" + "=" * 60)
        print(f"📅 Status checked at: {self.status['timestamp']}")
        print("=" * 60)

async def main():
    """Main status check entry point"""
    checker = MCPStatusChecker()
    status = await checker.check_system_status()
    
    # Return status for programmatic use
    return status

if __name__ == "__main__":
    asyncio.run(main())
