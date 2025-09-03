"""
GitHub MCP Server Implementation
Provides GitHub integration tools for creating issues, managing repositories, etc.
"""

import os
import json
import asyncio
import logging
from typing import Dict, List, Any, Optional
try:
    from github import Github, GithubException
except ImportError:
    # Fallback for when github module is not available
    Github = None
    GithubException = Exception
from mcp_auth import get_auth_manager

logger = logging.getLogger(__name__)

class GitHubMCPServer:
    """GitHub MCP Server for repository and issue management"""
    
    def __init__(self):
        self.github_client: Optional[Github] = None
        self.authenticated = False
        
    async def initialize(self) -> bool:
        """Initialize GitHub client with authentication"""
        try:
            if Github is None:
                logger.error("❌ PyGithub library not available")
                return False
                
            auth_manager = get_auth_manager()
            credentials = auth_manager.get_credentials("github")
            
            if not credentials:
                logger.error("❌ No GitHub credentials found")
                return False
            
            # Initialize GitHub client
            self.github_client = Github(credentials.api_key)
            
            # Test authentication
            user = self.github_client.get_user()
            logger.info(f"✅ GitHub authenticated as: {user.login}")
            
            self.authenticated = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize GitHub client: {e}")
            return False
    
    async def create_issue(self, 
                         repository: str,
                         title: str, 
                         body: str,
                         labels: Optional[List[str]] = None,
                         assignees: Optional[List[str]] = None) -> Dict[str, Any]:
        """Create a new GitHub issue"""
        
        if not self.authenticated:
            return {"error": "GitHub client not authenticated"}
        
        try:
            # Get repository
            repo = self.github_client.get_repo(repository)
            
            # Create issue
            issue = repo.create_issue(
                title=title,
                body=body,
                labels=labels or [],
                assignees=assignees or []
            )
            
            result = {
                "success": True,
                "issue": {
                    "number": issue.number,
                    "title": issue.title,
                    "url": issue.html_url,
                    "state": issue.state,
                    "created_at": issue.created_at.isoformat(),
                    "author": issue.user.login
                }
            }
            
            logger.info(f"✅ Created GitHub issue #{issue.number}: {title}")
            return result
            
        except GithubException as e:
            logger.error(f"❌ GitHub API error: {e}")
            return {"error": f"GitHub API error: {e.data.get('message', str(e))}"}
        except Exception as e:
            logger.error(f"❌ Error creating issue: {e}")
            return {"error": str(e)}
    
    async def get_repository(self, repository: str) -> Dict[str, Any]:
        """Get repository information"""
        
        if not self.authenticated:
            return {"error": "GitHub client not authenticated"}
        
        try:
            repo = self.github_client.get_repo(repository)
            
            result = {
                "success": True,
                "repository": {
                    "name": repo.name,
                    "full_name": repo.full_name,
                    "description": repo.description,
                    "url": repo.html_url,
                    "clone_url": repo.clone_url,
                    "language": repo.language,
                    "stars": repo.stargazers_count,
                    "forks": repo.forks_count,
                    "open_issues": repo.open_issues_count,
                    "created_at": repo.created_at.isoformat(),
                    "updated_at": repo.updated_at.isoformat()
                }
            }
            
            return result
            
        except GithubException as e:
            logger.error(f"❌ GitHub API error: {e}")
            return {"error": f"GitHub API error: {e.data.get('message', str(e))}"}
        except Exception as e:
            logger.error(f"❌ Error getting repository: {e}")
            return {"error": str(e)}
    
    async def list_issues(self, 
                        repository: str,
                        state: str = "open",
                        limit: int = 10) -> Dict[str, Any]:
        """List repository issues"""
        
        if not self.authenticated:
            return {"error": "GitHub client not authenticated"}
        
        try:
            repo = self.github_client.get_repo(repository)
            issues = repo.get_issues(state=state)
            
            issue_list = []
            for i, issue in enumerate(issues):
                if i >= limit:
                    break
                    
                issue_list.append({
                    "number": issue.number,
                    "title": issue.title,
                    "state": issue.state,
                    "url": issue.html_url,
                    "created_at": issue.created_at.isoformat(),
                    "author": issue.user.login,
                    "labels": [label.name for label in issue.labels],
                    "assignees": [assignee.login for assignee in issue.assignees]
                })
            
            result = {
                "success": True,
                "issues": issue_list,
                "count": len(issue_list)
            }
            
            return result
            
        except GithubException as e:
            logger.error(f"❌ GitHub API error: {e}")
            return {"error": f"GitHub API error: {e.data.get('message', str(e))}"}
        except Exception as e:
            logger.error(f"❌ Error listing issues: {e}")
            return {"error": str(e)}
    
    async def get_file_contents(self, 
                              repository: str,
                              file_path: str,
                              branch: str = "main") -> Dict[str, Any]:
        """Get file contents from repository"""
        
        if not self.authenticated:
            return {"error": "GitHub client not authenticated"}
        
        try:
            repo = self.github_client.get_repo(repository)
            file_content = repo.get_contents(file_path, ref=branch)
            
            result = {
                "success": True,
                "file": {
                    "path": file_content.path,
                    "name": file_content.name,
                    "size": file_content.size,
                    "content": file_content.decoded_content.decode('utf-8'),
                    "sha": file_content.sha,
                    "url": file_content.html_url
                }
            }
            
            return result
            
        except GithubException as e:
            logger.error(f"❌ GitHub API error: {e}")
            return {"error": f"GitHub API error: {e.data.get('message', str(e))}"}
        except Exception as e:
            logger.error(f"❌ Error getting file contents: {e}")
            return {"error": str(e)}
    
    async def create_file(self,
                        repository: str,
                        file_path: str,
                        content: str,
                        commit_message: str,
                        branch: str = "main") -> Dict[str, Any]:
        """Create a new file in repository"""
        
        if not self.authenticated:
            return {"error": "GitHub client not authenticated"}
        
        try:
            repo = self.github_client.get_repo(repository)
            
            result = repo.create_file(
                path=file_path,
                message=commit_message,
                content=content,
                branch=branch
            )
            
            response = {
                "success": True,
                "file": {
                    "path": file_path,
                    "sha": result['content'].sha,
                    "url": result['content'].html_url,
                    "commit": {
                        "sha": result['commit'].sha,
                        "message": commit_message,
                        "url": result['commit'].html_url
                    }
                }
            }
            
            logger.info(f"✅ Created file {file_path} in {repository}")
            return response
            
        except GithubException as e:
            logger.error(f"❌ GitHub API error: {e}")
            return {"error": f"GitHub API error: {e.data.get('message', str(e))}"}
        except Exception as e:
            logger.error(f"❌ Error creating file: {e}")
            return {"error": str(e)}
    
    async def search_repositories(self, 
                                query: str,
                                limit: int = 10) -> Dict[str, Any]:
        """Search GitHub repositories"""
        
        if not self.authenticated:
            return {"error": "GitHub client not authenticated"}
        
        try:
            repositories = self.github_client.search_repositories(query=query)
            
            repo_list = []
            for i, repo in enumerate(repositories):
                if i >= limit:
                    break
                    
                repo_list.append({
                    "name": repo.name,
                    "full_name": repo.full_name,
                    "description": repo.description,
                    "url": repo.html_url,
                    "language": repo.language,
                    "stars": repo.stargazers_count,
                    "forks": repo.forks_count,
                    "updated_at": repo.updated_at.isoformat()
                })
            
            result = {
                "success": True,
                "repositories": repo_list,
                "count": len(repo_list)
            }
            
            return result
            
        except GithubException as e:
            logger.error(f"❌ GitHub API error: {e}")
            return {"error": f"GitHub API error: {e.data.get('message', str(e))}"}
        except Exception as e:
            logger.error(f"❌ Error searching repositories: {e}")
            return {"error": str(e)}

