"""
Web Search MCP Server Implementation
Provides web search capabilities for current information
"""

import os
import json
import asyncio
import logging
import aiohttp
from typing import Dict, List, Any, Optional
from urllib.parse import urlencode
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class WebSearchMCPServer:
    """Web Search MCP Server for internet searches"""
    
    def __init__(self):
        self.serp_api_key = os.getenv("SERP_API_KEY", "")
        self.search_engine = os.getenv("SEARCH_ENGINE", "google")
        self.authenticated = bool(self.serp_api_key)
        
    async def initialize(self) -> bool:
        """Initialize web search server"""
        try:
            if self.serp_api_key:
                logger.info("✅ Web search initialized with SerpAPI")
                self.authenticated = True
            else:
                logger.info("⚠️ Web search initialized without API key (limited functionality)")
                self.authenticated = False
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize web search: {e}")
            return False
    
    async def web_search(self,
                       query: str,
                       num_results: int = 5,
                       country: str = "us",
                       language: str = "en") -> Dict[str, Any]:
        """Perform web search using SerpAPI or fallback method"""
        
        try:
            if self.authenticated and self.serp_api_key:
                return await self._search_with_serpapi(query, num_results, country, language)
            else:
                return await self._search_fallback(query, num_results)
                
        except Exception as e:
            logger.error(f"❌ Error performing web search: {e}")
            return {"error": str(e)}
    
    async def _search_with_serpapi(self,
                                 query: str,
                                 num_results: int,
                                 country: str,
                                 language: str) -> Dict[str, Any]:
        """Search using SerpAPI (paid service)"""
        
        try:
            params = {
                "engine": self.search_engine,
                "q": query,
                "api_key": self.serp_api_key,
                "num": num_results,
                "gl": country,
                "hl": language
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get("https://serpapi.com/search", params=params) as response:
                    data = await response.json()
            
            results = []
            organic_results = data.get("organic_results", [])
            
            for result in organic_results[:num_results]:
                results.append({
                    "title": result.get("title", ""),
                    "link": result.get("link", ""),
                    "snippet": result.get("snippet", ""),
                    "displayed_link": result.get("displayed_link", ""),
                    "position": result.get("position", 0)
                })
            
            # Get answer box if available
            answer_box = data.get("answer_box", {})
            knowledge_graph = data.get("knowledge_graph", {})
            
            return {
                "success": True,
                "results": results,
                "count": len(results),
                "answer_box": answer_box,
                "knowledge_graph": knowledge_graph,
                "search_metadata": {
                    "query": query,
                    "engine": self.search_engine,
                    "total_results": data.get("search_information", {}).get("total_results", 0)
                }
            }
            
        except Exception as e:
            logger.error(f"❌ SerpAPI search error: {e}")
            return {"error": f"SerpAPI error: {str(e)}"}
    
    async def _search_fallback(self, query: str, num_results: int) -> Dict[str, Any]:
        """Fallback search using DuckDuckGo (free)"""
        
        try:
            # Use DuckDuckGo Instant Answer API
            ddg_params = {
                "q": query,
                "format": "json",
                "no_html": "1",
                "skip_disambig": "1"
            }
            
            async with aiohttp.ClientSession() as session:
                # Get instant answer
                async with session.get("https://api.duckduckgo.com/", params=ddg_params) as response:
                    ddg_data = await response.json()
                
                # Also try to get web results (limited)
                search_url = f"https://html.duckduckgo.com/html/?q={query}"
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
                
                async with session.get(search_url, headers=headers) as web_response:
                    html_content = await web_response.text()
            
            # Parse HTML results
            soup = BeautifulSoup(html_content, 'html.parser')
            results = []
            
            # Extract search results
            result_divs = soup.find_all('div', class_='result')[:num_results]
            
            for i, div in enumerate(result_divs):
                title_elem = div.find('a', class_='result__a')
                snippet_elem = div.find('a', class_='result__snippet')
                
                if title_elem:
                    results.append({
                        "title": title_elem.get_text(strip=True),
                        "link": title_elem.get('href', ''),
                        "snippet": snippet_elem.get_text(strip=True) if snippet_elem else "",
                        "displayed_link": title_elem.get('href', ''),
                        "position": i + 1
                    })
            
            # Get instant answer if available
            instant_answer = ""
            if ddg_data.get("AbstractText"):
                instant_answer = ddg_data["AbstractText"]
            elif ddg_data.get("Answer"):
                instant_answer = ddg_data["Answer"]
            
            return {
                "success": True,
                "results": results,
                "count": len(results),
                "instant_answer": instant_answer,
                "search_metadata": {
                    "query": query,
                    "engine": "duckduckgo",
                    "note": "Using free search - limited results"
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Fallback search error: {e}")
            return {"error": f"Search error: {str(e)}"}
    
    async def news_search(self,
                        query: str,
                        num_results: int = 5) -> Dict[str, Any]:
        """Search for news articles"""
        
        try:
            if self.authenticated and self.serp_api_key:
                params = {
                    "engine": "google_news",
                    "q": query,
                    "api_key": self.serp_api_key,
                    "num": num_results
                }
                
                async with aiohttp.ClientSession() as session:
                    async with session.get("https://serpapi.com/search", params=params) as response:
                        data = await response.json()
                
                results = []
                news_results = data.get("news_results", [])
                
                for result in news_results[:num_results]:
                    results.append({
                        "title": result.get("title", ""),
                        "link": result.get("link", ""),
                        "snippet": result.get("snippet", ""),
                        "source": result.get("source", ""),
                        "date": result.get("date", ""),
                        "thumbnail": result.get("thumbnail", "")
                    })
                
                return {
                    "success": True,
                    "results": results,
                    "count": len(results),
                    "search_metadata": {
                        "query": query,
                        "type": "news"
                    }
                }
            else:
                # Fallback to regular search with news query
                news_query = f"{query} news"
                return await self.web_search(news_query, num_results)
                
        except Exception as e:
            logger.error(f"❌ Error performing news search: {e}")
            return {"error": str(e)}
    
    async def get_page_content(self, url: str, max_chars: int = 5000) -> Dict[str, Any]:
        """Get content from a specific webpage"""
        
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=10) as response:
                    if response.status != 200:
                        return {"error": f"HTTP {response.status}: Could not fetch page"}
                    
                    html_content = await response.text()
            
            # Parse HTML and extract text
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get text content
            text = soup.get_text()
            
            # Clean up text
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            # Truncate if too long
            if len(text) > max_chars:
                text = text[:max_chars] + "..."
            
            # Get page metadata
            title = soup.find('title')
            title_text = title.get_text().strip() if title else "No title"
            
            meta_description = soup.find('meta', attrs={'name': 'description'})
            description = meta_description.get('content') if meta_description else ""
            
            return {
                "success": True,
                "page": {
                    "url": url,
                    "title": title_text,
                    "description": description,
                    "content": text,
                    "content_length": len(text)
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting page content: {e}")
            return {"error": str(e)}
    
    async def get_page_summary(self, url: str) -> Dict[str, Any]:
        """Get a summary of webpage content"""
        
        try:
            page_result = await self.get_page_content(url, max_chars=2000)
            
            if not page_result.get("success"):
                return page_result
            
            page = page_result["page"]
            content = page["content"]
            
            # Simple extractive summary (first few sentences)
            sentences = content.split('. ')
            summary_sentences = sentences[:3]  # First 3 sentences
            summary = '. '.join(summary_sentences)
            
            if len(summary) > 500:
                summary = summary[:500] + "..."
            
            return {
                "success": True,
                "summary": {
                    "url": url,
                    "title": page["title"],
                    "summary": summary,
                    "full_content_length": len(content)
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting page summary: {e}")
            return {"error": str(e)}

# Global web search server instance
_web_search_server = None

async def get_web_search_server() -> WebSearchMCPServer:
    """Get or create the global web search server instance"""
    global _web_search_server
    if _web_search_server is None:
        _web_search_server = WebSearchMCPServer()
        await _web_search_server.initialize()
    return _web_search_server

# MCP Tool Functions - these are called by the MCP system

async def web_search(**kwargs) -> Dict[str, Any]:
    """MCP tool function for web search"""
    server = await get_web_search_server()
    return await server.web_search(**kwargs)

async def news_search(**kwargs) -> Dict[str, Any]:
    """MCP tool function for news search"""
    server = await get_web_search_server()
    return await server.news_search(**kwargs)

async def get_page_content(**kwargs) -> Dict[str, Any]:
    """MCP tool function for getting page content"""
    server = await get_web_search_server()
    return await server.get_page_content(**kwargs)

async def get_page_summary(**kwargs) -> Dict[str, Any]:
    """MCP tool function for getting page summary"""
    server = await get_web_search_server()
    return await server.get_page_summary(**kwargs)
