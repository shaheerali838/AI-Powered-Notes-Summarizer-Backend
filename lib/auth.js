import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { serialize } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Generate JWT token
export function generateToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Generate secure cookie
export function generateCookie(name, value, options = {}) {
  const defaultOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
    ...options
  };

  return serialize(name, value, defaultOptions);
}

// Verify Google ID token
export async function verifyGoogleToken(idToken) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      provider: 'google'
    };
  } catch (error) {
    console.error('Google token verification failed:', error);
    throw new Error('Invalid Google token');
  }
}

// Verify Facebook access token
export async function verifyFacebookToken(accessToken) {
  try {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    
    if (!appId || !appSecret) {
      throw new Error('Facebook app credentials not configured');
    }

    // Verify token with Facebook Graph API
    const verifyUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
    const verifyResponse = await fetch(verifyUrl);
    const verifyData = await verifyResponse.json();

    if (!verifyData.data?.is_valid) {
      throw new Error('Invalid Facebook token');
    }

    // Get user info
    const userUrl = `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`;
    const userResponse = await fetch(userUrl);
    const userData = await userResponse.json();

    if (userData.error) {
      throw new Error('Failed to fetch Facebook user data');
    }

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture?.data?.url,
      provider: 'facebook'
    };
  } catch (error) {
    console.error('Facebook token verification failed:', error);
    throw new Error('Invalid Facebook token');
  }
}

// Middleware to verify authentication
export function requireAuth(handler) {
  return async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const cookieToken = req.cookies?.auth_token;
      
      const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : cookieToken;

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = verifyToken(token);
      req.user = decoded;
      
      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

// Middleware to allow both auth and guest users
export function allowGuest(handler) {
  return async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const cookieToken = req.cookies?.auth_token;
      
      const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : cookieToken;

      if (token) {
        try {
          const decoded = verifyToken(token);
          req.user = decoded;
        } catch (error) {
          // Invalid token, treat as guest
          req.user = null;
        }
      } else {
        req.user = null;
      }
      
      return handler(req, res);
    } catch (error) {
      console.error('Guest auth middleware error:', error);
      req.user = null;
      return handler(req, res);
    }
  };
}