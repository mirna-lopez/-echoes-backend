# 👻 Echoes of the Estate - Backend

Backend API server for the Echoes of the Estate game. Provides AI-powered ghost conversations using Claude API and handles game authentication.

## 🚀 Features

- **Claude AI Integration**: Proxies requests to Anthropic's Claude API for dynamic ghost responses
- **Password Authentication**: Demo password verification system
- **CORS Enabled**: Configured for local development with React frontend
- **Health Check Endpoint**: Monitor server status
- **Error Handling**: Comprehensive error responses

## 🏗️ Tech Stack

- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **Anthropic SDK**: Claude AI integration
- **CORS**: Cross-origin resource sharing
- **dotenv**: Environment variable management

## 📁 Project Structure

```
echoes-backend/
├── server.js                 # Main server file
├── .env                      # Environment variables (not in repo)           
├── package.json              # Dependencies
├── package-lock.json         # Dependency lock file
└── README.md                 # This file
```

## 🔧 Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/mirna-lopez/echoes-backend.git
   cd echoes-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```env
   # Anthropic API Key
   ANTHROPIC_API_KEY=your_api_key_here
   
   # Demo Password
   DEMO_PASSWORD=echoes2025
   
   # Server Port
   PORT=3001
   
   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the server**
   
   Development mode:
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

5. **Verify it's running**
   
   Open your browser or use curl:
   ```bash
   curl http://localhost:3001/health
   ```
   
   You should see:
   ```json
   {
     "status": "online",
     "message": "Echoes of the Estate API is running"
   }
   ```

## 📡 API Endpoints

### Health Check

**GET** `/health`

Check if the server is running.

**Response:**
```json
{
  "status": "online",
  "message": "Echoes of the Estate API is running",
  "timestamp": "2024-10-19T12:00:00.000Z"
}
```

---

### Verify Password

**POST** `/api/verify`

Verify the demo password for game access.

**Request Body:**
```json
{
  "password": "echoes2025"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Access granted"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid password"
}
```

---

### Chat with Ghost

**POST** `/api/chat`

Send messages to Eleanor's ghost (powered by Claude AI).

**Headers:**
```
Content-Type: application/json
X-Demo-Password: echoes2025
```

**Request Body:**
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are Eleanor Ashford's ghost, died 1892..."
    },
    {
      "role": "user",
      "content": "Hello, who are you?"
    }
  ]
}
```

**Success Response (200):**
```json
{
  "message": "I am Eleanor Ashford, though now merely a whisper of who I once was. This manor has been my prison since 1892, when sorrow claimed my mortal form."
}
```

**Error Responses:**

**401 Unauthorized** - Invalid or missing password:
```json
{
  "error": "Unauthorized"
}
```

**400 Bad Request** - Missing messages:
```json
{
  "error": "Messages array is required"
}
```

**500 Internal Server Error** - AI service error:
```json
{
  "error": "Failed to get AI response",
  "details": "Error message here"
}
```

## 🔐 Security

### Password Protection

The demo password (`echoes2025`) is required for:
- Accessing the `/api/verify` endpoint
- Making requests to `/api/chat` (via `X-Demo-Password` header)

### CORS Configuration

CORS is enabled for the frontend URL specified in `.env`:
```javascript
// Only allows requests from your React app
origin: process.env.FRONTEND_URL || 'http://localhost:3000'
```

### API Key Security

- Never commit your `.env` file
- Keep your Anthropic API key secret
- Use environment variables in production
- Rotate keys if exposed

## 🧪 Testing

### Manual Testing

**Test Health Endpoint:**
```bash
curl http://localhost:3001/health
```

**Test Password Verification:**
```bash
curl -X POST http://localhost:3001/api/verify \
  -H "Content-Type: application/json" \
  -d '{"password":"echoes2025"}'
```

**Test Chat Endpoint:**
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Demo-Password: echoes2025" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are Eleanor Ashford ghost"
      },
      {
        "role": "user",
        "content": "Hello"
      }
    ]
  }'
```

## 🚢 Deployment

### Environment Variables for Production

Set these in your hosting platform:

```env
ANTHROPIC_API_KEY=sk-ant-xxx...
DEMO_PASSWORD=your_secure_password
PORT=3001
FRONTEND_URL=https://your-frontend-domain.com
NODE_ENV=production
```

### Recommended Platforms

- **Railway**: Easy Node.js deployment
- **Render**: Free tier available
- **Heroku**: Simple deployment process
- **AWS EC2**: Full control
- **DigitalOcean App Platform**: Managed service

### Deployment Steps (Example - Railway)

1. Push code to GitHub
2. Connect Railway to your repository
3. Add environment variables in Railway dashboard
4. Deploy automatically on push

## 📊 Rate Limiting & Costs

### Anthropic API Usage

- Each chat request uses the Claude API
- Monitor usage at: https://console.anthropic.com/
- Consider implementing rate limiting for production
- Typical cost: ~$0.003 per request (varies by model)

### Recommended Rate Limiting

For production, add rate limiting:

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## 🐛 Troubleshooting

### Common Issues

**"ANTHROPIC_API_KEY is not defined"**
- Check your `.env` file exists
- Verify the API key is set correctly
- Restart the server after changing `.env`

**"CORS error from frontend"**
- Check `FRONTEND_URL` in `.env` matches your React app URL
- Verify the frontend is running on the correct port

**"Invalid API key"**
- Get a new key from https://console.anthropic.com/
- Make sure there are no extra spaces in `.env`

**"Port 3001 already in use"**
- Change `PORT` in `.env`
- Or kill the process using the port:
  ```bash
  # On Mac/Linux
  lsof -ti:3001 | xargs kill -9
  
  # On Windows
  netstat -ano | findstr :3001
  taskkill /PID <PID> /F
  ```

## 🔄 Development

### Scripts

```json
{
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

### Adding New Endpoints

1. Add route in `server.js`
2. Add password protection if needed
3. Test with curl or Postman
4. Update this README

## 📧 Contact

- Email: lopez.mirna2807@gmail.com
- Linkedin: https://www.linkedin.com/in/mirna-lopez/
- GitHub: [@mirna-lopez](https://github.com/mirna-lopez)
- Frontend Repo: [echoes-frontend](https://github.com/mirna-lopez/echoes-frontend)
  

---

**Built for BUILD Halloween Hacks 2024** 🎃

*"The spirits respond to those who listen..."*
