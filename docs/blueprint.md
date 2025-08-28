# **App Name**: Positive AI Agent Hub

## Core Features:

- Secure Authentication: Authentication via Google Auth with domain restriction to @positiveit.com.ar.
- Agent Dashboard: A central dashboard to select and interact with different AI agents.
- Navigation Sidebar: Sidebar with navigation for agents and conversation history.
- Client Context Selector: Dropdown menu to select the client context for the Minuta Maker agent.
- Chat Interface: Chat interface for user and model messages, displaying model responses with Markdown rendering and streaming.
- Minuta Maker Agent: AI-powered agent that takes meeting transcripts as input and generates meeting minutes including an executive summary, action items, and topics discussed. It uses the LLM as a tool for summarization and suggestion of contacts to other participants.
- Backend Orchestration: Utilize Firebase Cloud Functions to orchestrate the AI agent, handle authentication, and manage data storage in Firestore.

## Style Guidelines:

- Primary color: HSL 210, 67%, 46% (a shade of blue), converted to hex: #228be6, to convey professionalism and reliability.
- Background color: HSL 210, 20%, 96%, converted to hex: #f1f5f9, for a clean and modern look.
- Accent color: HSL 180, 53%, 45% (a shade of teal), converted to hex: #43c6ac, used sparingly for highlights and active states.
- Font pairing: 'Inter' (sans-serif) for headlines and body text.
- Simple, professional icons from a library like FontAwesome or Material Icons, used to represent different AI agents and actions.
- Clean, modern layout using TailwindCSS, with a fixed sidebar and a main content area for the chat interface.
- Subtle animations for loading states and transitions, providing a polished user experience.