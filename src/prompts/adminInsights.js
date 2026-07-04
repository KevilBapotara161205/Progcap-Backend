/**
 * Prompt: Admin Platform-Level Insights
 * v1 — Progcap SFA
 */

/**
 * @param {Object} ctx
 * @param {number} ctx.totalActiveUsers
 * @param {number} ctx.totalLeads
 * @param {number} ctx.stuckLeads
 * @param {number} ctx.totalAnchors
 * @param {number} ctx.totalDealers
 * @param {number} ctx.pendingKyc
 * @param {number} ctx.failedSyncs
 * @param {number} ctx.activeRMs
 */
export const buildAdminInsightsPrompt = (ctx) => {
  return `You are a senior platform analytics AI for Progcap SFA.
Generate a professional platform health summary for a Super Admin.
Use only the data provided. Do NOT fabricate trends or numbers.
Respond in JSON with keys: systemHealthSummary, activeUserInsights, pipelineHealth, anchorDealerGrowth, kycCompletionStatus, operationalAlerts, strategicRecommendations.
Keep it under 300 words. Use professional executive language.

PLATFORM SNAPSHOT:
- Total Active Users: ${ctx.totalActiveUsers ?? 0}
- Active RMs Today: ${ctx.activeRMs ?? 0}
- Total Leads in System: ${ctx.totalLeads ?? 0}
- Stuck Deals: ${ctx.stuckLeads ?? 0}
- Total Anchors Onboarded: ${ctx.totalAnchors ?? 0}
- Total Dealers in Platform: ${ctx.totalDealers ?? 0}
- Pending KYC Reviews: ${ctx.pendingKyc ?? 0}
- Failed Sync Operations: ${ctx.failedSyncs ?? 0}
- Report Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

Generate the platform insights JSON now.`;
};
