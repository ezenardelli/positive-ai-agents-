"""
Email MCP Server
Handles email sending capabilities for MCP
"""

import os
import asyncio
import logging
import smtplib
from typing import Dict, List, Any, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

try:
    import aiosmtplib
    AIOSMTPLIB_AVAILABLE = True
except ImportError:
    aiosmtplib = None
    AIOSMTPLIB_AVAILABLE = False

try:
    from email_validator import validate_email, EmailNotValidError
    EMAIL_VALIDATOR_AVAILABLE = True
except ImportError:
    validate_email = None
    EmailNotValidError = Exception
    EMAIL_VALIDATOR_AVAILABLE = False

from mcp_auth import get_auth_manager

logger = logging.getLogger(__name__)

class EmailMCPServer:
    """MCP Server for email operations"""
    
    def __init__(self):
        self.smtp_host: Optional[str] = None
        self.smtp_port: int = 587
        self.smtp_username: Optional[str] = None
        self.smtp_password: Optional[str] = None
        self.email_from: Optional[str] = None
        self.authenticated = False
        
    async def initialize(self) -> bool:
        """Initialize email server with configuration"""
        try:
            # Get SMTP configuration from environment or auth manager
            auth_manager = get_auth_manager()
            
            # Try to get from environment first
            self.smtp_host = os.getenv("SMTP_SERVER", "smtp.gmail.com")
            self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
            self.smtp_username = os.getenv("SMTP_USERNAME")
            self.smtp_password = os.getenv("SMTP_PASSWORD")
            self.email_from = os.getenv("EMAIL_FROM", self.smtp_username)
            
            if not all([self.smtp_username, self.smtp_password]):
                logger.warning("⚠️ SMTP credentials not found in environment")
                return False
            
            if not AIOSMTPLIB_AVAILABLE:
                logger.error("❌ aiosmtplib not available - email functionality disabled")
                return False
            
            # Test connection
            try:
                smtp = aiosmtplib.SMTP(hostname=self.smtp_host, port=self.smtp_port)
                await smtp.connect()
                await smtp.starttls()
                await smtp.login(self.smtp_username, self.smtp_password)
                await smtp.quit()
                
                self.authenticated = True
                logger.info(f"✅ Email server authenticated: {self.smtp_username}")
                return True
                
            except Exception as e:
                logger.error(f"❌ Email authentication failed: {e}")
                return False
            
        except Exception as e:
            logger.error(f"❌ Error initializing email server: {e}")
            return False
    
    async def send_email(self,
                        to: str,
                        subject: str,
                        body: str,
                        cc: Optional[str] = None,
                        bcc: Optional[str] = None,
                        is_html: bool = False) -> Dict[str, Any]:
        """Send an email"""
        
        if not self.authenticated:
            return {"error": "Email server not authenticated"}
        
        if not AIOSMTPLIB_AVAILABLE:
            return {"error": "Email functionality not available - aiosmtplib required"}
        
        try:
            # Validate email addresses
            if EMAIL_VALIDATOR_AVAILABLE:
                try:
                    validate_email(to)
                except EmailNotValidError as e:
                    return {"error": f"Invalid recipient email: {e}"}
            
            # Create message
            message = MIMEMultipart()
            message["From"] = self.email_from
            message["To"] = to
            message["Subject"] = subject
            
            if cc:
                message["Cc"] = cc
            if bcc:
                message["Bcc"] = bcc
            
            # Add body
            if is_html:
                message.attach(MIMEText(body, "html"))
            else:
                message.attach(MIMEText(body, "plain"))
            
            # Prepare recipient list
            recipients = [to]
            if cc:
                recipients.extend([email.strip() for email in cc.split(",")])
            if bcc:
                recipients.extend([email.strip() for email in bcc.split(",")])
            
            # Send email
            smtp = aiosmtplib.SMTP(hostname=self.smtp_host, port=self.smtp_port)
            await smtp.connect()
            await smtp.starttls()
            await smtp.login(self.smtp_username, self.smtp_password)
            
            await smtp.send_message(message, recipients=recipients)
            await smtp.quit()
            
            result = {
                "success": True,
                "message": {
                    "to": to,
                    "cc": cc,
                    "bcc": bcc,
                    "subject": subject,
                    "body_length": len(body),
                    "is_html": is_html,
                    "sent_at": asyncio.get_event_loop().time()
                }
            }
            
            logger.info(f"✅ Email sent to {to}: {subject}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error sending email: {e}")
            return {"error": str(e)}
    
    async def send_html_email(self,
                            to: str,
                            subject: str,
                            html_body: str,
                            cc: Optional[str] = None,
                            bcc: Optional[str] = None) -> Dict[str, Any]:
        """Send an HTML email"""
        
        return await self.send_email(
            to=to,
            subject=subject,
            body=html_body,
            cc=cc,
            bcc=bcc,
            is_html=True
        )
    
    async def send_email_with_attachment(self,
                                       to: str,
                                       subject: str,
                                       body: str,
                                       attachment_path: str,
                                       attachment_name: Optional[str] = None,
                                       cc: Optional[str] = None,
                                       bcc: Optional[str] = None) -> Dict[str, Any]:
        """Send an email with attachment"""
        
        if not self.authenticated:
            return {"error": "Email server not authenticated"}
        
        if not AIOSMTPLIB_AVAILABLE:
            return {"error": "Email functionality not available - aiosmtplib required"}
        
        try:
            # Create message
            message = MIMEMultipart()
            message["From"] = self.email_from
            message["To"] = to
            message["Subject"] = subject
            
            if cc:
                message["Cc"] = cc
            if bcc:
                message["Bcc"] = bcc
            
            # Add body
            message.attach(MIMEText(body, "plain"))
            
            # Add attachment
            if os.path.exists(attachment_path):
                with open(attachment_path, "rb") as attachment:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment.read())
                
                encoders.encode_base64(part)
                
                filename = attachment_name or os.path.basename(attachment_path)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename= {filename}'
                )
                
                message.attach(part)
            else:
                return {"error": f"Attachment file not found: {attachment_path}"}
            
            # Prepare recipient list
            recipients = [to]
            if cc:
                recipients.extend([email.strip() for email in cc.split(",")])
            if bcc:
                recipients.extend([email.strip() for email in bcc.split(",")])
            
            # Send email
            smtp = aiosmtplib.SMTP(hostname=self.smtp_host, port=self.smtp_port)
            await smtp.connect()
            await smtp.starttls()
            await smtp.login(self.smtp_username, self.smtp_password)
            
            await smtp.send_message(message, recipients=recipients)
            await smtp.quit()
            
            result = {
                "success": True,
                "message": {
                    "to": to,
                    "cc": cc,
                    "bcc": bcc,
                    "subject": subject,
                    "body_length": len(body),
                    "attachment": filename,
                    "sent_at": asyncio.get_event_loop().time()
                }
            }
            
            logger.info(f"✅ Email with attachment sent to {to}: {subject}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error sending email with attachment: {e}")
            return {"error": str(e)}
    
    async def create_draft(self,
                         to: str,
                         subject: str,
                         body: str,
                         cc: Optional[str] = None,
                         bcc: Optional[str] = None) -> Dict[str, Any]:
        """Create an email draft (for services that support it)"""
        
        try:
            # For now, just return the draft content
            # In a full implementation, this would save to email service
            
            draft = {
                "to": to,
                "cc": cc,
                "bcc": bcc,
                "subject": subject,
                "body": body,
                "created_at": asyncio.get_event_loop().time(),
                "status": "draft"
            }
            
            result = {
                "success": True,
                "draft": draft,
                "note": "Draft created locally - implement email service integration for remote storage"
            }
            
            logger.info(f"✅ Email draft created: {subject}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error creating email draft: {e}")
            return {"error": str(e)}

# Global email server instance
_email_server = None

async def get_email_server() -> EmailMCPServer:
    """Get or create the global email server instance"""
    global _email_server
    if _email_server is None:
        _email_server = EmailMCPServer()
        await _email_server.initialize()
    return _email_server

# MCP Tool Functions - these are called by the MCP system

async def send_email(**kwargs) -> Dict[str, Any]:
    """MCP tool function for sending emails"""
    server = await get_email_server()
    return await server.send_email(**kwargs)

async def send_html_email(**kwargs) -> Dict[str, Any]:
    """MCP tool function for sending HTML emails"""
    server = await get_email_server()
    return await server.send_html_email(**kwargs)

async def send_email_with_attachment(**kwargs) -> Dict[str, Any]:
    """MCP tool function for sending emails with attachments"""
    server = await get_email_server()
    return await server.send_email_with_attachment(**kwargs)

async def create_draft(**kwargs) -> Dict[str, Any]:
    """MCP tool function for creating email drafts"""
    server = await get_email_server()
    return await server.create_draft(**kwargs)