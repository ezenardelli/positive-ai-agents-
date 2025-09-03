"""
Function Calling Parser for MCP Integration
Handles parsing and validation of function calls from LLM responses
"""

import json
import re
import uuid
import logging
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass
from mcp_client import ToolCall, ToolResult

logger = logging.getLogger(__name__)

@dataclass
class ParsedFunctionCall:
    """Represents a parsed function call from LLM"""
    name: str
    arguments: Dict[str, Any]
    raw_text: str
    confidence: float = 1.0

class FunctionCallParser:
    """Parser for extracting and validating function calls from LLM responses"""
    
    def __init__(self):
        # Regex patterns for different function call formats
        self.patterns = {
            # Standard function call: function_name(arg1="value", arg2=123)
            'standard': re.compile(
                r'(\w+)\s*\(\s*([^)]*)\s*\)',
                re.MULTILINE | re.DOTALL
            ),
            
            # XML-style: <function_call name="function_name">{"arg1": "value"}</function_call>
            'xml': re.compile(
                r'<function_call\s+name=["\']([^"\']+)["\']\s*>\s*(\{[^}]*\})\s*</function_call>',
                re.MULTILINE | re.DOTALL
            ),
            
            # JSON-style tool use
            'json_tool': re.compile(
                r'```json\s*\{\s*"tool_use"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"parameters"\s*:\s*(\{[^}]*\})\s*\}\s*\}\s*```',
                re.MULTILINE | re.DOTALL
            ),
            
            # Markdown code block with function call
            'markdown': re.compile(
                r'```(\w+)?\s*(\w+)\s*\(\s*([^)]*)\s*\)\s*```',
                re.MULTILINE | re.DOTALL
            )
        }
    
    def parse_llm_response(self, response: str, available_tools: List[str]) -> List[ParsedFunctionCall]:
        """Parse function calls from LLM response text"""
        function_calls = []
        
        try:
            # Try different parsing strategies
            function_calls.extend(self._parse_xml_style(response, available_tools))
            function_calls.extend(self._parse_json_tool_use(response, available_tools))
            function_calls.extend(self._parse_standard_calls(response, available_tools))
            function_calls.extend(self._parse_markdown_calls(response, available_tools))
            
            # Remove duplicates
            function_calls = self._deduplicate_calls(function_calls)
            
            logger.info(f"📝 Parsed {len(function_calls)} function calls from LLM response")
            return function_calls
            
        except Exception as e:
            logger.error(f"❌ Error parsing function calls: {e}")
            return []
    
    def _parse_xml_style(self, text: str, available_tools: List[str]) -> List[ParsedFunctionCall]:
        """Parse XML-style function calls"""
        calls = []
        matches = self.patterns['xml'].findall(text)
        
        for name, args_json in matches:
            if name in available_tools:
                try:
                    arguments = json.loads(args_json)
                    calls.append(ParsedFunctionCall(
                        name=name,
                        arguments=arguments,
                        raw_text=f'<function_call name="{name}">{args_json}</function_call>',
                        confidence=0.9
                    ))
                except json.JSONDecodeError:
                    logger.warning(f"⚠️ Invalid JSON in XML function call: {args_json}")
        
        return calls
    
    def _parse_json_tool_use(self, text: str, available_tools: List[str]) -> List[ParsedFunctionCall]:
        """Parse JSON tool use format"""
        calls = []
        matches = self.patterns['json_tool'].findall(text)
        
        for name, params_json in matches:
            if name in available_tools:
                try:
                    parameters = json.loads(params_json)
                    calls.append(ParsedFunctionCall(
                        name=name,
                        arguments=parameters,
                        raw_text=f'```json{{"tool_use": {{"name": "{name}", "parameters": {params_json}}}}}```',
                        confidence=0.95
                    ))
                except json.JSONDecodeError:
                    logger.warning(f"⚠️ Invalid JSON in tool use: {params_json}")
        
        return calls
    
    def _parse_standard_calls(self, text: str, available_tools: List[str]) -> List[ParsedFunctionCall]:
        """Parse standard function call syntax"""
        calls = []
        matches = self.patterns['standard'].findall(text)
        
        for name, args_str in matches:
            if name in available_tools:
                try:
                    # Parse arguments string
                    arguments = self._parse_arguments_string(args_str)
                    calls.append(ParsedFunctionCall(
                        name=name,
                        arguments=arguments,
                        raw_text=f'{name}({args_str})',
                        confidence=0.8
                    ))
                except Exception as e:
                    logger.warning(f"⚠️ Error parsing arguments for {name}: {e}")
        
        return calls
    
    def _parse_markdown_calls(self, text: str, available_tools: List[str]) -> List[ParsedFunctionCall]:
        """Parse function calls in markdown code blocks"""
        calls = []
        matches = self.patterns['markdown'].findall(text)
        
        for lang, name, args_str in matches:
            if name in available_tools:
                try:
                    arguments = self._parse_arguments_string(args_str)
                    calls.append(ParsedFunctionCall(
                        name=name,
                        arguments=arguments,
                        raw_text=f'```{lang}\n{name}({args_str})\n```',
                        confidence=0.7
                    ))
                except Exception as e:
                    logger.warning(f"⚠️ Error parsing markdown call for {name}: {e}")
        
        return calls
    
    def _parse_arguments_string(self, args_str: str) -> Dict[str, Any]:
        """Parse argument string into dictionary"""
        if not args_str.strip():
            return {}
        
        # Try to parse as JSON first
        try:
            return json.loads(f'{{{args_str}}}')
        except:
            pass
        
        # Parse key=value pairs
        arguments = {}
        
        # Split by commas, but be careful with quoted strings
        args_parts = self._smart_split(args_str, ',')
        
        for part in args_parts:
            part = part.strip()
            if '=' in part:
                key, value = part.split('=', 1)
                key = key.strip().strip('"\'')
                value = value.strip()
                
                # Parse value
                arguments[key] = self._parse_value(value)
        
        return arguments
    
    def _smart_split(self, text: str, delimiter: str) -> List[str]:
        """Split string by delimiter, respecting quoted strings"""
        parts = []
        current = ""
        in_quotes = False
        quote_char = None
        
        for char in text:
            if char in ['"', "'"] and not in_quotes:
                in_quotes = True
                quote_char = char
                current += char
            elif char == quote_char and in_quotes:
                in_quotes = False
                quote_char = None
                current += char
            elif char == delimiter and not in_quotes:
                parts.append(current)
                current = ""
            else:
                current += char
        
        if current:
            parts.append(current)
        
        return parts
    
    def _parse_value(self, value_str: str) -> Any:
        """Parse a string value to appropriate Python type"""
        value_str = value_str.strip()
        
        # Handle quoted strings
        if (value_str.startswith('"') and value_str.endswith('"')) or \
           (value_str.startswith("'") and value_str.endswith("'")):
            return value_str[1:-1]
        
        # Handle boolean
        if value_str.lower() == 'true':
            return True
        elif value_str.lower() == 'false':
            return False
        
        # Handle None/null
        if value_str.lower() in ['none', 'null']:
            return None
        
        # Handle numbers
        try:
            if '.' in value_str:
                return float(value_str)
            else:
                return int(value_str)
        except ValueError:
            pass
        
        # Handle JSON objects/arrays
        try:
            return json.loads(value_str)
        except:
            pass
        
        # Return as string
        return value_str
    
    def _deduplicate_calls(self, calls: List[ParsedFunctionCall]) -> List[ParsedFunctionCall]:
        """Remove duplicate function calls, keeping highest confidence"""
        if not calls:
            return []
        
        # Group by name and arguments
        call_groups = {}
        for call in calls:
            key = (call.name, json.dumps(call.arguments, sort_keys=True))
            if key not in call_groups or call.confidence > call_groups[key].confidence:
                call_groups[key] = call
        
        return list(call_groups.values())
    
    def validate_function_call(self, call: ParsedFunctionCall, 
                             tool_schemas: Dict[str, Dict]) -> Tuple[bool, Optional[str]]:
        """Validate a function call against tool schema"""
        if call.name not in tool_schemas:
            return False, f"Tool '{call.name}' not found in available tools"
        
        schema = tool_schemas[call.name]
        
        # Basic validation - can be extended with JSON schema validation
        if 'parameters' in schema:
            required_params = schema['parameters'].get('required', [])
            
            # Check required parameters
            for param in required_params:
                if param not in call.arguments:
                    return False, f"Missing required parameter: {param}"
        
        return True, None
    
    def create_tool_calls(self, parsed_calls: List[ParsedFunctionCall]) -> List[ToolCall]:
        """Convert parsed calls to ToolCall objects"""
        tool_calls = []
        
        for call in parsed_calls:
            tool_call = ToolCall(
                id=f"call_{uuid.uuid4().hex[:8]}",
                name=call.name,
                parameters=call.arguments
            )
            tool_calls.append(tool_call)
        
        return tool_calls

