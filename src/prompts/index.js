/**
 * Prompt Registry — Progcap SFA
 * Central export for all versioned prompts.
 * Import from here, never directly from individual prompt files.
 */

export { buildMerchantXrayPrompt } from './merchantXray.js';
export { buildVisitSummaryPrompt } from './visitSummary.js';
export { buildVisitAssistantPrompt } from './visitAssistant.js';
export { buildNbaExplanationPrompt } from './nbaExplanation.js';
export { buildDailyBriefPrompt } from './dailyBrief.js';
export { buildManagerInsightsPrompt } from './managerInsights.js';
export { buildAdminInsightsPrompt } from './adminInsights.js';
