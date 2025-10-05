const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const HF_API_URL = 'https://api-inference.huggingface.co/models/google/flan-t5-base';
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['POST', 'GET'],
  credentials: true
}));

app.use(express.json());

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'echoes2025';

let dailyRequestCount = 0;
let lastResetDate = new Date().toDateString();

const HACKATHON_END_DATE = new Date(process.env.HACKATHON_END_DATE || '2025-12-31');
const isDemoActive = () => new Date() <= HACKATHON_END_DATE;

const resetDailyCounter = () => {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyRequestCount = 0;
    lastResetDate = today;
  }
};

const validatePassword = (req, res, next) => {
  const password = req.headers['x-demo-password'];
  if (!password || password !== DEMO_PASSWORD) {
    return res.status(401).json({
      error: 'Invalid or missing demo password',
      isAuthError: true
    });
  }
  next();
};

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { 
    error: 'Too many requests. Please wait a minute and try again.',
    isRateLimited: true
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const dailyLimitMiddleware = (req, res, next) => {
  resetDailyCounter();
  const DAILY_LIMIT = parseInt(process.env.DAILY_REQUEST_LIMIT || '500');
  if (dailyRequestCount >= DAILY_LIMIT) {
    return res.status(429).json({
      error: 'Daily demo limit reached.',
      isDailyLimitReached: true
    });
  }
  next();
};

async function callHuggingFace(prompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 200,
            temperature: 0.8,
            top_p: 0.9,
            return_full_text: false
          }
        })
      });

      if (response.status === 503) {
        console.log('Model loading, waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        continue;
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HF API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      if (Array.isArray(data) && data[0]?.generated_text) {
        return data[0].generated_text;
      } else if (data.generated_text) {
        return data.generated_text;
      } else if (typeof data === 'string') {
        return data;
      }
      
      throw new Error('Unexpected response format');
      
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retry ${i + 1}/${retries}:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

function buildPrompt(messages) {
  let prompt = '';
  for (const msg of messages) {
    if (msg.role === 'system') {
      prompt += `<s>[INST] You are playing a character. ${msg.content} [/INST]\n\n`;
    } else if (msg.role === 'user') {
      prompt += `[INST] ${msg.content} [/INST]\n`;
    } else if (msg.role === 'assistant') {
      prompt += `${msg.content}\n\n`;
    }
  }
  return prompt;
}

app.get('/health', (req, res) => {
  resetDailyCounter();
  res.json({
    status: 'online',
    demoActive: isDemoActive(),
    requestsToday: dailyRequestCount,
    dailyLimit: parseInt(process.env.DAILY_REQUEST_LIMIT || '500'),
    remainingToday: Math.max(0, parseInt(process.env.DAILY_REQUEST_LIMIT || '500') - dailyRequestCount),
    aiProvider: 'Hugging Face (FREE)'
  });
});

app.post('/api/verify', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ valid: false, error: 'Password is required' });
  }
  if (password === DEMO_PASSWORD) {
    resetDailyCounter();
    return res.json({
      valid: true,
      message: 'Password verified successfully',
      requestsRemaining: Math.max(0, parseInt(process.env.DAILY_REQUEST_LIMIT || '500') - dailyRequestCount)
    });
  }
  res.status(401).json({ valid: false, error: 'Invalid password' });
});

app.post('/api/chat', validatePassword, chatLimiter, dailyLimitMiddleware, async (req, res) => {
  try {
    if (!isDemoActive()) {
      return res.status(403).json({ error: 'Demo period has ended.', isDemoExpired: true });
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request. Messages array is required.' });
    }

    const limitedMessages = messages.slice(-8);
    const prompt = buildPrompt(limitedMessages);
    const ghostResponse = await callHuggingFace(prompt);

    dailyRequestCount++;

    res.json({
      message: ghostResponse.trim(),
      isDemoMode: true,
      aiProvider: 'Hugging Face',
      requestsRemaining: Math.max(0, parseInt(process.env.DAILY_REQUEST_LIMIT || '500') - dailyRequestCount)
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'An error occurred.',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again'
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🎮 Echoes of the Estate - Demo Server (FREE)`);
  console.log(`📡 Port ${PORT}`);
  console.log(`🤖 Hugging Face AI`);
});
