# 🚀 MU EduHub — Free Deployment Guide (Render.com)

## What changes in this version?
- ✅ API key is hidden on the server — users can NEVER see it
- ✅ No "Set API Key" button needed — works for everyone automatically
- ✅ Rate limit: 20 questions/user/hour (prevents abuse)
- ✅ Free hosting on Render.com

---

## 📁 Project Structure
```
mu-eduhub/
├── server.js          ← Node.js backend (hides API key)
├── package.json       ← Dependencies
├── .env.example       ← Template for environment variables
├── .gitignore         ← Keeps .env out of GitHub
└── public/
    └── index.html     ← Your frontend (calls /api/chat)
```

---

## 🪜 Step-by-Step Deployment

### Step 1 — GitHub pe upload karo
1. [github.com](https://github.com) pe new account/login karo
2. **New Repository** banao → name: `mu-eduhub` → Public
3. Saare files upload karo (`server.js`, `package.json`, `.gitignore`, `.env.example`, `public/index.html`)
4. **Commit changes** karo

### Step 2 — Render.com pe deploy karo
1. [render.com](https://render.com) pe free account banao
2. **New → Web Service** click karo
3. GitHub repo connect karo → `mu-eduhub` select karo
4. Settings:
   - **Name:** `mu-eduhub` (ya kuch bhi)
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. **Environment Variables** section mein:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-xxxxxx` ← apni actual key paste karo
6. **Create Web Service** click karo

### Step 3 — Done! 🎉
Render tumhe ek free URL dega jaise:
`https://mu-eduhub.onrender.com`

Ye URL share karo apne classmates ke saath!

---

## 💡 Important Notes

### Apna Anthropic API Key kahan se laayen?
1. [console.anthropic.com](https://console.anthropic.com) pe jaao
2. Free account banao
3. **API Keys → Create Key** karo
4. Key copy karo → Render ke Environment Variables mein paste karo

### Free tier limits:
- Render free plan mein app **15 minutes inactivity ke baad sleep** ho jaata hai
- Pehli request pe 30-60 seconds lag sakte hain (cold start)
- Upgrade karo ($7/month) 24/7 ke liye

### Rate limiting:
- 20 messages per user per hour (configurable in `server.js` — `RATE_LIMIT` variable)

---

## 🔄 Update karna ho toh?
GitHub pe file update karo → Render automatically redeploy kar dega!
