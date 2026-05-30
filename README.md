# 🤖 AI Mock Interview Platform

A full-stack AI-powered adaptive mock interview platform built with **React**, **FastAPI**, **Groq (LLaMA 3)**, and **Whisper** for speech recognition.

---

## 📁 Project Structure

```
ai-mock-interview/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # Settings (env vars)
│   ├── requirements.txt
│   ├── .env                       # Your secrets (edit this)
│   ├── auth/
│   │   ├── routes.py              # Signup, Login, Forgot Password
│   │   └── utils.py               # JWT, bcrypt utilities
│   ├── interview/
│   │   └── routes.py              # Start, Submit, Score Report
│   ├── ai_engine/
│   │   ├── groq_service.py        # Groq LLaMA-3 evaluation & question gen
│   │   └── whisper_service.py     # Whisper speech-to-text
│   ├── database/
│   │   └── db.py                  # SQLAlchemy + SQLite setup
│   ├── models/
│   │   └── models.py              # User, Interview, Question models
│   ├── schemas/
│   │   └── schemas.py             # Pydantic schemas
│   └── services/
│       └── email_service.py       # SMTP welcome & password emails
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js                 # Router + protected routes
    │   ├── index.js
    │   ├── index.css              # Global styles (light theme)
    │   ├── context/
    │   │   └── AuthContext.js     # JWT auth state
    │   ├── pages/
    │   │   ├── LoginPage.js
    │   │   ├── SignupPage.js
    │   │   ├── ForgotPasswordPage.js
    │   │   └── DashboardPage.js   # Main interview dashboard
    │   ├── components/
    │   │   ├── Topbar.js          # Header with timer + logout
    │   │   ├── Sidebar.js         # Topic + difficulty selection
    │   │   ├── InterviewPanel.js  # Question display + audio recording
    │   │   ├── ScoreCards.js      # Live score display
    │   │   └── FeedbackCards.js   # AI feedback panels
    │   └── utils/
    │       ├── api.js             # Fetch wrapper
    │       ├── useTimer.js        # Interview timer hook
    │       └── useAudioRecorder.js # Browser audio recording hook
    └── package.json
```

---

## ⚙️ Setup Instructions

### 1. Clone and Navigate

```bash
git clone <your-repo>
cd ai-mock-interview
```

---

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate       # Linux/Mac
venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Install ffmpeg (required for Whisper)
# Ubuntu/Debian:
sudo apt install ffmpeg
# Mac:
brew install ffmpeg
# Windows: Download from https://ffmpeg.org/download.html
```

---

### 3. Configure Environment Variables

Edit `backend/.env`:

```env
# JWT
SECRET_KEY=your-super-secret-key-change-this

# Groq API (get free key at https://console.groq.com)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx

# Email (Gmail SMTP - use App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=your-email@gmail.com

# Database
DATABASE_URL=sqlite:///./interview_platform.db
```

**Getting Groq API Key:**
1. Go to https://console.groq.com
2. Sign up for free
3. Create API key → copy to `.env`

**Getting Gmail App Password:**
1. Enable 2FA on your Google account
2. Go to Google Account → Security → App passwords
3. Generate password for "Mail" → copy to `.env`

---

### 4. Run the Backend

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at: http://localhost:8000/docs

---

### 5. Frontend Setup

```bash
cd frontend
npm install
npm start
```

App runs at: http://localhost:3000

---

## 🔄 Application Flow

```
User Signup → Welcome Email Sent
     ↓
User Login → JWT Token Issued
     ↓
Dashboard → Select Topic + Difficulty
     ↓
Start Interview → Sidebar hides, Interview expands
     ↓
AI generates Question (Groq LLaMA-3)
     ↓
User records audio answer (browser MediaRecorder)
     ↓
Submit → Audio sent to backend
     ↓
Whisper transcribes audio → text
     ↓
Groq evaluates: Grammar, Fluency, Confidence, Conceptual scores
     ↓
Adaptive logic → next question (harder/easier/follow-up)
     ↓
Scores + Feedback displayed live
     ↓
Loop continues...
```

---

## 🧠 Adaptive Intelligence Logic

| Answer Quality | Next Action |
|---|---|
| **Poor** (weak answer) | Easier, more fundamental question |
| **Average** (decent answer) | Similar difficulty, or follow-up |
| **Strong** (excellent answer) | Harder, more in-depth question |

Follow-up questions are generated for the first 2 questions to dig deeper into the candidate's specific answer.

---

## 🗃️ Database Schema

### users
| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary Key |
| name | VARCHAR | Full name |
| email | VARCHAR | Unique |
| password | VARCHAR | bcrypt hashed |
| plain_password | VARCHAR | For forgot-password feature |
| created_at | DATETIME | Auto |

### interviews
| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary Key |
| user_id | INTEGER | FK → users |
| topic | VARCHAR | e.g. DSA, Python |
| difficulty | VARCHAR | Easy/Medium/Hard |
| started_at | DATETIME | Auto |

### questions
| Column | Type | Notes |
|---|---|---|
| id | INTEGER | Primary Key |
| interview_id | INTEGER | FK → interviews |
| question_text | TEXT | AI-generated |
| user_answer | TEXT | Whisper transcript |
| ai_feedback | TEXT | Groq feedback |
| grammar_score | FLOAT | 0–100 |
| fluency_score | FLOAT | 0–100 |
| confidence_score | FLOAT | 0–100 |
| conceptual_score | FLOAT | 0–100 |
| overall_score | FLOAT | 0–100 |
| strengths | TEXT | JSON array |
| weaknesses | TEXT | JSON array |
| suggestions | TEXT | JSON array |
| created_at | DATETIME | Auto |

---

## 🔌 API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login, get JWT token |
| POST | `/api/auth/forgot-password` | ❌ | Email password to user |
| POST | `/api/interview/start` | ✅ | Start interview session |
| POST | `/api/interview/submit-answer` | ✅ | Submit audio, get evaluation |
| GET | `/api/interview/score-report/{id}` | ✅ | Get session average scores |

---

## 🚀 Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, CSS |
| Backend | FastAPI, Uvicorn |
| Database | SQLite + SQLAlchemy ORM |
| Auth | JWT (python-jose), bcrypt (passlib) |
| AI/LLM | Groq API (LLaMA 3 70B) |
| Speech-to-Text | OpenAI Whisper (local, base model) |
| Email | aiosmtplib (async SMTP) |
| Schemas | Pydantic v2 |

---

## 🛠️ Troubleshooting

**Whisper slow on first load:** Normal — it downloads the model on first run (~150MB for base model).

**CORS errors:** Make sure backend runs on port 8000 and frontend on 3000. Check `main.py` CORS settings.

**Email not sending:** Verify Gmail App Password (not regular password). Must have 2FA enabled.

**Microphone not working:** Browser requires HTTPS for microphone access in production. Localhost works without HTTPS.

**Groq rate limits:** Free tier has generous limits. If hit, add delays between requests.
