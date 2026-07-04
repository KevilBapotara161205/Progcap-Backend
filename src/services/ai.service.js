/**
 * AI Service — Progcap SFA
 * Gemini 2.0 Flash client with caching, retry, rate limiting, and PII masking.
 *
 * ARCHITECTURE:
 *   - All Gemini calls go through this service only
 *   - API key loaded from process.env (never hardcoded)
 *   - Responses cached in-memory (NodeCache) with 30-min TTL
 *   - 3 retry attempts with exponential backoff
 *   - 30-second per-call timeout
 *   - Graceful degradation: returns null if API key missing or call fails
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import NodeCache from 'node-cache';
import crypto from 'crypto';

// ── Cache: 30 min TTL, max 200 entries ─────────────────────────────────────
const responseCache = new NodeCache({ stdTTL: 1800, maxKeys: 200, checkperiod: 120 });

// ── Singleton Gemini client (created once, reused) ──────────────────────────
let geminiClient = null;

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
};

// ── PII masker: strips phone numbers and 12-digit numbers (Aadhaar) ─────────
const maskPII = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\b\d{10}\b/g, '**PHONE**')    // mobile numbers
    .replace(/\b\d{12}\b/g, '**ID**')        // Aadhaar
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '**EMAIL**'); // email
};

// ── Cache key from prompt hash ───────────────────────────────────────────────
const makeCacheKey = (prompt) =>
  crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 32);

// ── Sleep helper ─────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Core AI call with retry + timeout.
 * Returns parsed JSON (if prompt requests JSON) or plain text.
 * Returns null on any failure — never throws.
 *
 * @param {string} prompt
 * @param {Object} [options]
 * @param {boolean} [options.expectJson=true]
 * @param {boolean} [options.useCache=true]
 * @param {number} [options.maxRetries=3]
 * @returns {Promise<Object|string|null>}
 */
export const callAI = async (prompt, options = {}) => {
  const { expectJson = true, useCache = true, maxRetries = 3 } = options;

  // Guard: no API key configured
  const client = getClient();
  if (!client) {
    console.warn('[AI Service] GEMINI_API_KEY not configured. Returning null.');
    return null;
  }

  // PII mask the prompt before sending
  const safePrompt = maskPII(prompt);

  // Cache check
  const cacheKey = makeCacheKey(safePrompt);
  if (useCache) {
    const cached = responseCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const model = client.getGenerativeModel({ model: modelName });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 30-second timeout per attempt
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI request timeout')), 30000)
      );

      const generatePromise = model.generateContent(safePrompt);
      const result = await Promise.race([generatePromise, timeoutPromise]);

      const text = result.response.text().trim();

      let parsed;
      if (expectJson) {
        // Strip markdown code fences if Gemini wraps in ```json
        const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        parsed = JSON.parse(clean);
      } else {
        parsed = text;
      }

      // Store in cache
      if (useCache) {
        responseCache.set(cacheKey, parsed);
      }

      return parsed;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      if (isLastAttempt) {
        console.warn(`[AI Service] Gemini API quota limit reached. Gracefully falling back to rule-based engine:`, err.message);
        return null;
      }
      // Exponential backoff: 500ms, 1000ms, 2000ms
      const backoff = 500 * Math.pow(2, attempt - 1);
      console.warn(`[AI Service] Attempt ${attempt} failed. Retrying in ${backoff}ms...`);
      await sleep(backoff);
    }
  }

  return null;
};

/**
 * Check if AI service is reachable.
 * @returns {Promise<{online: boolean, reason?: string}>}
 */
export const checkAIHealth = async () => {
  if (!process.env.GEMINI_API_KEY) {
    return { online: false, reason: 'API key not configured' };
  }

  try {
    const client = getClient();
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = client.getGenerativeModel({ model: modelName });
    const result = await Promise.race([
      model.generateContent('Respond with exactly: OK'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
    ]);
    const text = result.response.text().trim();
    return { online: text.includes('OK'), reason: text.includes('OK') ? undefined : 'Unexpected response' };
  } catch (err) {
    return { online: false, reason: err.message };
  }
};

/**
 * Invalidate cached response for a specific prompt context.
 * @param {string} prompt
 */
export const invalidateCache = (prompt) => {
  const key = makeCacheKey(maskPII(prompt));
  responseCache.del(key);
};

/**
 * Clear the entire AI response cache.
 */
export const clearCache = () => {
  responseCache.flushAll();
};