# Global GitHub server instance
_github_server = None

async def get_github_server() -> GitHubMCPServer:
    """Get or create the global GitHub server instance"""
    global _github_server
    if _github_server is None:
        _github_server = GitHubMCPServer()
        await _github_server.initialize()
    return _github_server

# MCP Tool Functions - these are called by the MCP system

async def create_issue(**kwargs) -> Dict[str, Any]:
    """MCP tool function for creating GitHub issues"""
    server = await get_github_server()
    return await server.create_issue(**kwargs)

async def get_repository(**kwargs) -> Dict[str, Any]:
    """MCP tool function for getting repository info"""
    server = await get_github_server()
    return await server.get_repository(**kwargs)

async def list_issues(**kwargs) -> Dict[str, Any]:
    """MCP tool function for listing issues"""
    server = await get_github_server()
    return await server.list_issues(**kwargs)

async def get_file_contents(**kwargs) -> Dict[str, Any]:
    """MCP tool function for getting file contents"""
    server = await get_github_server()
    return await server.get_file_contents(**kwargs)

async def create_file(**kwargs) -> Dict[str, Any]:
    """MCP tool function for creating files"""
    server = await get_github_server()
    return await server.create_file(**kwargs)

async def search_repositories(**kwargs) -> Dict[str, Any]:
    """MCP tool function for searching repositories"""
    server = await get_github_server()
    return await server.search_repositories(**kwargs)
