#!/usr/bin/env python3
"""
MCP System Setup Script
Automated setup and configuration for the MCP (Model Context Protocol) system
"""

import os
import sys
import json
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MCPSetup:
    """Setup manager for MCP system"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.functions_dir = self.project_root / "functions"
        self.env_file = self.project_root / ".env.local"
        self.env_example = self.project_root / "env.mcp.example"
        
    def run_setup(self):
        """Run complete MCP setup process"""
        logger.info("🚀 Starting MCP System Setup...")
        
        try:
            # Step 1: Check Python environment
            self.check_python_environment()
            
            # Step 2: Install Python dependencies
            self.install_python_dependencies()
            
            # Step 3: Setup environment configuration
            self.setup_environment_config()
            
            # Step 4: Initialize MCP servers
            self.initialize_mcp_servers()
            
            # Step 5: Test MCP system
            self.test_mcp_system()
            
            # Step 6: Provide next steps
            self.show_next_steps()
            
            logger.info("✅ MCP System setup completed successfully!")
            
        except Exception as e:
            logger.error(f"❌ Setup failed: {e}")
            sys.exit(1)
    
    def check_python_environment(self):
        """Check Python version and virtual environment"""
        logger.info("🔍 Checking Python environment...")
        
        # Check Python version
        python_version = sys.version_info
        if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
            raise RuntimeError("Python 3.8+ is required for MCP system")
        
        logger.info(f"✅ Python {python_version.major}.{python_version.minor}.{python_version.micro}")
        
        # Check if in virtual environment
        if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
            logger.warning("⚠️ Not in a virtual environment. Consider using venv or conda.")
        else:
            logger.info("✅ Virtual environment detected")
    
    def install_python_dependencies(self):
        """Install required Python packages"""
        logger.info("📦 Installing Python dependencies...")
        
        requirements_file = self.functions_dir / "requirements.txt"
        
        if not requirements_file.exists():
            raise FileNotFoundError(f"Requirements file not found: {requirements_file}")
        
        try:
            # Install requirements
            subprocess.run([
                sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
            ], check=True, cwd=self.functions_dir)
            
            logger.info("✅ Python dependencies installed successfully")
            
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Failed to install Python dependencies: {e}")
    
    def setup_environment_config(self):
        """Setup environment configuration"""
        logger.info("⚙️ Setting up environment configuration...")
        
        # Check if .env.local already exists
        if self.env_file.exists():
            response = input(f"📄 {self.env_file} already exists. Overwrite? (y/N): ")
            if response.lower() != 'y':
                logger.info("Skipping environment setup")
                return
        
        # Copy example file if it exists
        if self.env_example.exists():
            with open(self.env_example, 'r') as src:
                content = src.read()
            
            with open(self.env_file, 'w') as dst:
                dst.write(content)
            
            logger.info(f"✅ Environment template created: {self.env_file}")
            logger.info(f"📝 Please edit {self.env_file} with your API keys and credentials")
        else:
            logger.warning(f"⚠️ Environment example file not found: {self.env_example}")
    
    def initialize_mcp_servers(self):
        """Initialize and test MCP servers"""
        logger.info("🔧 Initializing MCP servers...")
        
        # Test import of MCP modules
        sys.path.insert(0, str(self.functions_dir))
        
        try:
            # Test basic imports
            import mcp_client
            import mcp_auth
            import mcp_servers
            import mcp_dispatcher
            
            logger.info("✅ MCP modules imported successfully")
            
        except ImportError as e:
            logger.error(f"❌ Failed to import MCP modules: {e}")
            raise
    
    def test_mcp_system(self):
        """Test MCP system functionality"""
        logger.info("🧪 Testing MCP system...")
        
        try:
            # Add functions directory to path
            sys.path.insert(0, str(self.functions_dir))
            
            # Test MCP auth manager
            from mcp_auth import get_auth_manager
            
            auth_manager = get_auth_manager()
            status = auth_manager.get_credential_status()
            
            logger.info("🔐 Credential Status:")
            for service, info in status.items():
                if info["available"]:
                    logger.info(f"  ✅ {service}: Configured")
                else:
                    logger.info(f"  ⚠️ {service}: Not configured")
            
            # Test MCP dispatcher
            import asyncio
            from mcp_dispatcher import get_mcp_dispatcher
            
            async def test_dispatcher():
                dispatcher = await get_mcp_dispatcher()
                tools = dispatcher.get_available_tools()
                logger.info(f"🔧 Available tools: {len(tools)}")
                
                categories = dispatcher.get_tools_by_category()
                for category, tool_list in categories.items():
                    if tool_list:
                        logger.info(f"  📁 {category}: {len(tool_list)} tools")
            
            asyncio.run(test_dispatcher())
            
            logger.info("✅ MCP system test completed")
            
        except Exception as e:
            logger.warning(f"⚠️ MCP system test failed (this is normal if credentials aren't configured): {e}")
    
    def show_next_steps(self):
        """Show next steps to the user"""
        logger.info("📋 Next Steps:")
        logger.info("1. 📝 Edit .env.local with your API keys and credentials")
        logger.info("2. 🔑 Configure at least one service (GitHub, JIRA, or Google Drive)")
        logger.info("3. 🚀 Deploy to Firebase Functions:")
        logger.info("   cd functions && firebase deploy --only functions")
        logger.info("4. 🧪 Test the system through the web interface")
        logger.info("")
        logger.info("📚 Configuration Guide:")
        logger.info("• GitHub: https://github.com/settings/tokens")
        logger.info("• JIRA: https://id.atlassian.com/manage-profile/security/api-tokens")
        logger.info("• Google: https://console.cloud.google.com/apis/credentials")
        logger.info("• SerpAPI: https://serpapi.com/users/sign_up")
        logger.info("")
        logger.info("🔧 For detailed setup instructions, see: docs/mcp-setup.md")

def main():
    """Main setup entry point"""
    setup = MCPSetup()
    setup.run_setup()

if __name__ == "__main__":
    main()
