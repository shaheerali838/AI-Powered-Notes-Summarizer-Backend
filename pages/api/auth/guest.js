import nc from 'next-connect';
import { generateToken, generateCookie } from '../../../lib/auth.js';
import cors, { runMiddleware } from '../../../lib/cors.js';

const handler = nc({
  onError: (err, req, res, next) => {
    console.error('Guest auth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  },
  onNoMatch: (req, res) => {
    res.status(405).json({ error: 'Method not allowed' });
  },
});

// Apply CORS
handler.use(async (req, res, next) => {
  await runMiddleware(req, res, cors);
  next();
});

handler.post(async (req, res) => {
  try {
    // Generate short-lived guest token (1 hour)
    const guestPayload = {
      role: 'guest',
      sessionId: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    const guestToken = generateToken(guestPayload, '1h');

    // Set cookie with shorter expiry for guests
    const cookie = generateCookie('auth_token', guestToken, {
      maxAge: 60 * 60, // 1 hour
    });
    
    res.setHeader('Set-Cookie', cookie);

    res.status(200).json({
      token: guestToken,
      user: {
        role: 'guest',
        sessionId: guestPayload.sessionId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('Guest token generation failed:', error);
    res.status(500).json({ error: 'Failed to create guest session' });
  }
});

export default handler;