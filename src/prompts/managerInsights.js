/**
 * Prompt: Manager / RBH Weekly Dashboard Insights
 * v1 — Progcap SFA
 */

/**
 * @param {Object} ctx
 * @param {string} ctx.managerName
 * @param {string} ctx.role               RBH | CLUSTER_MANAGER
 * @param {number} ctx.totalRMs
 * @param {number} ctx.activeRMs
 * @param {number} ctx.totalLeads
 * @param {number} ctx.stuckLeads
 * @param {number} ctx.urgentLeads
 * @param {number} ctx.expiringInWeek
 * @param {string[]} ctx.stuckDealers    Top 3 stuck dealer names
 */
export const buildManagerInsightsPrompt = (ctx) => {
  return `You are a senior business analyst for Progcap SFA, a supply chain finance platform.
Generate a professional weekly portfolio health summary for a ${ctx.role === 'RBH' ? 'Regional Business Head' : 'Cluster Manager'}.
Use only the data provided. Do NOT fabricate numbers or trends.
Respond in JSON with keys: executiveSummary, teamPerformanceHighlights, highRiskCases, pendingAttentionItems, weeklyRecommendations.
Keep it under 300 words. Use professional business language.

MANAGER: ${ctx.managerName || 'Manager'}
ROLE: ${ctx.role || 'RBH'}
TEAM & PORTFOLIO:
- Total RMs in Team: ${ctx.totalRMs ?? 0}
- Active RMs This Week: ${ctx.activeRMs ?? 0}
- Total Leads in Pipeline: ${ctx.totalLeads ?? 0}
- Stuck Deals: ${ctx.stuckLeads ?? 0}
- Urgent / Flagged Leads: ${ctx.urgentLeads ?? 0}
- Sanctions Expiring in 7 Days: ${ctx.expiringInWeek ?? 0}
- Top Stuck Cases: ${ctx.stuckDealers?.join(', ') || 'None'}
- Week Ending: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

Generate the insights JSON now.`;
};
