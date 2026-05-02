require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Anthropic = require("@anthropic-ai/sdk");
const path = require("path");

// Stripe is optional — only loaded if key is present
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
}

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === "production";
const BASE_URL = process.env.RAILWAY_PUBLIC_DOMAIN || `http://localhost:${PORT}`;

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // React app handles its own CSP
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: IS_PROD ? BASE_URL : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
}));

// ── Body parsing (skip for Stripe webhook route) ──────────────────────────────
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10kb" }));

// ── Rate limiters ─────────────────────────────────────────────────────────────
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please wait a few minutes and try again." },
});

const stripeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many requests." },
});

// ── Anthropic ─────────────────────────────────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeParseJSON(text) {
  // Strip markdown fences if Claude wrapped the JSON
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check — Railway uses this
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    stripe: !!stripe,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  });
});

// ── Skill gap analysis ────────────────────────────────────────────────────────
app.post("/api/analyze", aiLimiter, async (req, res) => {
  const { role, experience, concerns, income, hours } = req.body;

  if (!role || !experience || !Array.isArray(concerns) || !concerns.length || !income || !hours) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const system = `You are SkillPulse AI — a razor-sharp career strategist for freelancers and gig workers in 2026.
You understand AI displacement deeply. You are direct, specific, and always tie advice to dollars earned.
Never be vague. Never give generic advice. Every answer is tailored to the specific role and situation.`;

  const user = `Analyze this freelancer's skill gaps and income potential:

Role: ${role}
Experience: ${experience}  
Top concerns: ${concerns.join(", ")}
Current monthly income range: ${income}
Weekly hours available to learn: ${hours}

Return ONLY a valid JSON object. No markdown. No text outside the JSON. This exact shape:
{
  "headline": "6-8 words capturing their single biggest opportunity right now",
  "summary": "2-3 direct sentences about their specific situation, what is at stake, and why they must act. Mention their role.",
  "riskScore": 7,
  "riskLabel": "High Risk",
  "topGaps": [
    {
      "skill": "Specific Skill Name",
      "urgency": "Critical",
      "earnBoost": "$800-$1,500/mo",
      "timeToLearn": "3 weeks",
      "why": "One sentence tied to their specific role and concerns."
    },
    {
      "skill": "Specific Skill Name",
      "urgency": "High",
      "earnBoost": "$400-$800/mo",
      "timeToLearn": "2 weeks",
      "why": "One sentence tied to their specific role and concerns."
    },
    {
      "skill": "Specific Skill Name",
      "urgency": "Medium",
      "earnBoost": "$200-$500/mo",
      "timeToLearn": "4 weeks",
      "why": "One sentence tied to their specific role and concerns."
    }
  ],
  "quickWin": "Start with a verb. One specific action they can take in the next 7 days that will show results.",
  "sixMonthPlan": [
    { "month": "Month 1-2", "focus": "Skill or action to take", "milestone": "Concrete measurable result" },
    { "month": "Month 3-4", "focus": "Skill or action to take", "milestone": "Concrete measurable result" },
    { "month": "Month 5-6", "focus": "Skill or action to take", "milestone": "Concrete measurable result" }
  ],
  "currentMonthly": 2500,
  "projectedMonthly": 4800
}

Rules for the numbers:
- riskScore: integer 1-10
- riskLabel: exactly one of "Low Risk" | "Moderate Risk" | "High Risk" | "Critical"
- currentMonthly: integer, estimate mid-point of their income range
- projectedMonthly: integer, realistic 6-month projection (not fantasy)
- urgency: exactly one of "Critical" | "High" | "Medium"`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1400,
      system,
      messages: [{ role: "user", content: user }],
    });

    const raw = msg.content.find((b) => b.type === "text")?.text || "";
    const analysis = safeParseJSON(raw);

    // Validate required fields before sending
    if (!analysis.headline || !analysis.topGaps || !Array.isArray(analysis.topGaps)) {
      throw new Error("Incomplete AI response");
    }

    res.json({ success: true, analysis });
  } catch (err) {
    console.error("[analyze]", err.message);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: "AI returned malformed data. Please try again." });
    }
    if (err.status === 401) {
      return res.status(500).json({ error: "Invalid Anthropic API key." });
    }
    if (err.status === 529) {
      return res.status(503).json({ error: "AI is overloaded. Please try again in 30 seconds." });
    }
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

// ── Lesson generation ─────────────────────────────────────────────────────────
app.post("/api/lesson", aiLimiter, async (req, res) => {
  const { skill, role, level } = req.body;

  if (!skill || !role) {
    return res.status(400).json({ error: "Missing skill or role." });
  }

  const user = `Create a punchy 5-minute micro-lesson for a ${role} (${level || "growing"} experience) learning "${skill}".

Return ONLY valid JSON, no markdown:
{
  "title": "Engaging lesson title that promises a clear outcome",
  "hook": "One surprising stat or bold claim that makes them keep reading. No fluff.",
  "coreConcept": "The single most important idea, explained simply in 2-3 sentences. Use an analogy if it helps.",
  "practicalStep": "Start with a verb. One thing they can do TODAY to apply this — specific, not vague.",
  "quiz": {
    "question": "A real multiple-choice question that tests understanding",
    "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
    "correct": "B",
    "explanation": "Why B is correct, in one clear sentence."
  },
  "proTip": "The advanced insight that separates beginners from people who actually make money with this skill."
}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 900,
      messages: [{ role: "user", content: user }],
    });

    const raw = msg.content.find((b) => b.type === "text")?.text || "";
    const lesson = safeParseJSON(raw);

    if (!lesson.title || !lesson.coreConcept) {
      throw new Error("Incomplete lesson response");
    }

    res.json({ success: true, lesson });
  } catch (err) {
    console.error("[lesson]", err.message);
    res.status(500).json({ error: "Could not generate lesson. Please try again." });
  }
});

// ── Stripe: create checkout session ──────────────────────────────────────────
app.post("/api/stripe/checkout", stripeLimiter, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Payments not configured yet. Set STRIPE_SECRET_KEY." });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return res.status(503).json({ error: "STRIPE_PRICE_ID not set." });
  }

  const { email } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/?subscribed=true`,
      cancel_url: `${BASE_URL}/?cancelled=true`,
      customer_email: email || undefined,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
        metadata: { source: "skillpulse_app" },
      },
      metadata: { source: "skillpulse_app" },
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.error("[stripe checkout]", err.message);
    res.status(500).json({ error: "Could not create checkout session." });
  }
});

// ── Stripe: webhook (mark subscriptions active) ───────────────────────────────
app.post("/api/stripe/webhook", async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.sendStatus(200); // silently ignore if not configured
  }

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[webhook] signature verification failed:", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed":
      console.log("[webhook] New subscriber:", event.data.object.customer_email);
      // TODO: save to DB, send welcome email, etc.
      break;
    case "customer.subscription.deleted":
      console.log("[webhook] Subscription cancelled:", event.data.object.customer);
      break;
    default:
      // ignore other events
  }

  res.sendStatus(200);
});

// ── Serve React in production ─────────────────────────────────────────────────
if (IS_PROD) {
  const buildPath = path.join(__dirname, "../client/build");
  app.use(express.static(buildPath, { maxAge: "1d" }));
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n⚡ SkillPulse AI running on port ${PORT} [${IS_PROD ? "production" : "development"}]`);
  console.log(`   Health → http://localhost:${PORT}/api/health`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn("   ⚠️  ANTHROPIC_API_KEY missing!");
  if (!stripe) console.warn("   ⚠️  Stripe not configured (STRIPE_SECRET_KEY missing)");
  console.log("");
});
