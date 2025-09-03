"""
MCP Authentication and Credentials Management
Handles API keys, OAuth tokens, and credentials for MCP servers
"""

import os
import json
import logging
import base64
from typing import Dict, Any, Optional, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import hashlib

logger = logging.getLogger(__name__)

@dataclass
class Credentials:
    """Base credentials class"""
    service: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    
    def is_expired(self) -> bool:
        """Check if credentials are expired"""
        if self.expires_at is None:
            return False
        return datetime.now() >= self.expires_at

@dataclass
class APIKeyCredentials(Credentials):
    """API Key credentials"""
    api_key: str = ""
    
    def get_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.api_key}"}

@dataclass
class OAuthCredentials(Credentials):
    """OAuth credentials"""
    access_token: str = ""
    refresh_token: Optional[str] = None
    token_type: str = "Bearer"
    scope: Optional[str] = None
    
    def get_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        return {"Authorization": f"{self.token_type} {self.access_token}"}

@dataclass
class BasicAuthCredentials(Credentials):
    """Basic authentication credentials"""
    username: str = ""
    password: str = ""
    
    def get_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        auth_string = f"{self.username}:{self.password}"
        encoded = base64.b64encode(auth_string.encode()).decode()
        return {"Authorization": f"Basic {encoded}"}

