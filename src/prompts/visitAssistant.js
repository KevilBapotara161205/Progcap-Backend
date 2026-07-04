/**
 * Prompt: Visit Assistant Preparation
 * v1 — Progcap SFA
 *
 * Generates visit preparation intelligence for the RM before checkout/checkin.
 */

/**
 * @param {Object} ctx
 * @param {string} ctx.merchantName
 * @param {string} ctx.anchorCompany
 * @param {string} ctx.businessType
 * @param {string} ctx.city
 * @param {string} ctx.state
 * @param {number} ctx.expectedValue
 * @param {string} ctx.pipelineStage
 * @param {string} ctx.kycStatus
 * @param {string} ctx.lastVisitDate
 * @param {boolean} ctx.isStuck
 * @param {boolean} ctx.urgencyFlag
 * @param {boolean} ctx.npaFlag
 * @param {boolean} ctx.dpnRiskFlag
 * @param {string} ctx.notes
 * @returns {string} Prompt string
 */
export const buildVisitAssistantPrompt = (ctx) => {
  const valueInLakhs = ctx.expectedValue ? (ctx.expectedValue / 100000).toFixed(1) : 'Unknown';
  const flags = [];
  if (ctx.isStuck) flags.push('Deal is currently STUCK');
  if (ctx.urgencyFlag) flags.push('Marked URGENT');
  if (ctx.npaFlag) flags.push('NPA risk flagged');
  if (ctx.dpnRiskFlag) flags.push('DPN risk flagged');

  return `You are a sales visit assistant for Progcap SFA, a supply chain finance platform.
An RM is about to visit the following merchant.
Generate a structured, actionable preparation guide to help the RM have a successful meeting.
You MUST only use the information provided. Do NOT fabricate or invent any data.
Respond in structured JSON with the following keys: visitObjective, suggestedConversation, requiredDocuments, likelyCustomerQuestions, risks, followUpStrategy.
Keep the response under 300 words. Use plain professional English.

MERCHANT CONTEXT:
- Merchant Name: ${ctx.merchantName || 'Unknown'}
- Anchor Company: ${ctx.anchorCompany || 'Unknown'}
- Business Type: ${ctx.businessType || 'Unknown'}
- Location: ${ctx.city || 'Unknown'}, ${ctx.state || 'Unknown'}
- Expected Loan Value: ₹${valueInLakhs} Lakhs
- Pipeline Stage: ${ctx.pipelineStage || 'Unknown'}
- KYC Status: ${ctx.kycStatus || 'Unknown'}
- Last Visit Date: ${ctx.lastVisitDate || 'No visit recorded'}
- Risk Flags: ${flags.length > 0 ? flags.join('; ') : 'None'}
- Last Visit Notes: ${ctx.notes || 'None available'}

Generate the JSON guide now.`;
};
