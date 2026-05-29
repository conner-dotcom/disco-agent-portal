import { useState, useEffect, useCallback } from 'react';

function getUrlParam(key: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(key) || '';
}

const WEBHOOK_BASE = 'https://dias-mac-studio.tail4f36cb.ts.net/webhooks';
const TOTAL_STEPS = 8;

// Steps definition
const STEPS = [
  { key: 'welcome', label: 'Welcome', num: 1 },
  { key: 'slack', label: 'Slack', num: 2 },
  { key: 'google', label: 'Google', num: 3 },
  { key: 'github', label: 'GitHub', num: 4 },
  { key: 'granola', label: 'Granola', num: 5 },
  { key: 'profile', label: 'Profile', num: 6 },
  { key: 'style', label: 'Style', num: 7 },
  { key: 'done', label: 'Done', num: 8 },
] as const;

type StepKey = typeof STEPS[number]['key'];

export default function Home() {
  const [userId, setUserId] = useState(() => getUrlParam('id') || getUrlParam('userId') || '');
  const [userName, setUserName] = useState(() => getUrlParam('name') || '');
  const [step, setStep] = useState<StepKey>('welcome');
  const [services, setServices] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [granolaKey, setGranolaKey] = useState('');
  const [granolaSaved, setGranolaSaved] = useState(false);

  const [profile, setProfile] = useState({
    role: '',
    team: '',
    timezone: 'America/Los_Angeles',
    focus: '',
    goals: '',
  });

  const [style, setStyle] = useState({
    verbosity: 'concise',
    proactivity: 'medium',
    humor: 'medium',
    format: 'bullets',
    emoji: true,
  });

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  // Navigate between steps
  const goTo = useCallback((nextStep: StepKey) => {
    setStep(nextStep);
    setMessage('');
  }, []);

  const nextStep = useCallback(() => {
    const currentIdx = STEPS.findIndex((s) => s.key === step);
    if (currentIdx < STEPS.length - 1) {
      goTo(STEPS[currentIdx + 1].key);
    }
  }, [step, goTo]);

  const prevStep = useCallback(() => {
    const currentIdx = STEPS.findIndex((s) => s.key === step);
    if (currentIdx > 0) {
      goTo(STEPS[currentIdx - 1].key);
    }
  }, [step, goTo]);

  // Handle OAuth popup messages
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'oauth-connected') {
        setServices((s) => ({ ...s, [event.data.service]: true }));
        setMessage(`${event.data.service} connected.`);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const connectOAuth = (service: string) => {
    if (!userId) {
      setMessage('Enter your Slack User ID first.');
      return;
    }
    const popup = window.open(
      `/api/oauth/${service}?user=${userId}`,
      `${service}-oauth`,
      'width=600,height=700'
    );
    if (!popup) {
      setMessage('Please allow popups for this site.');
      return;
    }
    setMessage(`A popup opened — approve the ${service} prompt.`);
  };

  // Save Granola API key
  const saveGranolaKey = async () => {
    if (!granolaKey.trim()) return;
    setLoading(true);
    try {
      await fetch(`${WEBHOOK_BASE}/oauth-granola`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          apiKey: granolaKey.trim(),
          service: 'granola',
        }),
      });
      setGranolaSaved(true);
      setServices((s) => ({ ...s, granola: true }));
      setMessage('Granola API key saved.');
    } catch {
      setMessage('Failed to save Granola key.');
    }
    setLoading(false);
  };

  // Submit onboarding to webhook
  const submitOnboarding = async () => {
    setLoading(true);
    try {
      await fetch(`${WEBHOOK_BASE}/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          slackId: userId,
          displayName: userName || userId,
          ...profile,
          ...style,
          services,
        }),
      });
      setMessage('Profile saved.');
    } catch {
      // non-fatal
    }
    setLoading(false);
    nextStep();
  };

  // ── Step content ──
  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="step-content">
            <h1 className="serif-heading">Disco Agent Portal</h1>
            <p className="step-description">
              Your personal AI agent, tuned to how you work. We'll walk through a quick setup to
              connect your services and personalize your experience.
            </p>
            <hr className="step-hr" />
            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon">1.</span>
                <span>Talk to your agent in Slack — DM or @mention</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">2.</span>
                <span>Connected to your calendar, email, GitHub, and Granola</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">3.</span>
                <span>Query company data, review PRs, summarize meetings</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">4.</span>
                <span>Personal cron jobs, briefings, and more</span>
              </div>
            </div>
            <div className="step-actions">
              <div />
              <button onClick={() => goTo('slack')} className="btn-primary">
                Get started &rarr;
              </button>
            </div>
          </div>
        );

      case 'slack':
        return (
          <div className="step-content">
            <h2 className="serif-heading">Connect your Slack identity</h2>
            <p className="step-description">
              Your agent lives in Slack — it's where you'll chat with it every day.
              We need your Slack ID so it knows who you are.
            </p>
            <hr className="step-hr" />
            <div className="step-body">
              {!userId ? (
                <>
                  <a
                    href={`https://slack.com/openid/connect/authorize?response_type=code&client_id=879184060177.11209135000535&scope=openid,profile,email&redirect_uri=${encodeURIComponent(
                      'https://disco-agent-portal.vercel.app/api/oauth/slack'
                    )}`}
                    className="oauth-btn"
                  >
                    Sign in with Slack
                  </a>
                  <div className="or-divider">
                    <span>or enter your Slack User ID</span>
                  </div>
                  <div className="input-group">
                    <input
                      placeholder="e.g. URTU2JQCT"
                      onChange={(e) => {
                        if (e.target.value.length >= 8) setUserId(e.target.value.trim());
                      }}
                      className="text-input"
                    />
                    <p className="input-hint">
                      Slack &rarr; Profile &rarr; &ctdot; &rarr; <strong>Copy member ID</strong>
                    </p>
                  </div>
                </>
              ) : (
                <div className="connected-row">
                  <span className="connected-indicator" />
                  <span>Signed in as <strong>{userId}</strong></span>
                </div>
              )}
            </div>
            <div className="step-actions">
              <button onClick={prevStep} className="btn-ghost">&larr; Back</button>
              <button
                onClick={() => nextStep()}
                disabled={!userId}
                className="btn-primary"
              >
                Continue &rarr;
              </button>
            </div>
          </div>
        );

      case 'google':
        return (
          <div className="step-content">
            <h2 className="serif-heading">Connect Google</h2>
            <p className="step-description">
              Connect Google so your agent can read your calendar, summarize emails,
              and store files in your Drive. Only accesses what you explicitly grant.
            </p>
            <hr className="step-hr" />
            <div className="step-body">
              {services.google ? (
                <div className="connected-row">
                  <span className="connected-indicator green" />
                  <span>Google connected</span>
                </div>
              ) : (
                <button onClick={() => connectOAuth('google')} className="oauth-btn">
                  Connect Google Account
                </button>
              )}
              <ul className="perm-list">
                <li>Calendar — find your free/busy times</li>
                <li>Gmail — summarize and search email</li>
                <li>Drive — store your files and projects</li>
              </ul>
            </div>
            <div className="step-actions">
              <button onClick={prevStep} className="btn-ghost">&larr; Back</button>
              <button onClick={() => nextStep()} className="btn-primary">
                Continue &rarr;
              </button>
            </div>
          </div>
        );

      case 'github':
        return (
          <div className="step-content">
            <h2 className="serif-heading">Connect GitHub</h2>
            <p className="step-description">
              Connect GitHub so your agent can review PRs, search your codebase,
              and help you understand changes across your repos.
            </p>
            <hr className="step-hr" />
            <div className="step-body">
              {services.github ? (
                <div className="connected-row">
                  <span className="connected-indicator green" />
                  <span>GitHub connected</span>
                </div>
              ) : (
                <>
                  <button onClick={() => connectOAuth('github')} className="oauth-btn">
                    Connect GitHub Account
                  </button>
                  <div className="setup-instructions">
                    <div className="setup-title">Setup instructions</div>
                    <p>
                      Create an OAuth app at{' '}
                      <a href="https://github.com/settings/developers" target="_blank" rel="noopener">
                        github.com/settings/developers
                      </a>{' '}
                      with callback URL{' '}
                      <code>https://disco-agent-portal.vercel.app/api/oauth/github</code>,
                      then enter your Client ID and Secret below.
                    </p>
                  </div>
                </>
              )}
              <ul className="perm-list">
                <li>Repos — search and understand your code</li>
                <li>Pull Requests — review and summarize PRs</li>
                <li>Issues — track work across projects</li>
              </ul>
            </div>
            <div className="step-actions">
              <button onClick={prevStep} className="btn-ghost">&larr; Back</button>
              <button onClick={() => nextStep()} className="btn-primary">
                Continue &rarr;
              </button>
            </div>
          </div>
        );

      case 'granola':
        return (
          <div className="step-content">
            <h2 className="serif-heading">Connect Granola</h2>
            <p className="step-description">
              Granola is your AI meeting assistant — connect it so your agent can access
              your meeting notes and summaries. Paste your Granola API key below.
            </p>
            <hr className="step-hr" />
            <div className="step-body">
              {granolaSaved || services.granola ? (
                <div className="connected-row">
                  <span className="connected-indicator green" />
                  <span>Granola connected</span>
                </div>
              ) : (
                <div className="input-group">
                  <input
                    type="password"
                    placeholder="Paste your Granola API key"
                    value={granolaKey}
                    onChange={(e) => setGranolaKey(e.target.value)}
                    className="text-input"
                  />
                  <p className="input-hint">
                    Find your API key in Granola Settings &rarr; API.
                  </p>
                  <button
                    onClick={saveGranolaKey}
                    disabled={!granolaKey.trim() || loading}
                    className="btn-primary"
                    style={{ marginTop: '12px' }}
                  >
                    {loading ? 'Saving...' : 'Save API Key'}
                  </button>
                </div>
              )}
              <ul className="perm-list">
                <li>Meeting notes — access and summarize your meetings</li>
                <li>Transcripts — search past conversations</li>
                <li>Action items — track follow-ups automatically</li>
              </ul>
            </div>
            <div className="step-actions">
              <button onClick={prevStep} className="btn-ghost">&larr; Back</button>
              <button onClick={() => nextStep()} className="btn-primary">
                Continue &rarr;
              </button>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="step-content">
            <h2 className="serif-heading">Tell us about yourself</h2>
            <p className="step-description">
              The more your agent knows about your role and goals, the more helpful it can be.
              This helps prioritize information and tailor responses to what matters to you.
            </p>
            <hr className="step-hr" />
            <div className="step-body">
              <div className="profile-grid">
                {[
                  { key: 'role', label: 'Role', placeholder: 'Product Engineer', hint: 'What do you do?' },
                  { key: 'team', label: 'Team', placeholder: 'Marketplace', hint: 'Which team are you on?' },
                  { key: 'timezone', label: 'Timezone', placeholder: 'America/Los_Angeles' },
                  { key: 'focus', label: 'Current Focus', placeholder: 'Q2 planning, auction model', hint: 'Top 1-2 things right now' },
                  { key: 'goals', label: 'Goals', placeholder: 'Ship auction V2 by EOM', hint: 'What outcomes are you driving?' },
                ].map((f) => (
                  <div key={f.key} className="field">
                    <label className="field-label">{f.label}</label>
                    {f.hint && <div className="field-hint">{f.hint}</div>}
                    <input
                      value={(profile as any)[f.key]}
                      onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="text-input"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="step-actions">
              <button onClick={prevStep} className="btn-ghost">&larr; Back</button>
              <button onClick={() => nextStep()} className="btn-primary">
                Continue &rarr;
              </button>
            </div>
          </div>
        );

      case 'style':
        return (
          <div className="step-content">
            <h2 className="serif-heading">Communication style</h2>
            <p className="step-description">
              Tune how your agent communicates — short and direct or thorough with context.
              You can always change this later.
            </p>
            <hr className="step-hr" />
            <div className="step-body">
              <div className="style-grid">
                {[
                  {
                    key: 'verbosity',
                    label: 'Response Style',
                    desc: 'Concise and direct, or detailed with full context?',
                    options: ['concise', 'detailed'],
                  },
                  {
                    key: 'proactivity',
                    label: 'Proactivity',
                    desc: 'Wait to be asked, or proactively suggest things?',
                    options: ['low', 'medium', 'high'],
                  },
                  {
                    key: 'format',
                    label: 'Format',
                    desc: 'How should messages be structured?',
                    options: ['bullets', 'paragraphs', 'mixed'],
                  },
                ].map((f) => (
                  <div key={f.key} className="style-field">
                    <label className="field-label">{f.label}</label>
                    <div className="field-hint">{f.desc}</div>
                    <div className="pill-group">
                      {f.options.map((o) => (
                        <button
                          key={o}
                          onClick={() => setStyle({ ...style, [f.key]: o })}
                          className={`pill ${(style as any)[f.key] === o ? 'active' : ''}`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={style.emoji}
                    onChange={(e) => setStyle({ ...style, emoji: e.target.checked })}
                  />
                  <span className="checkbox-custom" />
                  <span>Use emoji in responses</span>
                </label>
              </div>
            </div>
            <div className="step-actions">
              <button onClick={prevStep} className="btn-ghost">&larr; Back</button>
              <button onClick={submitOnboarding} className="btn-primary">
                {loading ? 'Saving...' : 'Finish Setup &rarr;'}
              </button>
            </div>
          </div>
        );

      case 'done':
        return (
          <div className="step-content">
            <h2 className="serif-heading">You're all set</h2>
            <p className="step-description">
              Your agent is ready to work with you.
            </p>
            <hr className="step-hr" />
            <div className="done-summary">
              <h3 className="done-summary-heading">Setup Summary</h3>
              <div className="summary-list">
                <div className="summary-row">
                  <span className="summary-label">Google</span>
                  <span className="summary-status">{services.google ? 'Connected' : 'Skipped'}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">GitHub</span>
                  <span className="summary-status">{services.github ? 'Connected' : 'Skipped'}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Granola</span>
                  <span className="summary-status">{granolaSaved || services.granola ? 'Connected' : 'Skipped'}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Slack</span>
                  <span className="summary-status">{userId}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Profile</span>
                  <span className="summary-status">{profile.role || 'Not set'}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Style</span>
                  <span className="summary-status">{style.verbosity} &middot; {style.proactivity}</span>
                </div>
              </div>
            </div>
            <hr className="step-hr" />
            <div className="done-next">
              <h3 className="done-next-heading">What's next?</h3>
              <ul className="next-steps">
                <li>
                  <strong>DM @gruv in Slack</strong> — start a conversation or set up a daily briefing
                </li>
                <li>
                  <strong>Upload your Claude projects</strong> — drag files into{' '}
                  <code>people/{userId}/claude-projects/</code> in the shared Drive
                </li>
                <li>
                  <strong>Connect Granola</strong> — add your API key in Slack with{' '}
                  <code>/gruv connect granola YOUR_KEY</code>
                </li>
              </ul>
            </div>
            <div className="step-actions">
              <button onClick={prevStep} className="btn-ghost">&larr; Back</button>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <p className="bookmark-hint">
                  Bookmark:{' '}
                  <a href={`/?id=${userId}`} className="inline-link">
                    disco-agent-portal.vercel.app/?id={userId}
                  </a>
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Render ──
  return (
    <>
      <div className="app-root">
        {/* Header */}
        <header className="app-header">
          <div className="header-left">
            <span className="header-name">Disco Agent Portal</span>
          </div>
          {userId && (
            <div className="header-user">
              <span>{userId}</span>
            </div>
          )}
        </header>

        {/* Main layout: sidebar + content */}
        <div className="main-layout">
          {/* Sidebar with step navigation */}
          <nav className="sidebar">
            <div className="sidebar-label">Setup</div>
            <ol className="step-list">
              {STEPS.map((s, i) => (
                <li
                  key={s.key}
                  className={`step-item ${
                    i < currentStepIndex
                      ? 'step-done'
                      : i === currentStepIndex
                      ? 'step-current'
                      : ''
                  }`}
                >
                  <button
                    onClick={() => {
                      if (i <= currentStepIndex || STEPS.slice(0, i).every((ps) => {
                        if (ps.key === 'slack') return !!userId;
                        return true;
                      })) {
                        goTo(s.key);
                      }
                    }}
                    className="step-link"
                  >
                    <span className="step-num">{s.num}.</span>
                    <span className="step-label">{s.label}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          {/* Content area */}
          <main className="content-area">
            {/* Toast message */}
            {message && (
              <div className="toast">{message}</div>
            )}

            {renderStep()}
          </main>
        </div>

        {/* Footer */}
        <footer className="app-footer">
          Disco Agent Portal
        </footer>
      </div>

      {/* ── Global styles ── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background: #ffffff;
          color: #1a1a1a;
          font-size: 15px;
          line-height: 1.6;
        }
      `}</style>

      {/* ── Component styles ── */}
      <style jsx>{`
        /* ── Root ── */
        .app-root {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 40px 60px;
          min-height: 100vh;
          background: #ffffff;
        }

        @media (max-width: 768px) {
          .app-root {
            padding: 24px 20px 40px;
          }
        }

        /* ── Header ── */
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 40px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e8e7e4;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header-name {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -0.01em;
        }
        .header-user {
          font-size: 12px;
          color: #787774;
          background: #f7f6f3;
          border: 1px solid #e8e7e4;
          border-radius: 4px;
          padding: 4px 10px;
        }

        /* ── Main layout ── */
        .main-layout {
          display: flex;
          gap: 48px;
        }

        @media (max-width: 768px) {
          .main-layout {
            flex-direction: column;
            gap: 24px;
          }
        }

        /* ── Sidebar ── */
        .sidebar {
          width: 180px;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .sidebar {
            width: 100%;
          }
        }

        .sidebar-label {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 13px;
          font-weight: 600;
          color: #787774;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 12px;
        }

        .step-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        @media (max-width: 768px) {
          .step-list {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 4px;
          }
        }

        .step-item {
          margin: 0;
          padding: 0;
        }

        .step-link {
          display: flex;
          align-items: baseline;
          gap: 6px;
          padding: 5px 8px;
          border: none;
          background: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          color: #787774;
          text-align: left;
          width: 100%;
          border-radius: 4px;
          transition: background 0.1s;
        }

        .step-link:hover {
          background: #f7f6f3;
        }

        .step-num {
          font-size: 12px;
          min-width: 20px;
          color: #b9b7b0;
        }

        .step-label {
          font-size: 14px;
        }

        .step-current .step-link {
          color: #1a1a1a;
          font-weight: 600;
          background: #f7f6f3;
        }

        .step-current .step-num {
          color: #1a1a1a;
        }

        .step-done .step-link {
          color: #787774;
        }

        .step-done .step-num {
          color: #9b9a94;
        }

        /* ── Content area ── */
        .content-area {
          flex: 1;
          min-width: 0;
        }

        .step-content {
          max-width: 520px;
        }

        /* ── Serif headings ── */
        .serif-heading {
          font-family: Georgia, 'Times New Roman', serif;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }

        h1.serif-heading {
          font-size: 32px;
          margin-bottom: 12px;
        }

        h2.serif-heading {
          font-size: 26px;
        }

        @media (max-width: 768px) {
          h1.serif-heading { font-size: 26px; }
          h2.serif-heading { font-size: 22px; }
        }

        /* ── Step description ── */
        .step-description {
          font-size: 15px;
          color: #5a5955;
          line-height: 1.7;
          margin-bottom: 8px;
        }

        /* ── Horizontal rule ── */
        .step-hr {
          border: none;
          border-top: 1px solid #e8e7e4;
          margin: 20px 0;
        }

        /* ── Step body ── */
        .step-body {
          margin-bottom: 24px;
        }

        /* ── Step actions ── */
        .step-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 4px;
        }

        /* ── Buttons ── */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 20px;
          border: 1px solid #1a1a1a;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          background: #1a1a1a;
          color: #ffffff;
          transition: background 0.15s, opacity 0.15s;
        }
        .btn-primary:hover {
          background: #333333;
        }
        .btn-primary:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .btn-ghost {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: #787774;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.15s, background 0.15s;
        }
        .btn-ghost:hover {
          color: #1a1a1a;
          background: #f7f6f3;
        }

        /* ── OAuth buttons ── */
        .oauth-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          border: 1px solid #e8e7e4;
          border-radius: 4px;
          background: #f7f6f3;
          color: #1a1a1a;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          font-family: inherit;
          transition: background 0.15s;
          width: 100%;
        }
        .oauth-btn:hover {
          background: #eeedeb;
        }

        /* ── Or divider ── */
        .or-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 16px 0;
          font-size: 12px;
          color: #b9b7b0;
        }
        .or-divider::before,
        .or-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e8e7e4;
        }

        /* ── Input ── */
        .input-group {
          margin-top: 4px;
        }
        .text-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 4px;
          border: 1px solid #e8e7e4;
          background: #ffffff;
          color: #1a1a1a;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .text-input:focus {
          border-color: #1a1a1a;
          box-shadow: 0 0 0 2px rgba(26,26,26,0.06);
        }
        .text-input::placeholder {
          color: #b9b7b0;
        }
        .input-hint {
          font-size: 12px;
          color: #b9b7b0;
          margin-top: 8px;
        }
        .input-hint strong {
          color: #787774;
        }

        /* ── Connected indicator ── */
        .connected-row {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #f7f6f3;
          border: 1px solid #e8e7e4;
          border-radius: 4px;
          font-size: 14px;
          color: #5a5955;
        }
        .connected-indicator {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #1a1a1a;
          flex-shrink: 0;
        }
        .connected-indicator.green {
          background: #2b9348;
        }

        /* ── Permission list ── */
        .perm-list {
          list-style: none;
          margin-top: 16px;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .perm-list li {
          font-size: 13px;
          color: #787774;
          padding: 6px 0;
        }

        /* ── Setup instructions (GitHub) ── */
        .setup-instructions {
          margin-top: 16px;
          padding: 14px 16px;
          background: #f7f6f3;
          border: 1px solid #e8e7e4;
          border-radius: 4px;
        }
        .setup-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 6px;
        }
        .setup-instructions p {
          font-size: 13px;
          color: #5a5955;
          line-height: 1.6;
        }
        .setup-instructions a {
          color: #1a1a1a;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .setup-instructions code {
          font-size: 12px;
          background: #e8e7e4;
          padding: 1px 5px;
          border-radius: 3px;
          font-family: 'SF Mono', 'Menlo', monospace;
          word-break: break-all;
        }

        /* ── Profile grid ── */
        .profile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        @media (max-width: 640px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
        }
        .field {
          display: flex;
          flex-direction: column;
        }
        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: #1a1a1a;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 2px;
          font-family: Georgia, 'Times New Roman', serif;
        }
        .field-hint {
          font-size: 12px;
          color: #b9b7b0;
          margin-bottom: 6px;
          line-height: 1.4;
        }

        /* ── Style grid ── */
        .style-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .pill-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .pill {
          padding: 6px 16px;
          border-radius: 4px;
          border: 1px solid #e8e7e4;
          background: #ffffff;
          color: #5a5955;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .pill:hover {
          background: #f7f6f3;
          color: #1a1a1a;
        }
        .pill.active {
          background: #1a1a1a;
          border-color: #1a1a1a;
          color: #ffffff;
        }

        /* ── Checkbox ── */
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 14px;
          color: #5a5955;
          user-select: none;
        }
        .checkbox-label input {
          display: none;
        }
        .checkbox-custom {
          width: 16px;
          height: 16px;
          border-radius: 3px;
          border: 1px solid #e8e7e4;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .checkbox-label input:checked + .checkbox-custom {
          background: #1a1a1a;
          border-color: #1a1a1a;
        }
        .checkbox-label input:checked + .checkbox-custom::after {
          content: '';
          width: 4px;
          height: 7px;
          border: solid #ffffff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          margin-top: -1px;
        }

        /* ── Feature list (welcome) ── */
        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }
        .feature-item {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-size: 14px;
          color: #5a5955;
        }
        .feature-icon {
          font-size: 13px;
          font-weight: 600;
          color: #787774;
          min-width: 20px;
        }

        /* ── Done step ── */
        .done-summary {
          margin-bottom: 8px;
        }
        .done-summary-heading,
        .done-next-heading {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 10px;
        }
        .summary-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .summary-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }
        .summary-label {
          color: #5a5955;
          min-width: 70px;
        }
        .summary-status {
          color: #b9b7b0;
        }
        .done-next {
          margin-bottom: 4px;
        }
        .next-steps {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .next-steps li {
          font-size: 14px;
          color: #5a5955;
          line-height: 1.7;
          padding-left: 16px;
          border-left: 2px solid #e8e7e4;
        }
        .next-steps li strong {
          color: #1a1a1a;
        }
        .next-steps li code {
          font-size: 12px;
          background: #f7f6f3;
          padding: 1px 5px;
          border-radius: 3px;
          font-family: 'SF Mono', 'Menlo', monospace;
        }
        .bookmark-hint {
          font-size: 12px;
          color: #b9b7b0;
        }
        .inline-link {
          color: #1a1a1a;
        }

        /* ── Toast ── */
        .toast {
          background: #f7f6f3;
          border: 1px solid #e8e7e4;
          border-radius: 4px;
          padding: 8px 14px;
          margin-bottom: 16px;
          font-size: 13px;
          color: #5a5955;
        }

        /* ── Footer ── */
        .app-footer {
          margin-top: 60px;
          padding-top: 16px;
          border-top: 1px solid #e8e7e4;
          font-size: 12px;
          color: #b9b7b0;
          text-align: center;
        }
      `}</style>
    </>
  );
}
