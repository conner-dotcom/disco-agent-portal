import { NextApiRequest, NextApiResponse } from 'next';

// Slack OAuth callback — exchanges code for user info
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'code required' });

  const clientId = process.env.SLACK_CLIENT_ID || '';
  const clientSecret = process.env.SLACK_CLIENT_SECRET || '';

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${clientId}&client_secret=${clientSecret}&code=${code}`
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.ok) {
      return res.status(400).json({ error: tokenData.error });
    }

    // Get user info
    const userRes = await fetch('https://slack.com/api/users.info?user=' + tokenData.authed_user.id, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();

    // Redirect to home with user info in cookie or query param
    const user = {
      id: tokenData.authed_user.id,
      name: userData.user?.real_name || userData.user?.name,
      image: userData.user?.profile?.image_48 || '',
    };

    // Simple: encode in URL for demo
    const params = new URLSearchParams(user as any);
    res.redirect(`/?${params.toString()}`);
  } catch (e) {
    res.status(500).json({ error: 'OAuth failed' });
  }
}
