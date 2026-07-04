/**
 * Prompt: Post-Visit Summary
 * v1 — Progcap SFA
 */

/**
 * @param {Object} ctx
 * @param {string} ctx.merchantName
 * @param {string} ctx.visitDate
 * @param {number} ctx.durationMinutes
 * @param {string} ctx.stage
 * @param {string} ctx.notes             Raw RM visit notes
 * @param {string|null} ctx.followUpDate
 * @param {string[]} ctx.documentsUploaded
 */
export const buildVisitSummaryPrompt = (ctx) => {
  return `You are a professional report writer for Progcap SFA, a supply chain finance platform.
An RM has completed a merchant visit. Convert the raw notes into a structured professional summary.
You MUST only use the information provided. Do NOT add assumptions.
Respond in JSON with keys: professionalSummary, actionItems, pendingTasks, managerSummary, crmNote.
Keep it under 250 words. Use plain professional English.

VISIT DETAILS:
- Merchant: ${ctx.merchantName || 'Unknown'}
- Visit Date: ${ctx.visitDate || 'Today'}
- Duration: ${ctx.durationMinutes ? ctx.durationMinutes + ' minutes' : 'Unknown'}
- Current Pipeline Stage: ${ctx.stage || 'Unknown'}
- Documents Uploaded: ${ctx.documentsUploaded?.length ? ctx.documentsUploaded.join(', ') : 'None'}
- Scheduled Follow-up: ${ctx.followUpDate || 'Not scheduled'}
- Raw Visit Notes: ${ctx.notes || 'No notes provided'}

Generate the structured JSON summary now.`;
};
