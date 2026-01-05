# CVA IPP Insights API - Cloudflare Worker

Serverless backend proxy for OpenAI API calls. This worker securely handles AI memo generation requests without exposing your API key to the frontend.

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- OpenAI API key

## Setup Instructions

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate.

### 3. Set Your OpenAI API Key

```bash
cd worker
wrangler secret put OPENAI_API_KEY
```

Enter your OpenAI API key when prompted. This securely stores it in Cloudflare's secrets management.

### 4. Deploy the Worker

```bash
wrangler deploy
```

After deployment, you'll receive a URL like:
```
https://cva-ipp-insights-api.<your-subdomain>.workers.dev
```

### 5. Update Frontend Configuration

Edit `assets/constants.js` in the main project and set your worker URL:

```javascript
API: {
    // ... other settings
    INSIGHTS_ENDPOINT: 'https://cva-ipp-insights-api.<your-subdomain>.workers.dev/api/insights'
}
```

## Local Development

Run the worker locally for testing:

```bash
wrangler dev
```

The worker will be available at `http://localhost:8787`.

For local testing, you'll need to set the API key:

```bash
wrangler dev --var OPENAI_API_KEY:your-api-key-here
```

## CORS Configuration

The worker is configured to accept requests from:
- `https://tibcva.github.io` (GitHub Pages)
- `http://localhost:3000` (Local development)
- `http://localhost:8080` (Local development)
- `http://127.0.0.1:5500` (VS Code Live Server)

To add more origins, edit `src/index.js` and update the `ALLOWED_ORIGINS` array.

## API Endpoint

### POST /api/insights

Generates an AI executive memo based on analysis data.

**Request Body:**
```json
{
  "prompt": "Analysis prompt with KPI data...",
  "system": "System prompt for the AI (optional)"
}
```

**Response:**
```json
{
  "memo": "### Key Findings\n\n- ...",
  "model": "gpt-4o-mini",
  "usage": {
    "prompt_tokens": 500,
    "completion_tokens": 300,
    "total_tokens": 800
  }
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "fallback": true
}
```

When `fallback: true` is returned, the frontend should use its built-in fallback memo template.

## Cost Estimation

Using `gpt-4o-mini` model:
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens

Typical analysis request: ~500 input tokens, ~300 output tokens
Cost per request: ~$0.0003 (less than $0.001)

## Troubleshooting

### "Service temporarily unavailable" error
- Check that `OPENAI_API_KEY` is set: `wrangler secret list`
- Verify the key is valid in OpenAI dashboard

### CORS errors
- Ensure your frontend origin is in the `ALLOWED_ORIGINS` array
- Check browser console for the specific origin being blocked

### "AI service error"
- Check OpenAI API status: https://status.openai.com/
- Verify your API key has sufficient credits
- Check Cloudflare Worker logs: `wrangler tail`

## Security Notes

- API key is stored securely in Cloudflare secrets, never in code
- CORS restricts which domains can call the API
- Rate limiting can be added via Cloudflare dashboard if needed
- No user data is stored; requests are processed and discarded
