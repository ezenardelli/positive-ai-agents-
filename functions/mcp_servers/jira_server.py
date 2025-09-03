"""
JIRA MCP Server Implementation
Provides JIRA integration tools for creating and managing tickets
"""

import os
import json
import asyncio
import logging
from typing import Dict, List, Any, Optional
from atlassian import Jira
from mcp_auth import get_auth_manager

logger = logging.getLogger(__name__)

class JiraMCPServer:
    """JIRA MCP Server for ticket and project management"""
    
    def __init__(self):
        self.jira_client: Optional[Jira] = None
        self.authenticated = False
        self.base_url = os.getenv("JIRA_URL", "")
        
    async def initialize(self) -> bool:
        """Initialize JIRA client with authentication"""
        try:
            auth_manager = get_auth_manager()
            credentials = auth_manager.get_credentials("jira")
            
            if not credentials or not self.base_url:
                logger.error("❌ No JIRA credentials or URL found")
                return False
            
            # Initialize JIRA client
            self.jira_client = Jira(
                url=self.base_url,
                username=credentials.username,
                password=credentials.password
            )
            
            # Test authentication by getting current user
            user_info = self.jira_client.get_current_user()
            logger.info(f"✅ JIRA authenticated as: {user_info.get('displayName', 'Unknown')}")
            
            self.authenticated = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize JIRA client: {e}")
            return False
    
    async def create_issue(self,
                         project: str,
                         issue_type: str,
                         summary: str,
                         description: str = "",
                         priority: Optional[str] = None,
                         assignee: Optional[str] = None,
                         labels: Optional[List[str]] = None) -> Dict[str, Any]:
        """Create a new JIRA issue"""
        
        if not self.authenticated:
            return {"error": "JIRA client not authenticated"}
        
        try:
            # Prepare issue data
            issue_data = {
                "project": {"key": project},
                "summary": summary,
                "description": description,
                "issuetype": {"name": issue_type}
            }
            
            # Add optional fields
            if priority:
                issue_data["priority"] = {"name": priority}
            
            if assignee:
                issue_data["assignee"] = {"name": assignee}
            
            if labels:
                issue_data["labels"] = labels
            
            # Create issue
            result = self.jira_client.create_issue(fields=issue_data)
            
            # Get the created issue details
            issue_key = result["key"]
            issue_details = self.jira_client.get_issue(issue_key)
            
            response = {
                "success": True,
                "issue": {
                    "key": issue_key,
                    "id": result["id"],
                    "summary": summary,
                    "status": issue_details["fields"]["status"]["name"],
                    "priority": issue_details["fields"]["priority"]["name"] if issue_details["fields"]["priority"] else None,
                    "assignee": issue_details["fields"]["assignee"]["displayName"] if issue_details["fields"]["assignee"] else None,
                    "created": issue_details["fields"]["created"],
                    "url": f"{self.base_url}/browse/{issue_key}"
                }
            }
            
            logger.info(f"✅ Created JIRA issue {issue_key}: {summary}")
            return response
            
        except Exception as e:
            logger.error(f"❌ Error creating JIRA issue: {e}")
            return {"error": str(e)}
    
    async def get_issue(self, issue_key: str) -> Dict[str, Any]:
        """Get JIRA issue details"""
        
        if not self.authenticated:
            return {"error": "JIRA client not authenticated"}
        
        try:
            issue = self.jira_client.get_issue(issue_key)
            fields = issue["fields"]
            
            result = {
                "success": True,
                "issue": {
                    "key": issue_key,
                    "summary": fields["summary"],
                    "description": fields.get("description", ""),
                    "status": fields["status"]["name"],
                    "priority": fields["priority"]["name"] if fields["priority"] else None,
                    "assignee": fields["assignee"]["displayName"] if fields["assignee"] else None,
                    "reporter": fields["reporter"]["displayName"] if fields["reporter"] else None,
                    "created": fields["created"],
                    "updated": fields["updated"],
                    "project": fields["project"]["name"],
                    "issue_type": fields["issuetype"]["name"],
                    "labels": fields.get("labels", []),
                    "url": f"{self.base_url}/browse/{issue_key}"
                }
            }
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error getting JIRA issue: {e}")
            return {"error": str(e)}
    
    async def update_issue(self,
                         issue_key: str,
                         summary: Optional[str] = None,
                         description: Optional[str] = None,
                         assignee: Optional[str] = None,
                         priority: Optional[str] = None) -> Dict[str, Any]:
        """Update JIRA issue"""
        
        if not self.authenticated:
            return {"error": "JIRA client not authenticated"}
        
        try:
            update_data = {}
            
            if summary:
                update_data["summary"] = summary
            if description:
                update_data["description"] = description
            if assignee:
                update_data["assignee"] = {"name": assignee}
            if priority:
                update_data["priority"] = {"name": priority}
            
            if not update_data:
                return {"error": "No fields to update"}
            
            self.jira_client.update_issue(issue_key, fields=update_data)
            
            # Get updated issue
            updated_issue = await self.get_issue(issue_key)
            
            logger.info(f"✅ Updated JIRA issue {issue_key}")
            return updated_issue
            
        except Exception as e:
            logger.error(f"❌ Error updating JIRA issue: {e}")
            return {"error": str(e)}
    
    async def search_issues(self,
                          jql: str,
                          limit: int = 10) -> Dict[str, Any]:
        """Search JIRA issues using JQL"""
        
        if not self.authenticated:
            return {"error": "JIRA client not authenticated"}
        
        try:
            results = self.jira_client.jql(jql, limit=limit)
            
            issues = []
            for issue in results["issues"]:
                fields = issue["fields"]
                issues.append({
                    "key": issue["key"],
                    "summary": fields["summary"],
                    "status": fields["status"]["name"],
                    "priority": fields["priority"]["name"] if fields["priority"] else None,
                    "assignee": fields["assignee"]["displayName"] if fields["assignee"] else None,
                    "created": fields["created"],
                    "project": fields["project"]["name"],
                    "issue_type": fields["issuetype"]["name"],
                    "url": f"{self.base_url}/browse/{issue['key']}"
                })
            
            result = {
                "success": True,
                "issues": issues,
                "total": results["total"],
                "count": len(issues)
            }
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error searching JIRA issues: {e}")
            return {"error": str(e)}
    
    async def add_comment(self,
                        issue_key: str,
                        comment: str) -> Dict[str, Any]:
        """Add comment to JIRA issue"""
        
        if not self.authenticated:
            return {"error": "JIRA client not authenticated"}
        
        try:
            result = self.jira_client.add_comment(issue_key, comment)
            
            response = {
                "success": True,
                "comment": {
                    "id": result["id"],
                    "body": comment,
                    "author": result["author"]["displayName"],
                    "created": result["created"],
                    "updated": result["updated"]
                }
            }
            
            logger.info(f"✅ Added comment to JIRA issue {issue_key}")
            return response
            
        except Exception as e:
            logger.error(f"❌ Error adding comment to JIRA issue: {e}")
            return {"error": str(e)}
    
    async def transition_issue(self,
                             issue_key: str,
                             transition: str) -> Dict[str, Any]:
        """Transition JIRA issue to new status"""
        
        if not self.authenticated:
            return {"error": "JIRA client not authenticated"}
        
        try:
            # Get available transitions
            transitions = self.jira_client.get_issue_transitions(issue_key)
            
            # Find transition ID by name
            transition_id = None
            for t in transitions["transitions"]:
                if t["name"].lower() == transition.lower():
                    transition_id = t["id"]
                    break
            
            if not transition_id:
                available_transitions = [t["name"] for t in transitions["transitions"]]
                return {
                    "error": f"Transition '{transition}' not found. Available transitions: {available_transitions}"
                }
            
            # Perform transition
            self.jira_client.transition_issue(issue_key, transition_id)
            
            # Get updated issue
            updated_issue = await self.get_issue(issue_key)
            
            logger.info(f"✅ Transitioned JIRA issue {issue_key} to {transition}")
            return updated_issue
            
        except Exception as e:
            logger.error(f"❌ Error transitioning JIRA issue: {e}")
            return {"error": str(e)}
    
    async def list_projects(self) -> Dict[str, Any]:
        """List JIRA projects"""
        
        if not self.authenticated:
            return {"error": "JIRA client not authenticated"}
        
        try:
            projects = self.jira_client.get_all_projects()
            
            project_list = []
            for project in projects:
                project_list.append({
                    "key": project["key"],
                    "name": project["name"],
                    "project_type": project.get("projectTypeKey", "unknown"),
                    "lead": project.get("lead", {}).get("displayName", "Unknown"),
                    "url": f"{self.base_url}/browse/{project['key']}"
                })
            
            result = {
                "success": True,
                "projects": project_list,
                "count": len(project_list)
            }
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error listing JIRA projects: {e}")
            return {"error": str(e)}

