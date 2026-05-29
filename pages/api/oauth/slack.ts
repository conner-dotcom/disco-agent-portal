import { NextApiRequest, NextApiResponse } from 'next';

// Slack OpenID Connect callback — exchanges code for user info via id_token JWT
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'code required' });

  const clientId = process.env.SLACK_CLIENT_ID || '';
  const clientSecret = process.env.SLACK_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    console.error('Missing SLACK_CLIENT_ID or SLACK_CLIENT_SECRET env vars');
    return res.status(500).json({ error: 'Server misconfiguration: missing Slack credentials' });
  }

  try {
    // Exchange code for token via OpenID Connect endpoint
    const tokenRes = await fetch('https://slack.com/api/openid.connect.token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&code=${code}`
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.ok) {
      console.error('Slack OIDC token exchange failed:', tokenData.error);
      return res.status(400).json({ error: tokenData.error || 'token exchange failed' });
    }

    // Decode the id_token JWT (no verification needed — we just got it directly from Slack)
    const idToken = tokenData.id_token;
    if (!idToken) {
      return res.status(400).json({ error: 'no id_token in response' });
    }

    const [, payloadB64] = idToken.split('.');
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const claims = JSON.parse(payloadJson);

    const user = {
      id: claims.sub || claims['https://slack.com/user_id'] || '',
      name: claims.name || '',
      image: claims.picture || '',
    };

    // Redirect to home with user info in query params
    const params = new URLSearchParams(user as any);
    res.redirect(`/?${params.toString()}`);
  } catch (e: any) {
    console.error('Slack OAuth error:', e);
    res.status(500).json({ error: 'OAuth failed' });
  }
}
