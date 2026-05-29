import { NextApiRequest, NextApiResponse } from 'next';

// Granola OAuth flow — PKCE-based
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state, code_verifier } = req.query;
  
  if (code && state && code_verifier) {
    // Callback: exchange code for tokens
    try {
      const tokenRes = await fetch('https://api.granola.ai/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          code_verifier,
          client_id: 'disco-agent',
          redirect_uri: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/oauth/granola`,
        }),
      });
      const tokens = await tokenRes.json();
      
      // Store tokens for this user (state = Slack user ID)
      // Webhook to store on Hermes
      await fetch(`https://dias-mac-studio.tail4f36cb.ts.net/webhooks/oauth-granola`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: state,
          tokens,
          service: 'granola',
        }),
      });

      res.redirect('/?connected=granola');
    } catch (e) {
      res.status(500).json({ error: 'Granola OAuth failed' });
    }
  } else {
    // Start OAuth flow
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    // Generate PKCE
    const crypto = await import('crypto');
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    
    // Store verifier temporarily (in memory or cookie)
    res.setHeader('Set-Cookie', `gr_verifier=${verifier}; Path=/; HttpOnly; Max-Age=300`);
    
    const authUrl = `https://api.granola.ai/oauth/authorize?client_id=disco-agent&redirect_uri=${encodeURIComponent(`https://disco-agent-portal.vercel.app/api/oauth/granola`)}&response_type=code&code_challenge=${challenge}&code_challenge_method=S256&state=${userId}`;
    
    res.redirect(authUrl);
  }
}
