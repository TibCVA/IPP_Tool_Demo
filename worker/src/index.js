/**
 * CVA IPP Revenue & Capture Lab - OpenAI Proxy Worker
 * Cloudflare Worker to securely proxy OpenAI API calls
 *
 * Environment Variables Required:
 * - OPENAI_API_KEY: Your OpenAI API key
 *
 * Deploy with: wrangler deploy
 */

// CORS headers for allowed origins
const ALLOWED_ORIGINS = [
    'https://tibcva.github.io',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:5500' // VS Code Live Server
];

const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
};

/**
 * Handle incoming requests
 */
export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return handleCORS(request);
        }

        // Only allow POST requests
        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        // Verify origin
        const origin = request.headers.get('Origin');
        if (!isAllowedOrigin(origin)) {
            return new Response('Forbidden', { status: 403 });
        }

        // Route requests
        const url = new URL(request.url);

        if (url.pathname === '/api/insights') {
            return handleInsightsRequest(request, env, origin);
        }

        return new Response('Not found', { status: 404 });
    }
};

/**
 * Handle CORS preflight requests
 */
function handleCORS(request) {
    const origin = request.headers.get('Origin');

    if (isAllowedOrigin(origin)) {
        return new Response(null, {
            status: 204,
            headers: {
                ...CORS_HEADERS,
                'Access-Control-Allow-Origin': origin
            }
        });
    }

    return new Response('Forbidden', { status: 403 });
}

/**
 * Check if origin is allowed
 */
function isAllowedOrigin(origin) {
    if (!origin) return false;
    return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')));
}

/**
 * Handle /api/insights requests
 */
async function handleInsightsRequest(request, env, origin) {
    try {
        // Parse request body
        const body = await request.json();
        const { prompt, system } = body;

        if (!prompt) {
            return jsonResponse({ error: 'Missing prompt' }, 400, origin);
        }

        // Check for API key
        const apiKey = env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('OPENAI_API_KEY not configured');
            return jsonResponse({
                error: 'Service temporarily unavailable',
                fallback: true
            }, 503, origin);
        }

        // Call OpenAI API
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Cost-effective model for summaries
                messages: [
                    {
                        role: 'system',
                        content: system || 'You are an expert energy market analyst.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 800,
                temperature: 0.7
            })
        });

        if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            console.error('OpenAI API error:', openaiResponse.status, errorText);
            return jsonResponse({
                error: 'AI service error',
                fallback: true
            }, 502, origin);
        }

        const openaiData = await openaiResponse.json();

        // Extract the message content
        const memo = openaiData.choices?.[0]?.message?.content;

        if (!memo) {
            return jsonResponse({
                error: 'Invalid AI response',
                fallback: true
            }, 502, origin);
        }

        // Return successful response
        return jsonResponse({
            memo,
            model: openaiData.model,
            usage: openaiData.usage
        }, 200, origin);

    } catch (error) {
        console.error('Request processing error:', error);
        return jsonResponse({
            error: 'Internal server error',
            fallback: true
        }, 500, origin);
    }
}

/**
 * Helper to create JSON responses with CORS headers
 */
function jsonResponse(data, status, origin) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
            ...CORS_HEADERS
        }
    });
}
