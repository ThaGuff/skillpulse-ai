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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Valid Gemini v1beta model names (verified May 2026)
// Primary: gemini-2.0-flash  |  Fallback: gemini-2.0-flash-lite
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10kb" }));

const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests — please wait a few minutes." } });
const stripeLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: { error: "Too many requests." } });

async function callGemini(systemPrompt, userPrompt, maxTokens = 1400) {
  let lastError;

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[gemini] trying model: ${model}`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
      });

      if (resp.status === 429) {
        console.warn(`[gemini] rate limited on ${model}, trying next...`);
        lastError = Object.assign(new Error("Rate limited"), { status: 429 });
        // Small wait before trying next model
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      if (resp.status === 404) {
        console.warn(`[gemini] model not found: ${model}, trying next...`);
        lastError = Object.assign(new Error(`Model ${model} not found`), { status: 404 });
        continue;
      }

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        const msg = errBody?.error?.message || `Gemini error ${resp.status}`;
        console.error(`[gemini] ${resp.status} on ${model}:`, msg);
        lastError = Object.assign(new Error(msg), { status: resp.status });
        continue;
      }

      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) throw new Error("Gemini returned empty response");

      console.log(`[gemini] success with ${model}`);
      // Strip any accidental markdown fences
      return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    } catch (err) {
      if (!err.status) throw err; // network error — bail immediately
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini models failed. Please try again.");
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), models: GEMINI_MODELS, gemini: !!GEMINI_API_KEY, stripe: !!stripe });
});

// ── Analyze ───────────────────────────────────────────────────────────────────
app.post("/api/analyze", aiLimiter, async (req, res) => {
  const { role, experience, concerns, income, hours } = req.body;
  if (!role || !experience || !Array.isArray(concerns) || !concerns.length || !income || !hours) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const system = `You are SkillPulse AI — a razor-sharp career strategist for freelancers and gig workers in 2026.
You understand AI displacement deeply. Be direct, specific, tie every insight to money.
CRITICAL: Respond with ONLY a valid JSON object. No markdown. No extra text.`;

  const user = `Analyze this freelancer's skill gaps:
Role: ${role}
Experience: ${experience}
Concerns: ${concerns.join(", ")}
Monthly income: ${income}
Learning hours/week: ${hours}

Return ONLY this exact JSON shape:
{
  "headline": "6-8 words capturing their biggest opportunity",
  "summary": "2-3 direct sentences about their situation. Mention their role.",
  "riskScore": 7,
  "riskLabel": "High Risk",
  "topGaps": [
    { "skill": "Skill Name", "urgency": "Critical", "earnBoost": "$800-$1,500/mo", "timeToLearn": "3 weeks", "why": "Why this matters for their role." },
    { "skill": "Skill Name", "urgency": "High", "earnBoost": "$400-$800/mo", "timeToLearn": "2 weeks", "why": "Why this matters." },
    { "skill": "Skill Name", "urgency": "Medium", "earnBoost": "$200-$500/mo", "timeToLearn": "4 weeks", "why": "Why this matters." }
  ],
  "quickWin": "Verb-first. One action for the next 7 days.",
  "sixMonthPlan": [
    { "month": "Month 1-2", "focus": "Focus area", "milestone": "Measurable result" },
    { "month": "Month 3-4", "focus": "Focus area", "milestone": "Measurable result" },
    { "month": "Month 5-6", "focus": "Focus area", "milestone": "Measurable result" }
  ],
  "currentMonthly": 2500,
  "projectedMonthly": 4800
}`;

  try {
    const raw = await callGemini(system, user, 1400);
    const analysis = JSON.parse(raw);
    if (!analysis.headline || !Array.isArray(analysis.topGaps)) throw new Error("Incomplete response");
    res.json({ success: true, analysis });
  } catch (err) {
    console.error("[analyze error]", err.message);
    if (err instanceof SyntaxError) return res.status(500).json({ error: "AI returned malformed data. Please try again." });
    if (err.status === 429) return res.status(503).json({ error: "AI is busy right now. Please wait 30 seconds and try again." });
    if (err.status === 400) return res.status(500).json({ error: "Invalid Gemini API key. Check GEMINI_API_KEY in Railway Variables." });
    res.status(500).json({ error: err.message || "Analysis failed. Please try again." });
  }
});

// ── Lesson ────────────────────────────────────────────────────────────────────
app.post("/api/lesson", aiLimiter, async (req, res) => {
  const { skill, role, level } = req.body;
  if (!skill || !role) return res.status(400).json({ error: "Missing skill or role." });

  const system = `You are SkillPulse AI, a punchy micro-learning coach for freelancers.
CRITICAL: Respond with ONLY a valid JSON object. No markdown. No extra text.`;

  const user = `5-minute lesson for a ${role} (${level || "growing"}) learning "${skill}".

Return ONLY this JSON:
{
  "title": "Lesson title with clear outcome",
  "hook": "One surprising stat or claim. No fluff.",
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
    const raw = await callGemini(system, user, 900);
    const lesson = JSON.parse(raw);
    if (!lesson.title || !lesson.coreConcept) throw new Error("Incomplete lesson");
    res.json({ success: true, lesson });
  } catch (err) {
    console.error("[lesson error]", err.message);
    res.status(500).json({ error: "Could not generate lesson. Please try again." });
  }
});

// ── Stripe checkout ───────────────────────────────────────────────────────────
app.post("/api/stripe/checkout", stripeLimiter, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Payments not configured." });
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) return res.status(503).json({ error: "STRIPE_PRICE_ID not set." });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/?subscribed=true`,
      cancel_url: `${BASE_URL}/?cancelled=true`,
      customer_email: req.body.email || undefined,
      allow_promotion_codes: true,
      subscription_data: { trial_period_days: 7 },
    });
    res.json({ success: true, url: session.url });
  } catch (err) {
    res.status(500).json({ error: "Could not create checkout session." });
  }
});

// ── Stripe webhook ────────────────────────────────────────────────────────────
app.post("/api/stripe/webhook", async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.sendStatus(200);
  try {
    const event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === "checkout.session.completed") console.log("[stripe] new subscriber:", event.data.object.customer_email);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }
  res.sendStatus(200);
});

// ── Static React build ────────────────────────────────────────────────────────
if (IS_PROD) {
  const buildPath = path.join(__dirname, "../client/build");
  app.use(express.static(buildPath, { maxAge: "1d" }));
  app.get("*", (req, res) => res.sendFile(path.join(buildPath, "index.html")));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n⚡ SkillPulse AI — port ${PORT} [${IS_PROD ? "production" : "dev"}]`);
  console.log(`   Models    : ${GEMINI_MODELS.join(" → ")}`);
  console.log(`   Gemini key: ${GEMINI_API_KEY ? "✓ set (" + GEMINI_API_KEY.substring(0,8) + "...)" : "✗ MISSING"}`);
  console.log(`   Stripe    : ${stripe ? "✓" : "✗ not configured"}`);
  console.log("");
});
