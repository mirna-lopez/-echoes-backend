const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
app.set('trust proxy', 1);

// Anthropic Claude Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

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
  const DAILY_LIMIT = parseInt(process.env.DAILY_REQUEST_LIMIT || '200');
  if (dailyRequestCount >= DAILY_LIMIT) {
    return res.status(429).json({
      error: 'Daily demo limit reached.',
      isDailyLimitReached: true
    });
  }
  next();
};

async function callClaude(messages) {
  // Extract system message and convert format for Claude
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      system: systemMessage ? systemMessage.content : '',
      messages: conversationMessages
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

app.get('/health', (req, res) => {
  resetDailyCounter();
  res.json({
    status: 'online',
    demoActive: isDemoActive(),
    requestsToday: dailyRequestCount,
    dailyLimit: parseInt(process.env.DAILY_REQUEST_LIMIT || '200'),
    remainingToday: Math.max(0, parseInt(process.env.DAILY_REQUEST_LIMIT || '200') - dailyRequestCount),
    aiProvider: 'Anthropic Claude 3.5 Haiku'
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
      requestsRemaining: Math.max(0, parseInt(process.env.DAILY_REQUEST_LIMIT || '200') - dailyRequestCount),
      aiProvider: 'Claude 3.5 Haiku'
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

    const limitedMessages = messages.slice(-12);
    const ghostResponse = await callClaude(limitedMessages);

    dailyRequestCount++;

    res.json({
      message: ghostResponse.trim(),
      isDemoMode: true,
      aiProvider: 'Claude 3.5 Haiku',
      requestsRemaining: Math.max(0, parseInt(process.env.DAILY_REQUEST_LIMIT || '200') - dailyRequestCount)
    });

  } catch (error) {
    console.error('Claude API Error:', error);
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
  console.log(`🎮 Echoes of the Estate - Demo Server`);
  console.log(`📡 Port ${PORT}`);
  console.log(`🤖 Anthropic Claude 3.5 Haiku`);
});
