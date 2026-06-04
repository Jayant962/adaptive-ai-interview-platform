# 🎙️ AI Interview Platform

> A production-ready AI-powered adaptive mock interview platform built for final year major projects, portfolios, and interview demonstrations.

---

## 📸 What It Does

- Conducts realistic interviews with an AI avatar that speaks questions aloud
- Asks **adaptive follow-up questions** based on your actual answer
- Evaluates **technical accuracy** using Groq AI (llama-3.3-70b)
- Evaluates **communication quality** using an independent NLP + ML pipeline
- Detects filler words (um, uh, basically, like, etc.)
- Generates professional per-question reports
- Tracks progress over time with charts and analytics

---

## 🏗️ Architecture

```
Frontend (React + Vite + Tailwind)
        ↓  Fetch API
Backend (FastAPI)
    ├── Groq AI → Question generation, Follow-up, Technical evaluation
    ├── NLP Pipeline (NLTK + spaCy + language-tool) → Grammar, Fluency analysis
    ├── ML Pipeline (Scikit-Learn) → Communication scores
    └── SQLAlchemy → Neon PostgreSQL

Auth: Clerk (JWT tokens verified on every protected route)
Speech: Browser Web Speech API (STT + TTS - no cost, no API key)
```

---

## 🛠️ Technology Stack

| Layer          | Technology                           |
|----------------|--------------------------------------|
| Frontend       | React 18, Vite, Tailwind CSS         |
| Routing        | React Router v6                      |
| State          | React Context API + useReducer       |
| Auth           | Clerk (Email, Google, Verification)  |
| API Calls      | Native Fetch API only                |
| Backend        | FastAPI, Pydantic, SQLAlchemy        |
| Database       | Neon PostgreSQL (cloud)              |
| AI             | Groq API (llama-3.3-70b-versatile)   |
| NLP            | NLTK, spaCy, language-tool-python    |
| ML             | Scikit-Learn                         |
| Speech STT     | Browser Web Speech API               |
| Speech TTS     | Browser Speech Synthesis API         |
| Deployment     | Vercel (frontend), Render (backend)  |

---

## 📁 Project Structure

```
ai-interview-platform/
├── backend/
│   ├── app/
│   │   ├── main.py                    ← FastAPI app entry point
│   │   ├── config.py                  ← Settings from .env
│   │   ├── api/routes/
│   │   │   ├── auth.py                ← /api/auth/*
│   │   │   ├── interview.py           ← /api/interview/*
│   │   │   └── reports.py             ← /api/reports/*
│   │   ├── services/
│   │   │   ├── groq_service.py        ← Groq AI calls
│   │   │   ├── interview_service.py   ← Core interview logic
│   │   │   └── auth_service.py        ← Clerk user sync
│   │   ├── models/                    ← SQLAlchemy ORM models
│   │   ├── schemas/                   ← Pydantic validators
│   │   ├── nlp/analyzer.py            ← NLTK + spaCy + language-tool
│   │   ├── ml/scorer.py               ← Scikit-Learn scoring
│   │   ├── prompts/interview_prompts.py ← All Groq prompts
│   │   └── database/connection.py     ← Neon PostgreSQL connection
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LandingPage.jsx        ← Marketing landing page
    │   │   ├── LoginPage.jsx          ← Clerk SignIn
    │   │   ├── SignupPage.jsx         ← Clerk SignUp
    │   │   ├── DashboardPage.jsx      ← Stats + Charts
    │   │   ├── SetupPage.jsx          ← Topic + difficulty selection
    │   │   ├── InterviewPage.jsx      ← Live interview session
    │   │   ├── ReportPage.jsx         ← Detailed report
    │   │   ├── HistoryPage.jsx        ← Past interviews
    │   │   └── ProfilePage.jsx        ← User profile
    │   ├── context/
    │   │   ├── AuthContext.jsx        ← Clerk + DB user sync
    │   │   ├── InterviewContext.jsx   ← Interview state machine
    │   │   └── ThemeContext.jsx       ← Dark/light mode
    │   ├── services/
    │   │   ├── api.js                 ← All backend fetch calls
    │   │   └── speech.js              ← STT + TTS wrappers
    │   ├── components/
    │   │   ├── interview/
    │   │   │   ├── AvatarPanel.jsx    ← Avatar with state animations
    │   │   │   ├── FeedbackPanel.jsx  ← Post-answer feedback
    │   │   │   ├── RecordingControls.jsx ← Mic controls
    │   │   │   └── TranscriptPanel.jsx   ← Live transcript
    │   │   └── ui/index.jsx           ← Buttons, Cards, Badges, etc.
    │   ├── layouts/DashboardLayout.jsx ← Sidebar layout
    │   ├── routes/
    │   │   ├── AppRouter.jsx          ← All routes defined here
    │   │   └── ProtectedRoute.jsx     ← Auth guard
    │   └── hooks/useTimer.js          ← Interview timer
    ├── tailwind.config.js
    ├── vite.config.js
    └── vercel.json
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- A Clerk account (free) → https://clerk.com
- A Groq account (free) → https://console.groq.com
- A Neon account (free) → https://neon.tech

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/ai-interview-platform.git
cd ai-interview-platform
```

---

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Create .env file
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
GROQ_API_KEY=gsk_your_key_here
CLERK_SECRET_KEY=sk_test_your_key
CLERK_PUBLISHABLE_KEY=pk_test_your_key
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

Run the backend:
```bash
uvicorn app.main:app --reload --port 8000
```

Backend will be at: http://localhost:8000
API docs at: http://localhost:8000/docs

