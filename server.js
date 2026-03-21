const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Simple in-memory rate limiter ──────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT = 20;
const WINDOW_MS  = 60 * 60 * 1000;

function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + WINDOW_MS; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  if (entry.count > RATE_LIMIT) {
    const minutesLeft = Math.ceil((entry.resetAt - now) / 60000);
    return res.status(429).json({ error: `Rate limit exceeded. Try again in ${minutesLeft} minute(s).` });
  }
  next();
}

// ── /api/chat endpoint ─────────────────────────────────────────────────────
app.post('/api/chat', rateLimit, async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ error: 'Missing subject or message.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server API key not configured.' });

  const systemPrompt = `You are an AI Subject Instructor strictly for the University of Mumbai (MU). You ONLY teach "${subject}" as defined in the official University of Mumbai CBCS syllabus for BScIT / BSc CS students.

STRICT RULES — NEVER BREAK THESE:
1. Answer ONLY based on the University of Mumbai official syllabus for this subject. Do NOT use or reference syllabus content from any other university (not SPPU, not Delhi University, not Anna University, not any other).
2. Always structure your answers around the MU syllabus Units (Unit 1, Unit 2, etc.) for this subject.
3. If a topic is NOT part of the MU syllabus for "${subject}", explicitly say: "This topic is not part of the University of Mumbai syllabus for ${subject}."
4. Every explanation must be exam-focused for Mumbai University semester exams (2 or 3 marks, 5 marks, 10 marks patterns).
5. When answering, always mention which MU Unit the topic belongs to.

FORMAT (use plain HTML only):
- <strong> for bold headings
- <br> for line breaks
- bullet points using •
- <div class="mc">code here</div> for code samples

Always begin your response by stating the Unit name/number this topic falls under as per MU syllabus.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 1000 }
      })
    });

    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error.message });

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, could not get a response.';
    res.json({ reply });

  } catch (err) {
    console.error('Gemini API error:', err);
    res.status(500).json({ error: 'Network error reaching AI service.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ MU EduHub running on port ${PORT}`));
