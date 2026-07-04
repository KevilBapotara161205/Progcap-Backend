/**
 * Prompt: NBA (Next Best Action) Explanation
 * v1 — Progcap SFA
 *
 * The NBA ranking itself is rule-based and deterministic.
 * This prompt only EXPLAINS the reason in human-readable language.
 * It does NOT re-rank or override the existing score.
 */

/**
 * @param {Object} ctx
 * @param {string} ctx.merchantName
 * @param {string} ctx.stage
 * @param {number} ctx.score
 * @param {boolean} ctx.isStuck
 * @param {boolean} ctx.urgencyFlag
 * @param {boolean} ctx.npaFlag
 * @param {number|null} ctx.sanctionDaysLeft
 * @param {number} ctx.expectedValue
 * @param {string|null} ctx.lastActivityAt
 */
export const buildNbaExplanationPrompt = (ctx) => {
  const valueInLakhs = ctx.expectedValue ? (ctx.expectedValue / 100000).toFixed(1) : '0';
  const reasons = [];
  if (ctx.urgencyFlag) reasons.push('marked urgent by manager');
  if (ctx.isStuck) reasons.push(`stuck in ${ctx.stage} stage with no progress`);
  if (ctx.npaFlag) reasons.push('has an NPA risk flag');
  if (ctx.sanctionDaysLeft !== null && ctx.sanctionDaysLeft <= 14) reasons.push(`sanction expires in ${ctx.sanctionDaysLeft} days`);
  if (ctx.expectedValue >= 500000) reasons.push(`high expected loan value of ₹${valueInLakhs}L`);
  if (ctx.lastActivityAt) reasons.push(`last activity was on ${ctx.lastActivityAt}`);

  return `You are a business advisor for Progcap SFA. 
A rule-based algorithm has already ranked this merchant as a top priority for the RM.
Your job is to explain WHY in clear, professional, human-readable language (2-4 sentences max).
Do NOT suggest a different ranking. Do NOT invent data. Only explain using the facts given.
Respond in plain text. No JSON.

MERCHANT: ${ctx.merchantName || 'Unknown'}
SYSTEM-CALCULATED PRIORITY SCORE: ${ctx.score?.toFixed(1) || 'N/A'}
REASON FACTORS: ${reasons.length ? reasons.join('; ') : 'Standard follow-up schedule'}

Write the explanation now.`;
};
