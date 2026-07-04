/**
 * Prompt: Merchant X-Ray Intelligence
 * v1 — Progcap SFA
 *
 * Generates a professional merchant intelligence report for an RM or manager.
 * Context fields are all sourced from existing system data — never fabricated.
 */

/**
 * @param {Object} ctx
 * @param {string} ctx.merchantName
 * @param {string} ctx.anchorCompany
 * @param {string} ctx.businessType       e.g. RETAILER | DISTRIBUTOR
 * @param {string} ctx.city
 * @param {string} ctx.state
 * @param {number} ctx.expectedValue       in INR
 * @param {string} ctx.pipelineStage
 * @param {boolean} ctx.isStuck
 * @param {boolean} ctx.urgencyFlag
 * @param {boolean} ctx.npaFlag
 * @param {boolean} ctx.dpnRiskFlag
 * @param {string|null} ctx.kycStatus
 * @param {string|null} ctx.lastVisitDate
 * @param {string|null} ctx.sanctionExpiryDate
 * @param {string|null} ctx.notes           Previous visit notes / remarks
 * @returns {string} Prompt string
 */
export const buildMerchantXrayPrompt = (ctx) => {
  const valueInLakhs = ctx.expectedValue ? (ctx.expectedValue / 100000).toFixed(1) : 'Unknown';
  const flags = [];
  if (ctx.isStuck) flags.push('Deal is currently STUCK');
  if (ctx.urgencyFlag) flags.push('Marked URGENT by manager');
  if (ctx.npaFlag) flags.push('NPA risk flagged');
  if (ctx.dpnRiskFlag) flags.push('DPN risk flagged');

  return `You are a financial intelligence assistant for Progcap SFA, a supply chain finance platform.
Analyze the following merchant profile and generate a concise professional intelligence report.
You MUST only use the information provided. Do NOT fabricate or invent any data.
If information is unavailable, say "Insufficient information available."
Respond in structured JSON with the following keys: businessSummary, riskAssessment, positiveSignals, potentialConcerns, suggestedConversationPoints, recommendedFollowUp, loanOpportunitySummary.
Keep the total response under 300 words. Use plain professional English. No marketing language.

MERCHANT PROFILE:
- Merchant Name: ${ctx.merchantName || 'Unknown'}
- Anchor Company: ${ctx.anchorCompany || 'Unknown'}
- Business Type: ${ctx.businessType || 'Unknown'}
- Location: ${ctx.city || 'Unknown'}, ${ctx.state || 'Unknown'}
- Expected Loan Value: ₹${valueInLakhs} Lakhs
- Current Pipeline Stage: ${ctx.pipelineStage || 'Unknown'}
- KYC Status: ${ctx.kycStatus || 'Unknown'}
- Last Visit Date: ${ctx.lastVisitDate || 'No visit recorded'}
- Sanction Expiry Date: ${ctx.sanctionExpiryDate || 'N/A'}
- Risk Flags: ${flags.length > 0 ? flags.join('; ') : 'None'}
- Previous Notes: ${ctx.notes || 'No notes available'}

Generate the JSON report now.`;
};
