import { config } from 'dotenv';
config();

import '@/ai/flows/generate-conversation-title.ts';
import '@/ai/flows/generate-meeting-minutes.ts';
import '@/ai/flows/suggest-participants.ts';
import '@/ai/flows/process-docx-flow.ts';
import '@/ai/flows/answer-positive-it-questions.ts';
