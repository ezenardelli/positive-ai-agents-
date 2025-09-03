#!/usr/bin/env python3
"""
Positive AI Agents - Deployment Verification Script
Verifies that the entire system is working correctly
"""

import requests
import json
import sys
import os
from datetime import datetime

class DeploymentVerifier:
    def __init__(self):
        self.base_url = "https://us-central1-positive-hub-ai.cloudfunctions.net"
        self.frontend_url = "https://positive-hub-ai.web.app"
        self.results = {
            "frontend": False,
            "backend": False,
            "auth": False,
            "mcp": False,
            "config": {}
        }
    
    def print_header(self):
        print("=" * 80)
        print("🚀 POSITIVE AI AGENTS - DEPLOYMENT VERIFICATION")
        print("=" * 80)
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
    
    def verify_frontend(self):
        """Verify frontend is accessible"""
        print("🌐 Testing Frontend (Next.js)...")
        try:
            response = requests.get(self.frontend_url, timeout=10)
            if response.status_code == 200:
                print(f"✅ Frontend accessible at {self.frontend_url}")
                self.results["frontend"] = True
            else:
                print(f"⚠️ Frontend returned status {response.status_code}")
        except Exception as e:
            print(f"❌ Frontend not accessible: {e}")
        print()
    
    def verify_backend_health(self):
        """Verify backend endpoints are responding"""
        print("🔧 Testing Backend (Firebase Functions)...")
        
        # Test basic endpoint without auth
        test_endpoints = [
            ("get_all_agents", "GET"),
            ("get_available_mcp_tools", "GET"),
            ("get_mcp_status", "GET")
        ]
        
        accessible_endpoints = 0
        for endpoint, method in test_endpoints:
            try:
                url = f"{self.base_url}/{endpoint}"
                response = requests.request(method, url, timeout=10)
                
                if response.status_code in [200, 401]:  # 401 = auth required (expected)
                    print(f"✅ {endpoint}: Endpoint responding")
                    accessible_endpoints += 1
                else:
                    print(f"⚠️ {endpoint}: Status {response.status_code}")
            except Exception as e:
                print(f"❌ {endpoint}: {e}")
        
        if accessible_endpoints == len(test_endpoints):
            print("✅ All backend endpoints are responding")
            self.results["backend"] = True
        else:
            print(f"⚠️ {accessible_endpoints}/{len(test_endpoints)} endpoints responding")
        print()
    
    def check_mcp_configuration(self):
        """Check MCP configuration status"""
        print("🔧 Checking MCP Configuration...")
        
        env_file = ".env.local"
        if not os.path.exists(env_file):
            print(f"❌ Configuration file {env_file} not found")
            return
        
        print(f"✅ Configuration file found: {env_file}")
        
        # Check for key configurations
        required_configs = {
            "GEMINI_API_KEY": "Google AI (Gemini)",
            "GITHUB_TOKEN": "GitHub Integration",
            "JIRA_URL": "JIRA Integration", 
            "GOOGLE_CLIENT_ID": "Google Workspace",
            "SERP_API_KEY": "Web Search (SerpAPI)",
            "SMTP_USERNAME": "Email Integration"
        }
        
        configured_count = 0
        with open(env_file, 'r') as f:
            env_content = f.read()
        
        for key, description in required_configs.items():
            if key in env_content and not f"{key}=xxx" in env_content and not f"{key}=your-" in env_content:
                # Check if it has a real value (not placeholder)
                for line in env_content.split('\n'):
                    if line.startswith(f"{key}=") and not any(placeholder in line for placeholder in ["xxx", "your-", "path/to"]):
                        print(f"✅ {description}: Configured")
                        configured_count += 1
                        self.results["config"][key] = True
                        break
                else:
                    print(f"⚠️ {description}: Not configured (placeholder value)")
                    self.results["config"][key] = False
            else:
                print(f"❌ {description}: Not found")
                self.results["config"][key] = False
        
        print(f"\n📊 Configuration Status: {configured_count}/{len(required_configs)} services configured")
        
        if configured_count >= 2:  # At least Gemini + one other service
            self.results["mcp"] = True
        print()
    
    def show_next_steps(self):
        """Show what needs to be done next"""
        print("📋 NEXT STEPS:")
        print("-" * 40)
        
        if not self.results["frontend"]:
            print("❌ Frontend not accessible - check deployment")
        
        if not self.results["backend"]:
            print("❌ Backend not responding - check Firebase Functions")
        
        if not self.results["mcp"]:
            print("🔑 CONFIGURE API KEYS:")
            print("   1. Edit .env.local with your API keys")
            print("   2. At minimum, configure:")
            print("      • GitHub Token (for repository management)")
            print("      • SerpAPI Key (for web search)")
            print()
            print("🔗 Quick Links:")
            print("   • GitHub Token: https://github.com/settings/tokens")
            print("   • SerpAPI Key: https://serpapi.com/users/sign_up")
            print()
        
        if all([self.results["frontend"], self.results["backend"], self.results["mcp"]]):
            print("🎉 SYSTEM READY!")
            print("   • Frontend: ✅ Available")
            print("   • Backend: ✅ Responding") 
            print("   • MCP: ✅ Configured")
            print()
            print("🚀 You can now:")
            print(f"   1. Visit: {self.frontend_url}")
            print("   2. Log in with your @positiveit.com.ar email")
            print("   3. Test agent conversations with MCP tools")
            print("   4. Use admin panel to manage agents")
        print()
    
    def generate_summary(self):
        """Generate deployment summary"""
        print("📊 DEPLOYMENT SUMMARY:")
        print("-" * 40)
        
        status = "🟢 READY" if all([self.results["frontend"], self.results["backend"]]) else "🟡 NEEDS CONFIGURATION"
        
        print(f"Overall Status: {status}")
        print(f"Frontend: {'✅' if self.results['frontend'] else '❌'}")
        print(f"Backend: {'✅' if self.results['backend'] else '❌'}")
        print(f"MCP Configuration: {'✅' if self.results['mcp'] else '⚠️'}")
        
        configured_services = sum(1 for v in self.results["config"].values() if v)
        total_services = len(self.results["config"])
        print(f"Configured Services: {configured_services}/{total_services}")
        print()
        
        if self.results["frontend"] and self.results["backend"]:
            print("🎯 SYSTEM STATUS: OPERATIONAL")
            print("   The core system is deployed and working.")
            if not self.results["mcp"]:
                print("   Configure API keys to enable MCP tools.")
        else:
            print("⚠️ SYSTEM STATUS: DEPLOYMENT ISSUE")
            print("   Check logs and redeploy if necessary.")
    
    def run_verification(self):
        """Run complete verification"""
        self.print_header()
        self.verify_frontend()
        self.verify_backend_health()
        self.check_mcp_configuration()
        self.show_next_steps()
        self.generate_summary()
        
        return all([self.results["frontend"], self.results["backend"]])

if __name__ == "__main__":
    verifier = DeploymentVerifier()
    success = verifier.run_verification()
    
    if success:
        print("🎉 Deployment verification completed successfully!")
        sys.exit(0)
    else:
        print("⚠️ Deployment verification found issues.")
        sys.exit(1)
