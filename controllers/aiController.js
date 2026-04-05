const { chat } = require('../services/aiService');

exports.chatHandler = async (req, res) => {
  const { message, history } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

  try {
    const reply = await chat({
      message:   message.trim(),
      userId:    req.user.id,
      role:      req.user.role,
      collegeId: req.user.college_id,
      history:   Array.isArray(history) ? history : [],
    });
    res.json({ reply });
  } catch (err) {
    console.error('AI Error:', err.status, err.message?.slice(0, 120));
    if (err.code === 'NO_KEY')
      return res.status(503).json({ message: '⚙️ AI not configured. Add GEMINI_API_KEY to backend .env' });
    if (err.status === 429)
      return res.status(429).json({ message: '⏳ Gemini free quota exceeded. Enable billing at console.cloud.google.com or wait and retry.' });
    if (err.status === 403)
      return res.status(403).json({ message: '🔑 Gemini API key invalid or API not enabled. Check Google AI Studio.' });
    res.status(500).json({ message: '❌ AI error: ' + (err.message?.slice(0, 100) || 'Unknown error') });
  }
};
