# ⚡ SkillPulse AI

> AI-powered skill gap analyzer for freelancers and gig workers.
> Deployed on Railway. Monetized with Stripe. Built with Claude.

---

## Deploy to Railway in 10 minutes

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
gh repo create skillpulse-ai --public --push
# or push to an existing repo
```

### Step 2 — Create Railway project
1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo**
3. Select your `skillpulse-ai` repo
4. Railway auto-detects Node.js and runs the build

### Step 3 — Set environment variables
In Railway dashboard → your service → **Variables** tab, add:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` from console.anthropic.com |
| `NODE_ENV` | `production` |
| `RAILWAY_PUBLIC_DOMAIN` | Your Railway URL (set after first deploy) |
| `STRIPE_SECRET_KEY` | `sk_live_...` (optional — add when ready for payments) |
| `STRIPE_PRICE_ID` | Your $7.99/mo Stripe price ID (optional) |
| `STRIPE_WEBHOOK_SECRET` | From Stripe dashboard webhooks (optional) |

### Step 4 — Deploy
Railway builds and deploys automatically on every push.
Your app is live at `https://your-project.railway.app`

### Step 5 — Add custom domain (optional)
Railway dashboard → your service → **Settings** → **Domains** → Add custom domain.

---

## Set up Stripe payments (the cash machine)

### Create a product and price
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Products** → **Add product**
   - Name: "SkillPulse Pro"
   - Price: $7.99 / month (recurring)
   - Save the **Price ID** (`price_xxx`) → add to Railway as `STRIPE_PRICE_ID`

### Set up webhook (so you know when people subscribe)
1. Stripe dashboard → **Developers** → **Webhooks**
2. **Add endpoint**: `https://your-railway-url.railway.app/api/stripe/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
4. Copy **Signing secret** → add to Railway as `STRIPE_WEBHOOK_SECRET`

### Test in development
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

---

## Project structure

```
skillpulse/
├── server/
│   └── index.js          ← Express API
│                            GET  /api/health
│                            POST /api/analyze      (Claude AI)
│                            POST /api/lesson       (Claude AI)
│                            POST /api/stripe/checkout
│                            POST /api/stripe/webhook
├── client/
│   ├── public/index.html
│   └── src/
│       ├── App.js            ← Screen router
│       ├── api.js            ← Fetch layer
│       ├── theme.js          ← Colors + quiz data
│       ├── GlobalStyles.js   ← CSS keyframes
│       ├── components.js     ← Shared UI kit
│       ├── SplashScreen.js
│       ├── QuizSteps.js      ← Steps 1–5 (layout bug fixed)
│       ├── LoadingScreen.js
│       ├── ResultsScreen.js  ← Report + paywall trigger
│       ├── LessonModal.js    ← AI-generated 5-min lessons
│       ├── PaywallModal.js   ← Stripe checkout modal
│       └── ErrorScreen.js
├── railway.json
├── nixpacks.toml
├── .gitignore
└── .env.example
```

---

## How it makes money

```
User completes quiz
        ↓
Claude generates skill gap report (free)
        ↓
User sees report + skill cards + quick win
        ↓
"Start my daily skill plan →" button  ←── THE HOOK
        ↓
PaywallModal: $7.99/mo, 7-day free trial
        ↓
Stripe Checkout (hosted page, no card data touches your server)
        ↓
User subscribed → webhook fires → mark active
        ↓
RECURRING REVENUE 💰
```

**Revenue math:**
- 1,000 free users → 50 convert at 5% → $399.50 MRR
- 10,000 free users → 500 convert → $3,995 MRR  
- 100,000 free users → 5,000 convert → $39,950 MRR

---

## What to build next

| Feature | Revenue impact | Effort |
|---------|---------------|--------|
| Email capture on splash | Nurture → convert | Low |
| Daily lesson streak UI | Retention | Medium |
| Push notifications (PWA) | Re-engagement | Medium |
| Referral program | Viral growth | Medium |
| B2B team plan ($49/mo) | Bigger contracts | Medium |
| Capacitor → App Store | Mobile downloads | High |

---

## Local development

```bash
# Install everything
npm install
cd client && npm install && cd ..

# Create .env
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

# Run dev (server on :3001, React on :3000)
npm run dev

# Open http://localhost:3000
```

---

## API reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | None | Health check for Railway |
| `POST` | `/api/analyze` | None | AI skill gap analysis |
| `POST` | `/api/lesson` | None | Generate 5-min lesson |
| `POST` | `/api/stripe/checkout` | None | Create Stripe checkout session |
| `POST` | `/api/stripe/webhook` | Stripe sig | Handle subscription events |

Rate limits: 10 req / 15 min per IP on AI routes.
