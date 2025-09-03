"""
Google Drive MCP Server Implementation
Provides Google Drive integration for document creation and management
"""

import os
import json
import asyncio
import logging
from typing import Dict, List, Any, Optional
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials
from google.oauth2.credentials import Credentials as OAuthCredentials
from mcp_auth import get_auth_manager

logger = logging.getLogger(__name__)

class GoogleDriveMCPServer:
    """Google Drive MCP Server for document management"""
    
    def __init__(self):
        self.drive_service = None
        self.docs_service = None
        self.sheets_service = None
        self.authenticated = False
        
    async def initialize(self) -> bool:
        """Initialize Google Drive services with authentication"""
        try:
            auth_manager = get_auth_manager()
            credentials = auth_manager.get_credentials("google_drive")
            
            if not credentials:
                logger.error("❌ No Google Drive credentials found")
                return False
            
            # Initialize Google API credentials
            google_creds = None
            
            if credentials.api_key.endswith('.json'):
                # Service account credentials
                google_creds = Credentials.from_service_account_file(
                    credentials.api_key,
                    scopes=[
                        'https://www.googleapis.com/auth/drive',
                        'https://www.googleapis.com/auth/documents',
                        'https://www.googleapis.com/auth/spreadsheets'
                    ]
                )
            else:
                # OAuth credentials (would need implementation)
                logger.error("❌ OAuth credentials not yet implemented")
                return False
            
            # Build Google API services
            self.drive_service = build('drive', 'v3', credentials=google_creds)
            self.docs_service = build('docs', 'v1', credentials=google_creds)
            self.sheets_service = build('sheets', 'v4', credentials=google_creds)
            
            # Test authentication
            about = self.drive_service.about().get(fields="user").execute()
            user_email = about.get('user', {}).get('emailAddress', 'Unknown')
            logger.info(f"✅ Google Drive authenticated as: {user_email}")
            
            self.authenticated = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Google Drive client: {e}")
            return False
    
    async def create_document(self,
                            title: str,
                            content: str = "",
                            folder_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a new Google Docs document"""
        
        if not self.authenticated:
            return {"error": "Google Drive client not authenticated"}
        
        try:
            # Create document
            document = {
                'title': title
            }
            
            doc = self.docs_service.documents().create(body=document).execute()
            document_id = doc.get('documentId')
            
            # Add content if provided
            if content:
                requests = [
                    {
                        'insertText': {
                            'location': {
                                'index': 1,
                            },
                            'text': content
                        }
                    }
                ]
                
                self.docs_service.documents().batchUpdate(
                    documentId=document_id,
                    body={'requests': requests}
                ).execute()
            
            # Move to folder if specified
            if folder_id:
                self.drive_service.files().update(
                    fileId=document_id,
                    addParents=folder_id,
                    fields='id, parents'
                ).execute()
            
            # Get document details
            file_metadata = self.drive_service.files().get(
                fileId=document_id,
                fields='id, name, webViewLink, createdTime, modifiedTime'
            ).execute()
            
            result = {
                "success": True,
                "document": {
                    "id": document_id,
                    "title": title,
                    "url": file_metadata['webViewLink'],
                    "created_time": file_metadata['createdTime'],
                    "modified_time": file_metadata['modifiedTime']
                }
            }
            
            logger.info(f"✅ Created Google Doc: {title}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error creating Google Doc: {e}")
            return {"error": str(e)}
    
    async def create_spreadsheet(self,
                               title: str,
                               folder_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a new Google Sheets spreadsheet"""
        
        if not self.authenticated:
            return {"error": "Google Drive client not authenticated"}
        
        try:
            # Create spreadsheet
            spreadsheet = {
                'properties': {
                    'title': title
                }
            }
            
            sheet = self.sheets_service.spreadsheets().create(
                body=spreadsheet,
                fields='spreadsheetId'
            ).execute()
            
            spreadsheet_id = sheet.get('spreadsheetId')
            
            # Move to folder if specified
            if folder_id:
                self.drive_service.files().update(
                    fileId=spreadsheet_id,
                    addParents=folder_id,
                    fields='id, parents'
                ).execute()
            
            # Get file details
            file_metadata = self.drive_service.files().get(
                fileId=spreadsheet_id,
                fields='id, name, webViewLink, createdTime, modifiedTime'
            ).execute()
            
            result = {
                "success": True,
                "spreadsheet": {
                    "id": spreadsheet_id,
                    "title": title,
                    "url": file_metadata['webViewLink'],
                    "created_time": file_metadata['createdTime'],
                    "modified_time": file_metadata['modifiedTime']
                }
            }
            
            logger.info(f"✅ Created Google Sheet: {title}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error creating Google Sheet: {e}")
            return {"error": str(e)}
    
    async def read_document(self, document_id: str) -> Dict[str, Any]:
        """Read Google Docs document content"""
        
        if not self.authenticated:
            return {"error": "Google Drive client not authenticated"}
        
        try:
            # Get document
            document = self.docs_service.documents().get(documentId=document_id).execute()
            
            # Extract text content
            content = ""
            body = document.get('body', {})
            if 'content' in body:
                for element in body['content']:
                    if 'paragraph' in element:
                        paragraph = element['paragraph']
                        for text_element in paragraph.get('elements', []):
                            if 'textRun' in text_element:
                                content += text_element['textRun']['content']
            
            # Get file metadata
            file_metadata = self.drive_service.files().get(
                fileId=document_id,
                fields='id, name, webViewLink, createdTime, modifiedTime'
            ).execute()
            
            result = {
                "success": True,
                "document": {
                    "id": document_id,
                    "title": document.get('title', 'Untitled'),
                    "content": content.strip(),
                    "url": file_metadata['webViewLink'],
                    "created_time": file_metadata['createdTime'],
                    "modified_time": file_metadata['modifiedTime']
                }
            }
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error reading Google Doc: {e}")
            return {"error": str(e)}
    
    async def update_document(self,
                            document_id: str,
                            content: str,
                            append: bool = False) -> Dict[str, Any]:
        """Update Google Docs document content"""
        
        if not self.authenticated:
            return {"error": "Google Drive client not authenticated"}
        
        try:
            requests = []
            
            if append:
                # Append to end of document
                requests.append({
                    'insertText': {
                        'location': {
                            'index': 1,
                        },
                        'text': content
                    }
                })
            else:
                # Replace all content
                # First, get document to find end index
                document = self.docs_service.documents().get(documentId=document_id).execute()
                end_index = document.get('body', {}).get('content', [{}])[-1].get('endIndex', 1)
                
                # Delete existing content
                if end_index > 1:
                    requests.append({
                        'deleteContentRange': {
                            'range': {
                                'startIndex': 1,
                                'endIndex': end_index - 1
                            }
                        }
                    })
                
                # Insert new content
                requests.append({
                    'insertText': {
                        'location': {
                            'index': 1,
                        },
                        'text': content
                    }
                })
            
            # Execute updates
            self.docs_service.documents().batchUpdate(
                documentId=document_id,
                body={'requests': requests}
            ).execute()
            
            # Get updated document
            updated_doc = await self.read_document(document_id)
            
            logger.info(f"✅ Updated Google Doc: {document_id}")
            return updated_doc
            
        except Exception as e:
            logger.error(f"❌ Error updating Google Doc: {e}")
            return {"error": str(e)}
    
    async def list_files(self,
                       query: str = "",
                       limit: int = 10) -> Dict[str, Any]:
        """List Google Drive files"""
        
        if not self.authenticated:
            return {"error": "Google Drive client not authenticated"}
        
        try:
            # Build query
            search_query = "trashed=false"
            if query:
                search_query += f" and name contains '{query}'"
            
            # Search files
            results = self.drive_service.files().list(
                q=search_query,
                pageSize=limit,
                fields="nextPageToken, files(id, name, mimeType, webViewLink, createdTime, modifiedTime, size)"
            ).execute()
            
            items = results.get('files', [])
            
            files = []
            for item in items:
                files.append({
                    "id": item['id'],
                    "name": item['name'],
                    "type": item['mimeType'],
                    "url": item.get('webViewLink', ''),
                    "created_time": item['createdTime'],
                    "modified_time": item['modifiedTime'],
                    "size": item.get('size', 0)
                })
            
            result = {
                "success": True,
                "files": files,
                "count": len(files)
            }
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error listing Google Drive files: {e}")
            return {"error": str(e)}
    
    async def share_file(self,
                       file_id: str,
                       email: str,
                       role: str = "reader") -> Dict[str, Any]:
        """Share Google Drive file with user"""
        
        if not self.authenticated:
            return {"error": "Google Drive client not authenticated"}
        
        try:
            permission = {
                'type': 'user',
                'role': role,
                'emailAddress': email
            }
            
            self.drive_service.permissions().create(
                fileId=file_id,
                body=permission,
                sendNotificationEmail=True
            ).execute()
            
            result = {
                "success": True,
                "message": f"File shared with {email} as {role}"
            }
            
            logger.info(f"✅ Shared file {file_id} with {email}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error sharing Google Drive file: {e}")
            return {"error": str(e)}

# Global Google Drive server instance
_gdrive_server = None

async def get_gdrive_server() -> GoogleDriveMCPServer:
    """Get or create the global Google Drive server instance"""
    global _gdrive_server
    if _gdrive_server is None:
        _gdrive_server = GoogleDriveMCPServer()
        await _gdrive_server.initialize()
    return _gdrive_server

# MCP Tool Functions - these are called by the MCP system

async def create_document(**kwargs) -> Dict[str, Any]:
    """MCP tool function for creating Google Docs"""
    server = await get_gdrive_server()
    return await server.create_document(**kwargs)

async def create_spreadsheet(**kwargs) -> Dict[str, Any]:
    """MCP tool function for creating Google Sheets"""
    server = await get_gdrive_server()
    return await server.create_spreadsheet(**kwargs)

async def read_document(**kwargs) -> Dict[str, Any]:
    """MCP tool function for reading Google Docs"""
    server = await get_gdrive_server()
    return await server.read_document(**kwargs)

async def update_document(**kwargs) -> Dict[str, Any]:
    """MCP tool function for updating Google Docs"""
    server = await get_gdrive_server()
    return await server.update_document(**kwargs)

async def list_files(**kwargs) -> Dict[str, Any]:
    """MCP tool function for listing files"""
    server = await get_gdrive_server()
    return await server.list_files(**kwargs)

async def share_file(**kwargs) -> Dict[str, Any]:
    """MCP tool function for sharing files"""
    server = await get_gdrive_server()
    return await server.share_file(**kwargs)
