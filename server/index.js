require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
}

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === "production";
const BASE_URL = process.env.RAILWAY_PUBLIC_DOMAIN || `http://localhost:${PORT}`;

// ── AI Engine config ──────────────────────────────────────────────────────────
// Set LLM_ENGINE=ollama to use Ollama, anything else uses Gemini as fallback.
// OLLAMA_URL: URL of your Ollama server (e.g. http://your-vps-ip:11434)
// OLLAMA_MODEL: which model to run (default: llama3)
const LLM_ENGINE   = process.env.LLM_ENGINE || "gemini";          // "ollama" | "gemini"
const OLLAMA_URL   = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
const GEMINI_KEY   = process.env.GEMINI_API_KEY || "";
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10kb" }));

const aiLimiter   = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests." } });
const stripeLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: { error: "Too many requests." } });

// ── Ollama call ───────────────────────────────────────────────────────────────
async function callOllama(systemPrompt, userPrompt, maxTokens = 1400) {
  console.log(`[ollama] calling ${OLLAMA_URL} model=${OLLAMA_MODEL}`);

  // Use OpenAI-compatible endpoint for clean system/user separation
  const resp = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   },
      ],
      stream: false,
      options: { num_predict: maxTokens, temperature: 0.7 },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw Object.assign(new Error(`Ollama ${resp.status}: ${txt.substring(0, 200)}`), { status: resp.status });
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Ollama returned empty response");

  console.log("[ollama] success, chars:", text.length);
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
}