# Global JIRA server instance
_jira_server = None

async def get_jira_server() -> JiraMCPServer:
    """Get or create the global JIRA server instance"""
    global _jira_server
    if _jira_server is None:
        _jira_server = JiraMCPServer()
        await _jira_server.initialize()
    return _jira_server

# MCP Tool Functions - these are called by the MCP system

async def create_issue(**kwargs) -> Dict[str, Any]:
    """MCP tool function for creating JIRA issues"""
    server = await get_jira_server()
    return await server.create_issue(**kwargs)

async def get_issue(**kwargs) -> Dict[str, Any]:
    """MCP tool function for getting JIRA issue"""
    server = await get_jira_server()
    return await server.get_issue(**kwargs)

async def update_issue(**kwargs) -> Dict[str, Any]:
    """MCP tool function for updating JIRA issue"""
    server = await get_jira_server()
    return await server.update_issue(**kwargs)

async def search_issues(**kwargs) -> Dict[str, Any]:
    """MCP tool function for searching JIRA issues"""
    server = await get_jira_server()
    return await server.search_issues(**kwargs)

async def add_comment(**kwargs) -> Dict[str, Any]:
    """MCP tool function for adding JIRA comment"""
    server = await get_jira_server()
    return await server.add_comment(**kwargs)

async def transition_issue(**kwargs) -> Dict[str, Any]:
    """MCP tool function for transitioning JIRA issue"""
    server = await get_jira_server()
    return await server.transition_issue(**kwargs)

async def list_projects(**kwargs) -> Dict[str, Any]:
    """MCP tool function for listing JIRA projects"""
    server = await get_jira_server()
    return await server.list_projects(**kwargs)
