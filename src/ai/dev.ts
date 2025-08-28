import { config } from 'dotenv';
config();

import '@/ai/flows/generate-conversation-title.ts';
import '@/ai/flows/generate-meeting-minutes.ts';
import '@/ai/flows/suggest-participants.ts';