// ── Gemini call ───────────────────────────────────────────────────────────────
async function callGemini(systemPrompt, userPrompt, maxTokens = 1400) {
  let lastError;
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[gemini] trying ${model}`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7, responseMimeType: "application/json" },
        }),
      });
      if (resp.status === 429) { lastError = Object.assign(new Error("Rate limited"), { status: 429 }); await new Promise(r => setTimeout(r, 2000)); continue; }
      if (resp.status === 404) { lastError = Object.assign(new Error(`Model ${model} not found`), { status: 404 }); continue; }
      if (!resp.ok) { const e = await resp.json().catch(()=>({})); lastError = Object.assign(new Error(e?.error?.message || `Gemini ${resp.status}`), { status: resp.status }); continue; }
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) throw new Error("Empty response");
      console.log(`[gemini] success with ${model}`);
      return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    } catch(err) { if (!err.status) throw err; lastError = err; }
  }
  throw lastError || new Error("All Gemini models failed");
}

// ── Main AI router — tries Ollama first if configured, falls back to Gemini ──
async function callAI(systemPrompt, userPrompt, maxTokens = 1400) {
  if (LLM_ENGINE === "ollama") {
    try {
      return await callOllama(systemPrompt, userPrompt, maxTokens);
    } catch (err) {
      console.warn("[ai] Ollama failed:", err.message, "— falling back to Gemini");
      if (!GEMINI_KEY) throw new Error("Ollama failed and no GEMINI_API_KEY set as fallback.");
      return await callGemini(systemPrompt, userPrompt, maxTokens);
    }
  }
  return await callGemini(systemPrompt, userPrompt, maxTokens);
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    engine: LLM_ENGINE,
    ollama: LLM_ENGINE === "ollama" ? { url: OLLAMA_URL, model: OLLAMA_MODEL } : null,
    gemini: GEMINI_KEY ? "configured" : "not set",
    stripe: !!stripe,
  });
});

// ── Ollama connection test endpoint ──────────────────────────────────────────
app.get("/api/ollama/test", async (req, res) => {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!r.ok) return res.status(502).json({ ok: false, error: `Ollama returned ${r.status}` });
    const data = await r.json();
    const models = (data.models || []).map(m => m.name);
    res.json({ ok: true, url: OLLAMA_URL, models, target: OLLAMA_MODEL, ready: models.some(m => m.startsWith(OLLAMA_MODEL)) });
  } catch(err) {
    res.status(502).json({ ok: false, error: err.message, hint: "Is Ollama running and reachable at " + OLLAMA_URL + "?" });
  }
});

// ── Analyze ───────────────────────────────────────────────────────────────────
app.post("/api/analyze", aiLimiter, async (req, res) => {
  const { role, experience, concerns, income, hours } = req.body;
  if (!role || !experience || !Array.isArray(concerns) || !concerns.length || !income || !hours) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const system = `You are SkillPulse AI — a razor-sharp career strategist for freelancers and gig workers in 2026.
Be direct, specific, and always tie advice to dollars earned. Never be vague.
CRITICAL: Respond with ONLY a valid JSON object. No markdown. No text outside the JSON.`;

  const user = `Analyze this freelancer's skill gaps:
Role: ${role}
Experience: ${experience}
Concerns: ${concerns.join(", ")}
Monthly income: ${income}
Learning hours/week: ${hours}

Return ONLY this exact JSON (no extra fields, no missing fields):
{
  "headline": "6-8 words capturing their biggest opportunity",
  "summary": "2-3 direct sentences about their situation. Mention their role.",
  "riskScore": 7,
  "riskLabel": "High Risk",
  "topGaps": [
    { "skill": "Skill Name", "urgency": "Critical", "earnBoost": "$800-$1,500/mo", "timeToLearn": "3 weeks", "why": "One sentence specific to their role." },
    { "skill": "Skill Name", "urgency": "High",     "earnBoost": "$400-$800/mo",   "timeToLearn": "2 weeks", "why": "One sentence." },
    { "skill": "Skill Name", "urgency": "Medium",   "earnBoost": "$200-$500/mo",   "timeToLearn": "4 weeks", "why": "One sentence." }
  ],
  "quickWin": "Verb-first. One specific action for the next 7 days.",
  "sixMonthPlan": [
    { "month": "Month 1-2", "focus": "Focus area", "milestone": "Measurable result" },
    { "month": "Month 3-4", "focus": "Focus area", "milestone": "Measurable result" },
    { "month": "Month 5-6", "focus": "Focus area", "milestone": "Measurable result" }
  ],
  "currentMonthly": 2500,
  "projectedMonthly": 4800
}
riskLabel must be one of: "Low Risk" | "Moderate Risk" | "High Risk" | "Critical"
urgency must be one of: "Critical" | "High" | "Medium"`;

  try {
    const raw = await callAI(system, user, 1400);
    const analysis = JSON.parse(raw);
    if (!analysis.headline || !Array.isArray(analysis.topGaps)) throw new Error("Incomplete response");
    res.json({ success: true, analysis });
  } catch(err) {
    console.error("[analyze]", err.message);
    if (err instanceof SyntaxError) return res.status(500).json({ error: "AI returned malformed JSON. Please try again." });
    if (err.status === 429) return res.status(503).json({ error: "AI is busy. Please wait 30 seconds and try again." });
    if (err.status === 400) return res.status(500).json({ error: "Invalid API key. Check your Railway environment variables." });
    res.status(500).json({ error: err.message || "Analysis failed. Please try again." });
  }
});

// ── Lesson ────────────────────────────────────────────────────────────────────
app.post("/api/lesson", aiLimiter, async (req, res) => {
  const { skill, role, level } = req.body;
  if (!skill || !role) return res.status(400).json({ error: "Missing skill or role." });

  const system = `You are SkillPulse AI, a punchy micro-learning coach for freelancers.
CRITICAL: Respond with ONLY a valid JSON object. No markdown. No text outside the JSON.`;

  const user = `5-minute lesson for a ${role} (${level || "growing"}) learning "${skill}".
Return ONLY this JSON:
{
  "title": "Lesson title with clear outcome",
  "hook": "One surprising stat or bold claim.",
  "coreConcept": "The key idea in 2-3 sentences.",
  "practicalStep": "Verb-first. One thing to do TODAY.",
  "quiz": {
    "question": "Multiple choice question",
    "options": ["A) option", "B) option", "C) option", "D) option"],
    "correct": "B",
    "explanation": "Why B is correct."
  },
  "proTip": "Advanced insight for earners, not beginners."
}`;

  try {
    const raw = await callAI(system, user, 900);
    const lesson = JSON.parse(raw);
    if (!lesson.title || !lesson.coreConcept) throw new Error("Incomplete lesson");
    res.json({ success: true, lesson });
  } catch(err) {
    console.error("[lesson]", err.message);
    res.status(500).json({ error: "Could not generate lesson. Please try again." });
  }
});

// ── Stripe ────────────────────────────────────────────────────────────────────
app.post("/api/stripe/checkout", stripeLimiter, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Payments not configured." });
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) return res.status(503).json({ error: "STRIPE_PRICE_ID not set." });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/?subscribed=true`,
      cancel_url:  `${BASE_URL}/?cancelled=true`,
      customer_email: req.body.email || undefined,
      allow_promotion_codes: true,
      subscription_data: { trial_period_days: 7 },
    });
    res.json({ success: true, url: session.url });
  } catch(err) { res.status(500).json({ error: "Could not create checkout session." }); }
});

app.post("/api/stripe/webhook", async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.sendStatus(200);
  try {
    const event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === "checkout.session.completed") console.log("[stripe] new subscriber:", event.data.object.customer_email);
  } catch(err) { return res.status(400).send(`Webhook error: ${err.message}`); }
  res.sendStatus(200);
});

// ── Static ────────────────────────────────────────────────────────────────────
if (IS_PROD) {
  const buildPath = path.join(__dirname, "../client/build");
  app.use(express.static(buildPath, { maxAge: "1d" }));
  app.get("*", (req, res) => res.sendFile(path.join(buildPath, "index.html")));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n⚡ SkillPulse AI — port ${PORT} [${IS_PROD ? "production" : "dev"}]`);
  console.log(`   Engine : ${LLM_ENGINE.toUpperCase()}${LLM_ENGINE === "ollama" ? " (" + OLLAMA_URL + " / " + OLLAMA_MODEL + ")" : ""}`);
  if (LLM_ENGINE === "ollama" && GEMINI_KEY) console.log(`   Fallback: Gemini (configured)`);
  if (LLM_ENGINE === "ollama" && !GEMINI_KEY) console.log(`   Fallback: none (add GEMINI_API_KEY for safety net)`);
  console.log(`   Gemini : ${GEMINI_KEY ? "✓ set" : "not configured"}`);
  console.log(`   Stripe : ${stripe ? "✓" : "not configured"}`);
  console.log("");
});
