# 🔧 MCP System Setup Guide

Complete setup guide for the Model Context Protocol (MCP) system in Positive AI Agents Hub.

## 📋 Overview

The MCP system enables AI agents to execute real tools and interact with external services:

- 🐙 **GitHub**: Create issues, manage repositories
- 🎫 **JIRA**: Create and manage tickets
- 📁 **Google Drive**: Create and manage documents
- 🌐 **Web Search**: Real-time web searches
- 📧 **Email**: Send emails and attachments
- 📅 **Calendar**: Manage events (coming soon)

## 🚀 Quick Setup

### 1. Run Automated Setup

```bash
# Navigate to project root
cd positive-ai-agents-

# Run setup script
python setup_mcp.py
```

### 2. Configure Credentials

Edit `.env.local` with your API keys:

```bash
# Copy the example file
cp env.mcp.example .env.local

# Edit with your credentials
nano .env.local
```

### 3. Deploy to Firebase

```bash
cd functions
firebase deploy --only functions
```

## 🔑 Service Configuration

### GitHub Integration

1. **Create Personal Access Token**:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo`, `issues`, `pull_requests`, `contents`
   - Copy the token

2. **Configure in .env.local**:
   ```bash
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Available Tools**:
   - `create_issue`: Create GitHub issues
   - `get_repository`: Get repo information
   - `list_issues`: List repository issues
   - `get_file_contents`: Read file contents
   - `create_file`: Create new files
   - `search_repositories`: Search GitHub repos

### JIRA Integration

1. **Create API Token**:
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Copy the token

2. **Configure in .env.local**:
   ```bash
   JIRA_URL=https://your-company.atlassian.net
   JIRA_USERNAME=your-email@positiveit.com.ar
   JIRA_API_TOKEN=ATATxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Available Tools**:
   - `create_jira_issue`: Create JIRA tickets
   - `get_issue`: Get ticket details
   - `update_issue`: Update tickets
   - `search_issues`: Search tickets with JQL
   - `add_comment`: Add comments
   - `transition_issue`: Change ticket status
   - `list_projects`: List JIRA projects

### Google Workspace Integration

#### Option A: Service Account (Recommended)

1. **Create Service Account**:
   - Go to https://console.cloud.google.com/apis/credentials
   - Create new Service Account
   - Download JSON credentials file
   - Enable Google Drive, Docs, and Sheets APIs

2. **Configure in .env.local**:
   ```bash
   GOOGLE_DRIVE_CREDENTIALS_PATH=/path/to/service-account-key.json
   ```

#### Option B: OAuth (Development)

1. **Create OAuth Client**:
   - Go to https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID
   - Configure authorized redirect URIs

2. **Configure in .env.local**:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
   GOOGLE_REFRESH_TOKEN=1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Available Tools**:
   - `create_document`: Create Google Docs
   - `create_spreadsheet`: Create Google Sheets
   - `read_document`: Read document content
   - `update_document`: Update documents
   - `list_files`: List Drive files
   - `share_file`: Share files with users

### Web Search Integration

1. **Get SerpAPI Key** (Optional but recommended):
   - Go to https://serpapi.com/users/sign_up
   - Get your API key from dashboard

2. **Configure in .env.local**:
   ```bash
   SERP_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SEARCH_ENGINE=google
   ```

3. **Available Tools**:
   - `web_search`: Search the web
   - `news_search`: Search for news
   - `get_page_content`: Get webpage content
   - `get_page_summary`: Summarize webpages

### Email Integration

1. **Configure SMTP** (Gmail example):
   - Enable 2FA on your Gmail account
   - Generate App Password: https://myaccount.google.com/apppasswords

2. **Configure in .env.local**:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@positiveit.com.ar
   SMTP_PASSWORD=your-app-password
   EMAIL_FROM=noreply@positiveit.com.ar
   ```

3. **Available Tools**:
   - `send_email`: Send text emails
   - `send_html_email`: Send HTML emails
   - `send_email_with_attachment`: Send with files
   - `create_draft`: Create email drafts

## 🔧 Agent Tool Configuration

### Per-Agent Tool Assignment

Tools are automatically assigned to agents based on their role:

#### PosiAgent (General Assistant)
```javascript
tools: [
  "web_search", "news_search", "get_page_content",
  "search_files", "read_document", "list_files", 
  "list_events", "create_event", "send_email"
]
```

#### MinutaMaker (Meeting Minutes)
```javascript
tools: [
  "create_document", "update_document", "read_document",
  "create_spreadsheet", "share_file", "upload_file",
  "create_event", "send_invitation", "send_email",
  "send_email_with_attachment"
]
```

#### JiraAssistant (Project Management)
```javascript
tools: [
  "create_jira_issue", "update_issue", "get_issue", 
  "search_issues", "add_comment", "assign_issue",
  "transition_issue", "create_project", "list_projects",
  "create_epic", "read_document", "create_document"
]
```

