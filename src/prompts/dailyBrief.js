/**
 * Prompt: RM Daily Morning Brief
 * v1 — Progcap SFA
 */

/**
 * @param {Object} ctx
 * @param {string} ctx.rmName
 * @param {number} ctx.totalLeads
 * @param {number} ctx.stuckLeads
 * @param {number} ctx.urgentLeads
 * @param {number} ctx.expiringInWeek    Sanctions expiring in 7 days
 * @param {number} ctx.pendingKyc
 * @param {string} ctx.topPriorityDealer
 */
export const buildDailyBriefPrompt = (ctx) => {
  return `You are a professional business assistant for Progcap SFA.
Generate a concise morning briefing for a Relationship Manager starting their workday.
Use only the data provided. Keep it under 200 words. Use bullet points for clarity.
Respond in JSON with keys: greeting, morningHighlights, todayPriorities, importantReminders, suggestedFocusAreas.

RM NAME: ${ctx.rmName || 'RM'}
PORTFOLIO STATUS:
- Total Active Leads: ${ctx.totalLeads ?? 0}
- Stuck Deals: ${ctx.stuckLeads ?? 0}
- Urgent Leads: ${ctx.urgentLeads ?? 0}
- Sanctions Expiring in 7 Days: ${ctx.expiringInWeek ?? 0}
- Pending KYC Documents: ${ctx.pendingKyc ?? 0}
- Top Priority Merchant Today: ${ctx.topPriorityDealer || 'None identified'}
- Today's Date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

Generate the morning brief JSON now.`;
};
