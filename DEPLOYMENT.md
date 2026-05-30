# AI Mock Interview Platform — Deployment Guide
## Architecture: Whisper-Free Build (v2)

---

## What Changed from v1

| Component | Before (v1) | After (v2) |
|-----------|-------------|------------|
| Speech-to-Text | Local Whisper + PyTorch (~2 GB RAM) | Browser Web Speech API (0 MB backend RAM) |
| Audio upload | `multipart/form-data` (audio file) | `application/json` (text transcript) |
| Backend deps | `torch`, `openai-whisper`, `numpy` | Removed completely |
| `requirements.txt` size | ~2 GB install | ~50 MB install |
| Deploy to free tier | ❌ Fails (OOM) | ✅ Works |

---

## How It Works Now

```
User speaks → Browser Web Speech API → transcript text
                                              ↓
                               POST /api/interview/submit-answer
                               { interview_id, question_id, transcript }
                                              ↓
                                    Groq evaluates text
                                              ↓
                                  Scores + feedback returned
```

No audio ever leaves the browser. The backend only receives and processes text.

---

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome (desktop) | ✅ Full | Best experience |
| Edge | ✅ Full | Uses same engine as Chrome |
| Brave | ✅ Full | May need mic permission once |
| Opera | ✅ Full | |
| Safari (macOS 14.5+) | ✅ Full | |
| Safari iOS (14.5+) | ⚠️ Partial | Works but may cut off |
| Firefox | ❌ Off by default | Needs `dom.webSpeech.enabled` flag |
| Firefox Android | ❌ Not supported | |

**Recommendation:** Tell users to use Chrome or Edge for best results.

---

## Local Development Setup

### Backend
```bash
cd backend
python -m venv aienv
source aienv/bin/activate          # Windows: aienv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # fill in your GROQ_API_KEY
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
# .env not needed for local dev — Vite proxies /api to localhost:8000
npm run dev                        # runs on http://localhost:3000
```

---

## Deploying to Render (Free Tier) — Backend

1. Push your project to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo, set **Root Directory** to `backend`
4. Settings:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free
5. Add Environment Variables:
   ```
   SECRET_KEY          = <generate a random 64-char string>
   GROQ_API_KEY        = gsk_your_key_here
   ALLOWED_ORIGINS     = https://your-frontend.vercel.app
   DATABASE_URL        = sqlite:///./interview_platform.db
   ```
6. Click **Deploy** — should complete in ~2 minutes

> ⚠️ Free Render instances spin down after 15 min inactivity. First request
> after idle takes ~30 sec. Upgrade to Starter ($7/mo) for always-on.

---

## Deploying to Railway — Backend (Alternative)

1. Install Railway CLI: `npm i -g @railway/cli`
2. From `backend/` folder:
   ```bash
   railway login
   railway init
   railway up
   ```
3. Set environment variables in Railway dashboard
4. Railway auto-detects `Procfile` and uses it

---

## Deploying Frontend to Vercel

1. Go to https://vercel.com → New Project → Import your repo
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite**
4. Add Environment Variable:
   ```
   VITE_API_URL = https://your-backend.onrender.com
   ```
5. Click **Deploy**

---

## Deploying Frontend to Netlify (Alternative)

1. `cd frontend && npm run build` → creates `dist/`
2. Drag & drop `dist/` folder to https://netlify.com/drop
   OR connect GitHub repo with build command `npm run build` and publish dir `dist`
3. Add env var `VITE_API_URL` in Site Settings → Environment

---

## Security Considerations

1. **Transcript privacy:** Speech is processed entirely in the browser — no audio
   sent to your server. Google's servers process it (Chrome STT is cloud-backed)
   but you don't receive or store audio.

2. **HTTPS required:** Web Speech API only works on HTTPS in production
   (Chrome blocks mic on HTTP). Both Render and Vercel provide HTTPS by default.

3. **CORS:** Set `ALLOWED_ORIGINS` to your exact frontend URL only.
   Never use `*` in production.

4. **JWT Secret:** Generate a strong random `SECRET_KEY`:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

5. **SQLite in production:** Fine for low traffic. For production scale,
   switch to PostgreSQL (Render offers a free PostgreSQL instance).

6. **Rate limiting:** Consider adding `slowapi` to prevent abuse of Groq API.

---

## Advantages of This Approach

- ✅ **Zero backend RAM** for STT — fits easily in 512 MB free tier
- ✅ **Faster response** — no audio upload latency (just text POST)
- ✅ **No ffmpeg/ffprobe** needed — no binary dependencies
- ✅ **No temp file management** — no disk I/O on backend
- ✅ **Real-time live transcript** — user sees words appear as they speak
- ✅ **Auto language detection** — Web Speech API handles accents well
- ✅ **Completely free** — no paid STT service needed

## Limitations

- ❌ **Chrome/Edge only** — Firefox users need a workaround
- ❌ **Requires internet** — Chrome's STT sends audio to Google cloud
- ❌ **No offline mode** — unlike local Whisper
- ❌ **60-second chunks** — hook auto-restarts to work around Chrome's limit
- ❌ **Accent sensitivity** — may struggle with heavy accents vs Whisper
- ❌ **Background noise** — no noise filtering (use headset if possible)

---

## Production Suitability

| Factor | Rating | Notes |
|--------|--------|-------|
| Cost | ⭐⭐⭐⭐⭐ | Fully free |
| Reliability | ⭐⭐⭐⭐ | Chrome STT is very stable |
| Accuracy | ⭐⭐⭐⭐ | Good for clear speech |
| Scalability | ⭐⭐⭐⭐⭐ | STT load is on user's browser, not your server |
| Privacy | ⭐⭐⭐ | Audio goes to Google (Chrome STT) |
| Browser reach | ⭐⭐⭐ | Chrome/Edge only for best results |

**Verdict:** Production-ready for a free-tier interview platform targeting
Chrome/Edge users. Suitable for portfolio projects, student platforms, and
low-to-medium traffic products.