---

### Step 3: Frontend Setup

```bash
cd frontend
npm install

# Create .env file
cp .env.example .env
```

Edit `.env`:
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key
VITE_API_URL=http://localhost:8000
```

Run the frontend:
```bash
npm run dev
```

Frontend will be at: http://localhost:5173

---

## 🔑 Getting API Keys

### Clerk Setup
1. Go to https://clerk.com → Create account → Create application
2. Enable Email + Google sign-in
3. Copy `Publishable Key` and `Secret Key` from API Keys section
4. Set `Redirect URL` to your frontend URL

### Groq Setup
1. Go to https://console.groq.com → Create account
2. Go to API Keys → Create new key
3. Copy the key (starts with `gsk_`)

### Neon PostgreSQL
1. Go to https://neon.tech → Create account → Create project
2. Copy the connection string from Dashboard
3. Paste into `DATABASE_URL` in `.env`

---

## 🚀 Deployment

### Deploy Backend to Render

1. Push your code to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repository
4. Set Root Directory: `backend`
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Add all environment variables from `.env`
8. Deploy

### Deploy Frontend to Vercel

1. Go to https://vercel.com → New Project → Import GitHub repo
2. Set Root Directory: `frontend`
3. Framework: Vite
4. Add environment variables:
   - `VITE_CLERK_PUBLISHABLE_KEY` = your Clerk key
   - `VITE_API_URL` = your Render backend URL
5. Deploy

### After Deployment
- Update `ALLOWED_ORIGINS` in Render to include your Vercel URL
- Update `FRONTEND_URL` in Render to your Vercel URL
- Update Clerk dashboard with your Vercel domain

---

## 🎭 Avatar Integration

The platform includes a CSS fallback avatar. To use your own avatar:

1. Get an embed URL from your avatar platform (e.g., HeyGen, D-ID, Ready Player Me)
2. Add to frontend `.env`:
   ```env
   VITE_AVATAR_URL=https://your-avatar-embed-url.com
   ```
3. The `AvatarPanel.jsx` component will automatically render it in an iframe

---

## 🧪 How the Adaptive Follow-Up Works

```
User answers → Groq AI analyzes:
  ├── Was the answer too generic?
  ├── Did it miss key concepts?
  ├── Was there no practical understanding?
  └── Was the explanation vague?

If YES → Generate targeted follow-up question
If NO  → Move to next main question

Max follow-ups:
  Easy   → 1 follow-up per question
  Medium → 2 follow-ups per question
  Hard   → 3 follow-ups per question
```

---

## 📊 Scoring System

| Score         | Source      | What It Measures                        |
|---------------|-------------|----------------------------------------|
| Technical     | Groq AI     | Accuracy, depth, relevance to question |
| Conceptual    | Groq AI     | Understanding of concepts              |
| Relevance     | Groq AI     | Did they actually answer the question? |
| Grammar       | NLP + ML    | Sentence structure, errors             |
| Fluency       | NLP + ML    | Flow, vocabulary diversity             |
| Confidence    | NLP + ML    | Filler words, hedging language         |
| Communication | NLP + ML    | Weighted average of above              |
| **Overall**   | Combined    | 60% Technical + 40% Communication      |

---

## 💡 Key Design Decisions

1. **No Axios** — Pure Fetch API for all network calls
2. **No Redux** — React Context + useReducer for all state
3. **No Alembic** — SQLAlchemy creates tables directly on startup
4. **Groq ≠ Communication scores** — NLP/ML pipeline is completely independent
5. **Follow-ups are answer-driven** — Never random, always based on the actual response
6. **Irrelevant answers get low scores** — The prompt explicitly checks relevance first

---

## 🎤 Speech API Notes

- Uses **Chrome/Edge Web Speech API** (built-in, free, no API key)
- **STT**: `SpeechRecognition` API — converts voice to text in real-time
- **TTS**: `SpeechSynthesis` API — avatar speaks questions aloud
- Works best in **Chrome** on desktop
- On mobile Chrome: works but may require HTTPS

---

## 📝 API Endpoints

| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| POST   | `/api/auth/sync`                  | Sync Clerk user to DB          |
| GET    | `/api/auth/profile`               | Get current user profile       |
| POST   | `/api/interview/start`            | Start new interview session    |
| POST   | `/api/interview/submit-answer`    | Submit answer + get evaluation |
| POST   | `/api/interview/follow-up`        | Get adaptive follow-up         |
| POST   | `/api/interview/next-question`    | Get next main question         |
| POST   | `/api/interview/end`              | End interview + generate report|
| GET    | `/api/interview/history`          | Get user's interview history   |
| GET    | `/api/reports/{session_id}`       | Get full detailed report       |
| GET    | `/api/reports/list`               | Get all reports summary        |
| GET    | `/api/reports/analytics/me`       | Get user analytics             |

---

## 🎯 Viva Explanation Points

1. **Why Groq?** — Fast inference, free tier, llama-3.3-70b is state-of-the-art for instruction following
2. **Why separate NLP pipeline?** — Communication analysis must not depend on AI bias; rule-based scoring is more transparent and explainable
3. **Why Clerk?** — Production-grade auth with email verification, OAuth, session management — saves weeks of work
4. **Why Neon PostgreSQL?** — Serverless PostgreSQL with free tier, perfect for student projects, scales automatically
5. **Adaptive follow-ups** — The key differentiator: real interviewers probe weak answers, so does our AI
6. **Follow-up improves score** — If you answer follow-ups well, your final score improves — this mirrors real interview fairness
