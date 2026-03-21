const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Rate limiter ───────────────────────────────────────────────────────────
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

// ── Markdown to HTML converter ─────────────────────────────────────────────
function mdToHtml(text) {
  return text
    .replace(/^### (.+)$/gm, '<br><strong style="color:#60a5fa;font-size:1rem">$1</strong><br>')
    .replace(/^## (.+)$/gm, '<br><strong style="color:#818cf8;font-size:1.05rem">$1</strong><br>')
    .replace(/^# (.+)$/gm, '<br><strong style="color:#a78bfa;font-size:1.1rem">$1</strong><br>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:3px;font-family:monospace">$1</code>')
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<div class="mc">$1</div>')
    .replace(/^[-*] (.+)$/gm, '• $1<br>')
    .replace(/^\d+\. (.+)$/gm, (m, p1, offset, str) => `• <strong>${m.match(/^\d+/)[0]}.</strong> ${p1}<br>`)
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

// ── /api/chat endpoint ─────────────────────────────────────────────────────
app.post('/api/chat', rateLimit, async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ error: 'Missing subject or message.' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server API key not configured.' });

  const systemPrompt = `You are an AI Subject Instructor strictly for the University of Mumbai (MU). You ONLY teach "${subject}" as defined in the official University of Mumbai CBCS syllabus for BScIT / BSc CS students.

STRICT RULES:
1. Answer ONLY based on the University of Mumbai official syllabus. Do NOT use content from SPPU, Delhi University, Anna University or any other university.
2. Always mention which MU Unit the topic belongs to (e.g. Unit 1, Unit 2).
3. If a student asks about a concept using different words (e.g. "AI robots" instead of "Intelligent Agents"), find the CLOSEST matching topic in the MU syllabus and answer that. NEVER say "not in syllabus" if a related concept exists in the syllabus.
4. Only say "not in syllabus" if the topic is completely unrelated to the subject.
5. Format answers for MU exam patterns (2/3 marks, 5 marks, 10 marks).

FORMATTING RULES — VERY IMPORTANT:
- Use ## for section headings (e.g. ## Definition, ## Key Points)
- Use **text** for bold/important terms
- Use bullet points with - for lists
- Use numbered lists (1. 2. 3.) for steps
- Use \`code\` for inline code
- Use triple backticks for code blocks
- Keep each point SHORT and CLEAR — one idea per line
- Add a blank line between sections

Start with: ## 📘 Unit X: [Unit Name]
Then: ## 📝 Definition
Then: ## 🔑 Key Points
Then (if applicable): ## 📊 Types / ## ⚙️ Working / ## ✅ Advantages / ## ❌ Disadvantages
End with: ## 🎯 MU Exam Tips (mention what type of questions come from this topic)`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const raw = data.choices?.[0]?.message?.content || 'Sorry, could not get a response.';
    const reply = mdToHtml(raw);
    res.json({ reply });

  } catch (err) {
    console.error('Groq API error:', err);
    res.status(500).json({ error: 'Network error reaching AI service.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ MU EduHub running on port ${PORT}`));
