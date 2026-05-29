import { NextApiRequest, NextApiResponse } from 'next';

// Simple API: get connected services for a user
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  // Read from Hermes webhook status or KV store
  // For now, return mock data — connected services are stored in profile .env
  const services = {
    google: process.env[`GOOGLE_TOKEN_${userId}`] ? true : false,
    github: process.env[`GITHUB_TOKEN_${userId}`] ? true : false,
    granola: false,
  };

  res.status(200).json({ userId, services });
}