class MCPAuthManager:
    """Manages authentication and credentials for MCP servers"""
    
    def __init__(self):
        self.credentials_cache: Dict[str, Credentials] = {}
        self.env_mapping = self._load_env_mapping()
    
    def _load_env_mapping(self) -> Dict[str, Dict[str, str]]:
        """Load environment variable mapping for different services"""
        return {
            "github": {
                "api_key": "GITHUB_TOKEN",
                "api_url": "GITHUB_API_URL"
            },
            "google_drive": {
                "credentials_path": "GOOGLE_DRIVE_CREDENTIALS_PATH",
                "client_id": "GOOGLE_CLIENT_ID",
                "client_secret": "GOOGLE_CLIENT_SECRET",
                "refresh_token": "GOOGLE_REFRESH_TOKEN"
            },
            "jira": {
                "api_key": "JIRA_API_TOKEN",
                "username": "JIRA_USERNAME",
                "url": "JIRA_URL"
            },
            "slack": {
                "bot_token": "SLACK_BOT_TOKEN",
                "app_token": "SLACK_APP_TOKEN",
                "user_token": "SLACK_USER_TOKEN"
            },
            "linear": {
                "api_key": "LINEAR_API_KEY"
            },
            "notion": {
                "api_key": "NOTION_API_KEY"
            }
        }
    
    def get_credentials(self, service: str) -> Optional[Credentials]:
        """Get credentials for a specific service"""
        try:
            # Check cache first
            if service in self.credentials_cache:
                creds = self.credentials_cache[service]
                if not creds.is_expired():
                    return creds
                else:
                    logger.warning(f"⚠️ Cached credentials for {service} are expired")
            
            # Load from environment
            creds = self._load_credentials_from_env(service)
            if creds:
                self.credentials_cache[service] = creds
                logger.info(f"✅ Loaded credentials for {service}")
                return creds
            
            logger.warning(f"⚠️ No credentials found for service: {service}")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting credentials for {service}: {e}")
            return None
    
    def _load_credentials_from_env(self, service: str) -> Optional[Credentials]:
        """Load credentials from environment variables"""
        if service not in self.env_mapping:
            logger.warning(f"⚠️ No environment mapping for service: {service}")
            return None
        
        env_vars = self.env_mapping[service]
        
        try:
            if service == "github":
                api_key = os.getenv(env_vars["api_key"])
                if api_key:
                    return APIKeyCredentials(
                        service=service,
                        api_key=api_key,
                        created_at=datetime.now()
                    )
            
            elif service == "google_drive":
                # Try OAuth first
                client_id = os.getenv(env_vars.get("client_id"))
                client_secret = os.getenv(env_vars.get("client_secret"))
                refresh_token = os.getenv(env_vars.get("refresh_token"))
                
                if client_id and client_secret and refresh_token:
                    # Would need to implement OAuth refresh logic
                    return OAuthCredentials(
                        service=service,
                        access_token="",  # Would be refreshed
                        refresh_token=refresh_token,
                        created_at=datetime.now(),
                        expires_at=datetime.now() + timedelta(hours=1)
                    )
                
                # Fallback to service account JSON
                creds_path = os.getenv(env_vars.get("credentials_path"))
                if creds_path and os.path.exists(creds_path):
                    # Return path for service account authentication
                    return APIKeyCredentials(
                        service=service,
                        api_key=creds_path,  # Path to credentials file
                        created_at=datetime.now()
                    )
            
            elif service == "jira":
                username = os.getenv(env_vars.get("username"))
                api_token = os.getenv(env_vars.get("api_key"))
                
                if username and api_token:
                    return BasicAuthCredentials(
                        service=service,
                        username=username,
                        password=api_token,
                        created_at=datetime.now()
                    )
            
            elif service == "slack":
                bot_token = os.getenv(env_vars.get("bot_token"))
                if bot_token:
                    return APIKeyCredentials(
                        service=service,
                        api_key=bot_token,
                        created_at=datetime.now()
                    )
            
            elif service in ["linear", "notion"]:
                api_key = os.getenv(env_vars.get("api_key"))
                if api_key:
                    return APIKeyCredentials(
                        service=service,
                        api_key=api_key,
                        created_at=datetime.now()
                    )
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error loading credentials for {service}: {e}")
            return None
    
    def get_environment_for_server(self, service: str) -> Dict[str, str]:
        """Get environment variables for MCP server"""
        creds = self.get_credentials(service)
        if not creds:
            return {}
        
        env = {}
        
        try:
            if service == "github" and isinstance(creds, APIKeyCredentials):
                env["GITHUB_TOKEN"] = creds.api_key
            
            elif service == "google_drive":
                if isinstance(creds, APIKeyCredentials):
                    # Service account path
                    env["GOOGLE_APPLICATION_CREDENTIALS"] = creds.api_key
                elif isinstance(creds, OAuthCredentials):
                    env["GOOGLE_ACCESS_TOKEN"] = creds.access_token
                    if creds.refresh_token:
                        env["GOOGLE_REFRESH_TOKEN"] = creds.refresh_token
            
            elif service == "jira" and isinstance(creds, BasicAuthCredentials):
                env["JIRA_USERNAME"] = creds.username
                env["JIRA_API_TOKEN"] = creds.password
                env["JIRA_URL"] = os.getenv("JIRA_URL", "")
            
            elif service == "slack" and isinstance(creds, APIKeyCredentials):
                env["SLACK_BOT_TOKEN"] = creds.api_key
            
            elif service in ["linear", "notion"] and isinstance(creds, APIKeyCredentials):
                env[f"{service.upper()}_API_KEY"] = creds.api_key
            
        except Exception as e:
            logger.error(f"❌ Error creating environment for {service}: {e}")
        
        return env
    
    def validate_credentials(self, service: str) -> bool:
        """Validate credentials for a service"""
        creds = self.get_credentials(service)
        if not creds:
            return False
        
        if creds.is_expired():
            logger.warning(f"⚠️ Credentials for {service} are expired")
            return False
        
        # Could add actual API validation here
        return True
    
    def refresh_oauth_token(self, service: str) -> bool:
        """Refresh OAuth token for a service"""
        try:
            creds = self.get_credentials(service)
            if not isinstance(creds, OAuthCredentials) or not creds.refresh_token:
                return False
            
            # Implementation would depend on the specific OAuth provider
            logger.info(f"🔄 Refreshing OAuth token for {service}")
            
            # For Google services
            if service == "google_drive":
                return self._refresh_google_token(creds)
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Error refreshing token for {service}: {e}")
            return False
    
    def _refresh_google_token(self, creds: OAuthCredentials) -> bool:
        """Refresh Google OAuth token"""
        try:
            import requests
            
            client_id = os.getenv("GOOGLE_CLIENT_ID")
            client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
            
            if not client_id or not client_secret:
                return False
            
            refresh_data = {
                'client_id': client_id,
                'client_secret': client_secret,
                'refresh_token': creds.refresh_token,
                'grant_type': 'refresh_token'
            }
            
            response = requests.post(
                'https://oauth2.googleapis.com/token',
                data=refresh_data
            )
            
            if response.status_code == 200:
                token_data = response.json()
                creds.access_token = token_data['access_token']
                creds.expires_at = datetime.now() + timedelta(
                    seconds=token_data.get('expires_in', 3600)
                )
                logger.info("✅ Google token refreshed successfully")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Error refreshing Google token: {e}")
            return False
    
    def get_auth_headers(self, service: str) -> Dict[str, str]:
        """Get authentication headers for a service"""
        creds = self.get_credentials(service)
        if not creds:
            return {}
        
        return creds.get_headers()
    
    def clear_cache(self, service: Optional[str] = None):
        """Clear credentials cache"""
        if service:
            self.credentials_cache.pop(service, None)
            logger.info(f"🧹 Cleared credentials cache for {service}")
        else:
            self.credentials_cache.clear()
            logger.info("🧹 Cleared all credentials cache")
    
    def get_credential_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all credentials"""
        status = {}
        
        for service in self.env_mapping.keys():
            creds = self.get_credentials(service)
            if creds:
                status[service] = {
                    "available": True,
                    "type": type(creds).__name__,
                    "expires_at": creds.expires_at.isoformat() if creds.expires_at else None,
                    "is_expired": creds.is_expired(),
                    "created_at": creds.created_at.isoformat()
                }
            else:
                status[service] = {
                    "available": False,
                    "type": None,
                    "expires_at": None,
                    "is_expired": None,
                    "created_at": None
                }
        
        return status

# Global auth manager instance
_auth_manager = None

def get_auth_manager() -> MCPAuthManager:
    """Get or create the global auth manager instance"""
    global _auth_manager
    if _auth_manager is None:
        _auth_manager = MCPAuthManager()
    return _auth_manager