## 🧪 Testing the System

### 1. Check MCP Status

```bash
# Test MCP system
curl -X GET "https://your-project.cloudfunctions.net/get_mcp_status" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### 2. Test Individual Tools

Use the chat interface to test tools:

```
# Test web search
"Search for the latest news about AI"

# Test GitHub
"Create an issue in my repository called 'Test Issue'"

# Test JIRA  
"Create a new story in project ABC with title 'Test Story'"

# Test Google Drive
"Create a document called 'Test Doc' with some sample content"

# Test Email
"Send an email to test@example.com with subject 'Test' and message 'Hello'"
```

### 3. Monitor Logs

```bash
# View Firebase function logs
firebase functions:log --only chat_with_agent,get_mcp_status
```

## 🚨 Troubleshooting

### Common Issues

#### 1. **Authentication Errors**

```bash
# Check credentials status
curl -X GET "https://your-project.cloudfunctions.net/get_mcp_status"
```

**Solutions**:
- Verify API keys in `.env.local`
- Check token permissions/scopes
- Ensure services are enabled

#### 2. **Import Errors**

```
ModuleNotFoundError: No module named 'mcp_client'
```

**Solutions**:
- Run: `pip install -r functions/requirements.txt`
- Check Python version (3.8+ required)
- Verify virtual environment

#### 3. **Function Call Not Detected**

**Solutions**:
- Check function definitions in `mcp_servers.py`
- Verify tool names match exactly
- Enable function calling in Gemini model

#### 4. **Tool Execution Timeout**

**Solutions**:
- Increase Firebase function timeout
- Optimize tool parameters
- Check external API rate limits

### Debug Mode

Enable detailed logging:

```bash
# In .env.local
MCP_LOG_LEVEL=DEBUG
DEBUG=true
```

## 📈 Performance Optimization

### 1. **Caching**

- Implement credential caching
- Cache frequently accessed data
- Use connection pooling

### 2. **Parallel Execution**

- Tools execute in parallel when possible
- Batch operations for efficiency
- Async/await throughout

### 3. **Rate Limiting**

- Respect API rate limits
- Implement exponential backoff
- Queue requests when needed

## 🔒 Security Best Practices

### 1. **Credential Management**

- Use service accounts for production
- Rotate API keys regularly
- Store credentials securely

### 2. **Access Control**

- Restrict tool access per agent
- Validate user permissions
- Log all tool executions

### 3. **Input Validation**

- Sanitize all inputs
- Validate parameters
- Prevent injection attacks

## 🚀 Deployment

### Production Deployment

```bash
# 1. Set production environment variables
firebase functions:config:set \
  github.token="YOUR_GITHUB_TOKEN" \
  jira.token="YOUR_JIRA_TOKEN"

# 2. Deploy functions
firebase deploy --only functions --project production

# 3. Verify deployment
firebase functions:log --project production
```

### Staging Environment

```bash
# Deploy to staging
firebase deploy --only functions --project staging

# Test with staging data
# Configure separate API keys for staging
```

## 📝 Adding New Tools

### 1. Create Server Implementation

```python
# functions/mcp_servers/new_service_server.py
class NewServiceMCPServer:
    async def my_new_tool(self, param1: str) -> Dict[str, Any]:
        # Implementation
        return {"success": True, "result": "..."}

async def my_new_tool(**kwargs) -> Dict[str, Any]:
    server = await get_new_service_server()
    return await server.my_new_tool(**kwargs)
```

### 2. Register in Dispatcher

```python
# functions/mcp_dispatcher.py
from mcp_servers.new_service_server import my_new_tool

# Add to tool_mapping
"my_new_tool": my_new_tool,
```

### 3. Add Function Definition

```python
# functions/mcp_servers.py
"my_new_tool": {
    "name": "my_new_tool",
    "description": "Description of the tool",
    "parameters": {
        "type": "object",
        "properties": {
            "param1": {"type": "string", "description": "Parameter description"}
        },
        "required": ["param1"]
    }
}
```

### 4. Assign to Agents

```python
# functions/mcp_servers.py
agent_tool_mapping = {
    "posiAgent": [..., "my_new_tool"],
}
```

## 📊 Monitoring

### Key Metrics

- Tool execution success rate
- Response times
- Error frequencies
- API quota usage

### Logging

```python
# All tool executions are logged with:
logger.info(f"🔧 Executing {tool_name} with parameters: {parameters}")
logger.info(f"✅ Tool {tool_name} executed successfully in {execution_time:.2f}s")
```

### Alerts

Set up Firebase monitoring for:
- Function errors
- High latency
- Rate limit hits
- Authentication failures

---

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review Firebase function logs
3. Test individual components
4. Check API service status
5. Contact the development team

## 📚 Additional Resources

- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Google AI API Documentation](https://ai.google.dev/docs)
- [Gemini Function Calling Guide](https://ai.google.dev/docs/function_calling)
