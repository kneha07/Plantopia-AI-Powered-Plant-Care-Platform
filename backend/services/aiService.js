const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Stable system prompt — cached on every Claude request
const FLORA_SYSTEM = `You are Plantopia's friendly AI plant care expert named "Flora". You help users with:
- Plant care advice (watering, light, soil, fertilizing)
- Troubleshooting plant problems
- Identifying what might be wrong with a plant
- Plant selection recommendations
- Seasonal care tips

Keep responses concise, friendly, and practical. Use plant emojis occasionally.
If asked about something unrelated to plants, gently redirect to plant topics.`;

// Cached system block — reused across all Claude calls so the prefix hits the cache
const CACHED_FLORA_SYSTEM = [
  { type: 'text', text: FLORA_SYSTEM, cache_control: { type: 'ephemeral' } },
];

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : { raw: text };
}

// ── Claude helpers ──────────────────────────────────────────────────────────

async function claudeChat(history, userMessage) {
  const messages = [
    ...history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
    { role: 'user', content: userMessage },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    system: CACHED_FLORA_SYSTEM,
    messages,
  });

  return response.content.find(b => b.type === 'text')?.text ?? '';
}

async function claudeVision(base64Data, mimeType, prompt) {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    system: CACHED_FLORA_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });

  return response.content.find(b => b.type === 'text')?.text ?? '';
}

async function claudeText(prompt) {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    system: CACHED_FLORA_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content.find(b => b.type === 'text')?.text ?? '';
}

// ── Gemini fallback helpers ─────────────────────────────────────────────────

async function geminiChat(history, userMessage) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: FLORA_SYSTEM,
  });
  const chat = model.startChat({
    history: history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
  });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

async function geminiVision(base64Data, mimeType, prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent([
    { inlineData: { data: base64Data, mimeType } },
    prompt,
  ]);
  return result.response.text();
}

async function geminiText(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ── Public API: Claude primary, Gemini fallback ─────────────────────────────

async function chat(history, userMessage) {
  if (anthropic) {
    try {
      return await claudeChat(history, userMessage);
    } catch (err) {
      console.warn('[AI] Claude chat failed, falling back to Gemini:', err.message);
    }
  }
  return geminiChat(history, userMessage);
}

async function visionJson(base64Data, mimeType, prompt) {
  let text;
  if (anthropic) {
    try {
      text = await claudeVision(base64Data, mimeType, prompt);
    } catch (err) {
      console.warn('[AI] Claude vision failed, falling back to Gemini:', err.message);
    }
  }
  if (!text) text = await geminiVision(base64Data, mimeType, prompt);
  return extractJson(text);
}

async function textJson(prompt) {
  let text;
  if (anthropic) {
    try {
      text = await claudeText(prompt);
    } catch (err) {
      console.warn('[AI] Claude text failed, falling back to Gemini:', err.message);
    }
  }
  if (!text) text = await geminiText(prompt);
  return extractJson(text);
}

module.exports = { chat, visionJson, textJson };
