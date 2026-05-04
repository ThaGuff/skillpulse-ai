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

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: IS_PROD ? BASE_URL : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
}));
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10kb" }));

const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests — please wait a few minutes." } });
const stripeLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: { error: "Too many requests." } });

async function callGemini(systemPrompt, userPrompt, maxTokens = 1400) {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err?.error?.message || `Gemini API error ${resp.status}`;
    console.error("[gemini]", resp.status, msg);
    throw Object.assign(new Error(msg), { status: resp.status });
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) throw new Error("Gemini returned an empty response");
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), ai: "gemini-2.0-flash", gemini: !!GEMINI_API_KEY, stripe: !!stripe });
});

app.post("/api/analyze", aiLimiter, async (req, res) => {
  const { role, experience, concerns, income, hours } = req.body;
  if (!role || !experience || !Array.isArray(concerns) || !concerns.length || !income || !hours) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const system = `You are SkillPulse AI — a razor-sharp career strategist for freelancers and gig workers in 2026.
You understand AI displacement deeply. You are direct, specific, and always tie advice to dollars earned.
Never be vague. Every answer is tailored to the specific role and situation.
You MUST respond with ONLY a valid JSON object. No markdown. No explanation. No text outside the JSON.`;

  const user = `Analyze this freelancer's skill gaps:

Role: ${role}
Experience: ${experience}
Top concerns: ${concerns.join(", ")}
Current monthly income range: ${income}
Weekly hours available to learn: ${hours}

Return ONLY a valid JSON object with EXACTLY this shape:
{
  "headline": "6-8 words capturing their biggest opportunity",
  "summary": "2-3 direct sentences about their situation and stakes. Mention their role.",
  "riskScore": 7,
  "riskLabel": "High Risk",
  "topGaps": [
    { "skill": "Skill Name", "urgency": "Critical", "earnBoost": "$800-$1,500/mo", "timeToLearn": "3 weeks", "why": "One sentence why this matters for their role." },
    { "skill": "Skill Name", "urgency": "High", "earnBoost": "$400-$800/mo", "timeToLearn": "2 weeks", "why": "One sentence why." },
    { "skill": "Skill Name", "urgency": "Medium", "earnBoost": "$200-$500/mo", "timeToLearn": "4 weeks", "why": "One sentence why." }
  ],
  "quickWin": "Start with a verb. One specific action for the next 7 days.",
  "sixMonthPlan": [
    { "month": "Month 1-2", "focus": "Skill or action", "milestone": "Concrete measurable result" },
    { "month": "Month 3-4", "focus": "Skill or action", "milestone": "Concrete measurable result" },
    { "month": "Month 5-6", "focus": "Skill or action", "milestone": "Concrete measurable result" }
  ],
  "currentMonthly": 2500,
  "projectedMonthly": 4800
}`;

  try {
    const raw = await callGemini(system, user, 1400);
    const analysis = JSON.parse(raw);
    if (!analysis.headline || !analysis.topGaps || !Array.isArray(analysis.topGaps)) throw new Error("Incomplete AI response");
    res.json({ success: true, analysis });
  } catch (err) {
    console.error("[analyze]", err.message);
    if (err instanceof SyntaxError) return res.status(500).json({ error: "AI returned malformed data. Please try again." });
    if (err.status === 400) return res.status(500).json({ error: "Invalid Gemini API key. Check GEMINI_API_KEY in Railway Variables." });
    if (err.status === 429) return res.status(503).json({ error: "AI rate limit hit. Please try again in 30 seconds." });
    res.status(500).json({ error: err.message || "Analysis failed. Please try again." });
  }
});

app.post("/api/lesson", aiLimiter, async (req, res) => {
  const { skill, role, level } = req.body;
  if (!skill || !role) return res.status(400).json({ error: "Missing skill or role." });

  const system = `You are SkillPulse AI, a punchy micro-learning coach for freelancers.
You MUST respond with ONLY a valid JSON object. No markdown. No text outside the JSON.`;

  const user = `Create a 5-minute micro-lesson for a ${role} (${level || "growing"} experience) learning "${skill}".

Return ONLY valid JSON:
{
  "title": "Engaging lesson title that promises a clear outcome",
  "hook": "One surprising stat or bold claim. No fluff.",
  "coreConcept": "The single most important idea in 2-3 sentences.",
  "practicalStep": "Start with a verb. One thing they can do TODAY.",
  "quiz": {
    "question": "A multiple-choice question testing understanding",
    "options": ["A) option", "B) option", "C) option", "D) option"],
    "correct": "B",
    "explanation": "Why B is correct in one sentence."
  },
  "proTip": "Advanced insight that separates beginners from earners."
}`;

  try {
    const raw = await callGemini(system, user, 900);
    const lesson = JSON.parse(raw);
    if (!lesson.title || !lesson.coreConcept) throw new Error("Incomplete lesson");
    res.json({ success: true, lesson });
  } catch (err) {
    console.error("[lesson]", err.message);
    res.status(500).json({ error: "Could not generate lesson. Please try again." });
  }
});

app.post("/api/stripe/checkout", stripeLimiter, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Payments not configured. Set STRIPE_SECRET_KEY." });
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) return res.status(503).json({ error: "STRIPE_PRICE_ID not set." });
  const { email } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/?subscribed=true`,
      cancel_url: `${BASE_URL}/?cancelled=true`,
      customer_email: email || undefined,
      allow_promotion_codes: true,
      subscription_data: { trial_period_days: 7, metadata: { source: "skillpulse_app" } },
    });
    res.json({ success: true, url: session.url });
  } catch (err) {
    console.error("[stripe checkout]", err.message);
    res.status(500).json({ error: "Could not create checkout session." });
  }
});

app.post("/api/stripe/webhook", async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.sendStatus(200);
  const sig = req.headers["stripe-signature"];
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET); }
  catch (err) { return res.status(400).send(`Webhook error: ${err.message}`); }
  if (event.type === "checkout.session.completed") console.log("[webhook] New subscriber:", event.data.object.customer_email);
  res.sendStatus(200);
});

if (IS_PROD) {
  const buildPath = path.join(__dirname, "../client/build");
  app.use(express.static(buildPath, { maxAge: "1d" }));
  app.get("*", (req, res) => res.sendFile(path.join(buildPath, "index.html")));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n⚡ SkillPulse AI running on port ${PORT} [${IS_PROD ? "production" : "development"}]`);
  console.log(`   AI engine : Gemini 2.0 Flash`);
  console.log(`   Health    → http://localhost:${PORT}/api/health`);
  if (!GEMINI_API_KEY) console.warn("   ⚠️  GEMINI_API_KEY missing!");
  if (!stripe) console.warn("   ⚠️  Stripe not configured");
  console.log("");
});