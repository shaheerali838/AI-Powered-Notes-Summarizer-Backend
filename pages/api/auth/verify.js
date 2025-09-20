import nc from 'next-connect';
import { verifyGoogleToken, verifyFacebookToken, generateToken, generateCookie } from '../../../lib/auth.js';
import { getUsersCollection } from '../../../lib/db.js';
import cors, { runMiddleware } from '../../../lib/cors.js';

const handler = nc({
  onError: (err, req, res, next) => {
    console.error('Auth verify error:', err);
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
    const { provider, token } = req.body;

    if (!provider || !token) {
      return res.status(400).json({ 
        error: 'Provider and token are required' 
      });
    }

    let userData;

    // Verify token with the appropriate provider
    if (provider === 'google') {
      userData = await verifyGoogleToken(token);
    } else if (provider === 'facebook') {
      userData = await verifyFacebookToken(token);
    } else {
      return res.status(400).json({ 
        error: 'Unsupported provider. Use "google" or "facebook"' 
      });
    }

    // Upsert user in database
    const users = await getUsersCollection();
    const existingUser = await users.findOne({ 
      $or: [
        { providerId: userData.id, provider: userData.provider },
        { email: userData.email }
      ]
    });

    let user;
    if (existingUser) {
      // Update existing user
      user = await users.findOneAndUpdate(
        { _id: existingUser._id },
        {
          $set: {
            name: userData.name,
            picture: userData.picture,
            lastLogin: new Date(),
            provider: userData.provider,
            providerId: userData.id
          }
        },
        { returnDocument: 'after' }
      );
      user = user.value;
    } else {
      // Create new user
      const newUser = {
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        provider: userData.provider,
        providerId: userData.id,
        createdAt: new Date(),
        lastLogin: new Date()
      };
      
      const result = await users.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }

    // Generate JWT token
    const jwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: 'user'
    };

    const jwtToken = generateToken(jwtPayload);

    // Set secure cookie
    const cookie = generateCookie('auth_token', jwtToken);
    res.setHeader('Set-Cookie', cookie);

    // Return response
    res.status(200).json({
      token: jwtToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider: user.provider
      }
    });

  } catch (error) {
    console.error('Auth verification failed:', error);
    
    if (error.message.includes('Invalid') || error.message.includes('token')) {
      return res.status(401).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Authentication failed' });
  }
});

export default handler;