class GeminiFunctionCallHandler:
    """Specialized handler for Google Gemini function calling"""
    
    @staticmethod
    def extract_from_gemini_response(response) -> List[ToolCall]:
        """Extract function calls from Gemini response object"""
        tool_calls = []
        
        try:
            # Handle Gemini's native function calling
            if hasattr(response, 'function_calls') and response.function_calls:
                for fc in response.function_calls:
                    tool_call = ToolCall(
                        id=f"gemini_call_{uuid.uuid4().hex[:8]}",
                        name=fc.name,
                        parameters=dict(fc.args) if hasattr(fc, 'args') else {}
                    )
                    tool_calls.append(tool_call)
            
            # Fallback to text parsing if no native function calls
            elif hasattr(response, 'text') and response.text:
                parser = FunctionCallParser()
                # This would need available_tools list
                parsed_calls = parser.parse_llm_response(response.text, [])
                tool_calls.extend(parser.create_tool_calls(parsed_calls))
                
        except Exception as e:
            logger.error(f"❌ Error extracting Gemini function calls: {e}")
        
        return tool_calls

def format_tool_result_for_llm(result: ToolResult) -> str:
    """Format tool execution result for LLM consumption"""
    if result.success:
        content = result.content
        if isinstance(content, dict):
            content = json.dumps(content, indent=2)
        elif not isinstance(content, str):
            content = str(content)
        
        return f"""🔧 **Tool: {result.tool_name}** (✅ Success - {result.execution_time:.2f}s)

Result:
```
{content}
```"""
    else:
        return f"""🔧 **Tool: {result.tool_name}** (❌ Failed - {result.execution_time:.2f}s)

Error: {result.error}"""

def format_multiple_results_for_llm(results: List[ToolResult]) -> str:
    """Format multiple tool results for LLM"""
    if not results:
        return ""
    
    formatted_results = []
    
    for result in results:
        formatted_results.append(format_tool_result_for_llm(result))
    
    return "\n\n---\n\n".join(formatted_results)
