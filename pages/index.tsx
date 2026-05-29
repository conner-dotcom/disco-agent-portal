import { useState, useEffect, useCallback } from 'react';

function getUrlParam(key: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(key) || '';
}

const WEBHOOK_BASE = 'https://dias-mac-studio.tail4f36cb.ts.net/webhooks';
const TOTAL_STEPS = 7;

// Steps definition
const STEPS = [
  { key: 'welcome', label: 'Welcome', num: 1 },
  { key: 'slack', label: 'Slack ID', num: 2 },
  { key: 'google', label: 'Connect Google', num: 3 },
  { key: 'github', label: 'Connect GitHub', num: 4 },
  { key: 'profile', label: 'Profile', num: 5 },
  { key: 'style', label: 'Style', num: 6 },
  { key: 'done', label: 'Done', num: 7 },
] as const;

type StepKey = typeof STEPS[number]['key'];

export default function Home() {
  const [userId, setUserId] = useState(() => getUrlParam('id') || getUrlParam('userId') || '');
  const [userName, setUserName] = useState(() => getUrlParam('name') || '');
  const [step, setStep] = useState<StepKey>('welcome');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animKey, setAnimKey] = useState(0);
  const [services, setServices] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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

  // Navigate between steps with animation
  const goTo = useCallback((nextStep: StepKey) => {
    const currentIdx = STEPS.findIndex((s) => s.key === step);
    const nextIdx = STEPS.findIndex((s) => s.key === nextStep);
    setDirection(nextIdx > currentIdx ? 'forward' : 'back');
    setAnimKey((k) => k + 1);
    setStep(nextStep);
    setMessage('');
  }, [step]);

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
        setMessage(`${event.data.service} connected!`);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const connectOAuth = (service: string) => {
    if (!userId) {
      setMessage('Enter your Slack User ID first');
      return;
    }
    const popup = window.open(
      `/api/oauth/${service}?user=${userId}`,
      `${service}-oauth`,
      'width=600,height=700'
    );
    if (!popup) {
      setMessage('Please allow popups for this site');
      return;
    }
    setMessage(`Approve the ${service} prompt in the popup window...`);
  };

  // Welcome step - auto-advance timeout
  const [welcomeDone, setWelcomeDone] = useState(false);

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
      setMessage('Profile saved!');
    } catch {
      // non-fatal
    }
    setLoading(false);
    nextStep();
  };

  // ── Step indicator / progress ──
  const currentStepIndex = STEPS.findIndex((s) => s.key === step);
  const progressPct = Math.round((currentStepIndex / (STEPS.length - 1)) * 100);

  // ── Step content ──
  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="step-card" key={`step-${animKey}`}>
            <div className="step-illustration">
              <div className="welcome-graphic">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="38" stroke="url(#gradWelcome)" strokeWidth="2.5" strokeDasharray="6 3" />
                  <circle cx="40" cy="32" r="6" fill="url(#gradWelcome)" />
                  <path d="M25 44c0 8 6.7 14.5 15 14.5S55 52 55 44" stroke="url(#gradWelcome)" strokeWidth="2.5" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="gradWelcome" x1="0" y1="0" x2="80" y2="80">
                      <stop stopColor="#818cf8" />
                      <stop offset="1" stopColor="#c084fc" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h1 className="welcome-title">Welcome to Gruv</h1>
              <p className="welcome-tagline">Your personal AI agent, tuned to how you work.</p>
            </div>
            <div className="welcome-body">
              <p className="welcome-text">
                Gruv is your context-aware AI companion — it lives in Slack, understands your calendar, 
                reads your code, and helps you work smarter. Before we get started, we&apos;ll walk through 
                a quick setup to personalize your experience.
              </p>
              <div className="welcome-features">
                {[
                  { icon: '💬', text: 'Talk to Gruv in Slack — DM or @mention' },
                  { icon: '📊', text: 'Query your company data — no SQL needed' },
                  { icon: '📧', text: 'Calendar, email, GitHub — all connected' },
                  { icon: '⚡', text: 'Personal cron jobs, briefings, and more' },
                ].map((f, i) => (
                  <div key={i} className="welcome-feature" style={{ animationDelay: `${i * 0.1}s` }}>
                    <span className="wf-icon">{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="step-actions">
              <button onClick={() => goTo('slack')} className="btn-primary-lg">
                Get Started →
              </button>
            </div>
          </div>
        );

      case 'slack':
        return (
          <div className="step-card" key={`step-${animKey}`}>
            <div className="step-header">
              <span className="step-number">Step 2</span>
              <h2>Connect your Slack identity</h2>
              <p className="step-why">
                Gruv lives in Slack — it&apos;s where you&apos;ll chat with it every day. 
                We need your Slack ID so Gruv knows who you are and can DM you directly.
              </p>
            </div>
            <div className="step-body">
              {!userId ? (
                <>
                  <a
                    href={`https://slack.com/openid/connect/authorize?response_type=code&client_id=879184060177.11209135000535&scope=openid,profile,email&redirect_uri=${encodeURIComponent(
                      'https://disco-agent-portal.vercel.app/api/oauth/slack'
                    )}`}
                    className="oauth-btn slack-btn"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5 15a3 3 0 013-3h3v3a3 3 0 01-6 0zm3-9a3 3 0 013 3v1H8a3 3 0 010-6zm7 3a3 3 0 013 3v1h-3a3 3 0 010-6zm3 7a3 3 0 01-3 3h-3v-3a3 3 0 016 0z" />
                    </svg>
                    Sign in with Slack
                  </a>
                  <div className="divider">
                    <span>or enter your Slack User ID</span>
                  </div>
                  <div className="input-group">
                    <input
                      placeholder="e.g. URTU2JQCT"
                      onChange={(e) => {
                        if (e.target.value.length >= 8) setUserId(e.target.value.trim());
                      }}
                      className="input-lg"
                    />
                    <p className="input-hint">
                      Slack → Profile → ⋯ → <strong>Copy member ID</strong>
                    </p>
                  </div>
                </>
              ) : (
                <div className="connected-badge">
                  <span className="connected-dot" />
                  <span>Signed in as <strong>{userId}</strong></span>
                </div>
              )}
            </div>
            <div className="step-actions">
              <button onClick={prevStep} className="btn-ghost">← Back</button>
              <button
                onClick={() => nextStep()}
                disabled={!userId}
                className="btn-primary-lg"
              >
                Continue →
              </button>
            </div>
          </div>
        );

      case 'google':
        return (
          <div className="step-card" key={`step-${animKey}`}>
            <div className="step-header">
              <span className="step-number">Step 3</span>
              <h2>Connect Google</h2>
              <p className="step-why">
                Connect Google so Gruv can read your calendar to find the best meeting times, 
                summarize your emails, and store files in your personal Drive folder. 
                Gruv only accesses what you explicitly grant.
              </p>
            </div>
            <div className="step-body">
              {services.google ? (
                <div className="connected-badge success">
                  <span className="connected-dot green" />
                  <span>Google connected</span>
                </div>
              ) : (
                <button onClick={() => connectOAuth('google')} className="oauth-btn google-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Connect Google Account
                </button>
              )}
              <ul className="permission-list">
                <li>📅 Calendar — find your free/busy times</li>
                <li>📧 Gmail — summarize and search email</li>
                <li>📁 Drive — store your files and projects</li>
              </ul>
            </div>
            <div className="step-actions">
              <button onClick={prevStep} className="btn-ghost">← Back</button>
              <button
                onClick={() => nextStep()}
                className="btn-primary-lg"
              >
                Continue →
              </button>
            </div>
          </div>
        );

      case 'github':
        return (
          <div className="step-card" key={`step-${animKey}`}>
            <div className="step-header">
              <span className="step-number">Step 4</span>
              <h2>Connect GitHub</h2>
              <p className="step-why">
                Connect GitHub so Gruv can review PRs, search your codebase, 
                and help you understand changes across your repos. 
                Gruv reads your repos to give you context-aware answers about your code.
              </p>
            </div>
            <div className="step-body">
              {services.github ? (
                <div className="connected-badge success">
                  <span className="connected-dot green" />
                  <span>GitHub connected</span>
                </div>
              ) : (
                <button onClick={() => connectOAuth('github')} className="oauth-btn github-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Connect GitHub Account
                </button>
              )}
              <ul className="permission-list">
                <li>🐙 Repos — search and understand your code</li>
                <li>🔀 Pull Requests — review and summarize PRs</li>
                <li>📋 Issues — track work across projects</li>
              </ul>
            </div>
            <div className="step-actions">
              <button onClick={prevStep} className="btn-ghost">← Back</button>
              <button
                onClick={() => nextStep()}
                className="btn-primary-lg"
              >
                Continue →
              </button>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="step-card" key={`step-${animKey}`}>
            <div className="step-header">
              <span className="step-number">Step 5</span>
              <h2>Tell Gruv about yourself</h2>
              <p className="step-why">
                The more Gruv knows about your role and goals, the more helpful it can be. 
                This helps Gruv prioritize information and tailor its responses to what matters to you.
              </p>
            </div>
            <div className="step-body">
              <div className="profile-grid">
                {[
                  { key: 'role', label: 'Role', placeholder: 'Product Engineer', hint: 'What do you do at Disco?' },
                  { key: 'team', label: 'Team', placeholder: 'Marketplace', hint: 'Which team are you on?' },
                  { key: 'timezone', label: 'Timezone', placeholder: 'America/Los_Angeles' },
                  { key: 'focus', label: 'Current Focus', placeholder: 'Auction model optimization, Q2 planning', hint: 'Top 1-2 things you\'re focused on right now' },
                  { key: 'goals', label: 'Goals / Bets', placeholder: 'Ship auction V2 by EOM', hint: 'What outcomes are you driving toward?' },
                ].map((f) => (
                  <div key={f.key} className="field">
                    <label className="field-label">{f.label}</label>
                    {f.hint && <div className="field-hint">{f.hint}</div>}
                    <input
                      value={(profile as any)[f.key]}
                      onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="field-input"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="step-actions">
              <button onClick={prevStep} className="btn-ghost">← Back</button>
              <button onClick={() => nextStep()} className="btn-primary-lg">
                Continue →
              </button>
            </div>
          </div>
        );

      case 'style':
        return (
          <div className="step-card" key={`step-${animKey}`}>
            <div className="step-header">
              <span className="step-number">Step 6</span>
              <h2>Set your communication style</h2>
              <p className="step-why">
                Tune how Gruv communicates with you — short and punchy or thorough with context. 
                You can always change this later.
              </p>
            </div>
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
                    desc: 'How should Gruv structure its messages?',
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
              <button onClick={prevStep} className="btn-ghost">← Back</button>
              <button onClick={submitOnboarding} className="btn-primary-lg">
                {loading ? 'Saving...' : 'Finish Setup →'}
              </button>
            </div>
          </div>
        );

      case 'done':
        return (
          <div className="step-card" key={`step-${animKey}`}>
            <div className="step-illustration done-illustration">
              <div className="done-check">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="30" stroke="url(#gradDone)" strokeWidth="3" />
                  <path d="M20 32l8 8 16-16" stroke="url(#gradDone)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <defs>
                    <linearGradient id="gradDone" x1="0" y1="0" x2="64" y2="64">
                      <stop stopColor="#22c55e" />
                      <stop offset="1" stopColor="#16a34a" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h1 className="done-title">You&apos;re all set!</h1>
              <p className="done-subtitle">Gruv is ready to work with you.</p>
            </div>
            <div className="done-summary">
              <h3>Setup Summary</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-icon">{services.google ? '✅' : '⬜'}</span>
                  <span className="summary-label">Google</span>
                  <span className="summary-status">{services.google ? 'Connected' : 'Skipped'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-icon">{services.github ? '✅' : '⬜'}</span>
                  <span className="summary-label">GitHub</span>
                  <span className="summary-status">{services.github ? 'Connected' : 'Skipped'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-icon">✅</span>
                  <span className="summary-label">Slack</span>
                  <span className="summary-status">{userId}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-icon">{profile.role ? '✅' : '⬜'}</span>
                  <span className="summary-label">Profile</span>
                  <span className="summary-status">{profile.role || 'Not set'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-icon">✅</span>
                  <span className="summary-label">Style</span>
                  <span className="summary-status">{style.verbosity} · {style.proactivity}</span>
                </div>
              </div>
            </div>
            <div className="done-next">
              <h3>What&apos;s next?</h3>
              <ul className="next-steps">
                <li>
                  <strong>DM @gruv in Slack</strong> — start a conversation, ask a question, 
                  or set up a daily briefing
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
              <button onClick={prevStep} className="btn-ghost">← Back</button>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <p className="done-url-hint">
                  Bookmark this page to come back anytime.{' '}
                  <a href={`/?id=${userId}`} className="link">
                    {`disco-agent-portal.vercel.app/?id=${userId}`}
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
          <div className="header-brand">
            <svg width="28" height="28" viewBox="0 0 56 56" fill="none" className="header-logo">
              <circle cx="28" cy="28" r="26" stroke="url(#logoGrad)" strokeWidth="3" />
              <path d="M18 28c0 5.5 4.5 10 10 10s10-4.5 10-10" stroke="url(#logoGrad)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="28" cy="22" r="4" fill="url(#logoGrad)" />
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="56" y2="56">
                  <stop stopColor="#818cf8" />
                  <stop offset="1" stopColor="#c084fc" />
                </linearGradient>
              </defs>
            </svg>
            <span className="header-name">Gruv</span>
            <span className="header-badge">BETA</span>
          </div>
          {userId && (
            <div className="header-user">
              <span className="user-dot" />
              <span>{userId}</span>
            </div>
          )}
        </header>

        {/* Progress bar */}
        <div className="progress-container">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="progress-steps">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className={`progress-step ${i < currentStepIndex ? 'done' : ''} ${i === currentStepIndex ? 'active' : ''}`}
              >
                <div className="progress-dot">
                  {i < currentStepIndex ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="dot-num">{s.num}</span>
                  )}
                </div>
                <span className="progress-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Toast message */}
        {message && (
          <div className="toast" key={message}>
            {message}
          </div>
        )}

        {/* Step content */}
        <main className={`step-container anim-${direction}`} key={animKey}>
          {renderStep()}
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <span>Gruv — your Disco AI agent</span>
          <span className="footer-dot">·</span>
          <span>v1.0</span>
        </footer>
      </div>

      {/* ── Global styles ── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background: #08080c;
          color: #e2e8f0;
        }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideRight {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeSlideLeft {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8); }
          60% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* ── Component styles ── */}
      <style jsx>{`
        /* ── Root ── */
        .app-root {
          max-width: 600px;
          margin: 0 auto;
          padding: 32px 24px 60px;
          min-height: 100vh;
          background: #08080c;
          background-image:
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 100%, rgba(168,85,247,0.04) 0%, transparent 60%);
        }

        @media (max-width: 640px) {
          .app-root {
            padding: 20px 16px 40px;
          }
        }

        /* ── Header ── */
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          animation: fadeSlideUp 0.5s ease;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .header-logo {
          flex-shrink: 0;
        }
        .header-name {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #e0e7ff, #c4b5fd);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .header-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #a78bfa;
          border: 1px solid rgba(167,139,250,0.3);
          border-radius: 12px;
          padding: 3px 10px;
        }
        .header-user {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 5px 12px;
        }
        .user-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34,197,94,0.5);
          animation: pulse 2s ease-in-out infinite;
        }

        /* ── Progress Bar ── */
        .progress-container {
          margin-bottom: 28px;
          animation: fadeSlideUp 0.5s ease 0.1s both;
        }
        .progress-track {
          height: 4px;
          background: rgba(255,255,255,0.06);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 14px;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa);
          border-radius: 2px;
          transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }
        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 2s ease-in-out infinite;
        }
        .progress-steps {
          display: flex;
          justify-content: space-between;
        }
        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .progress-dot {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .progress-step.active .progress-dot {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-color: #8b5cf6;
          box-shadow: 0 0 12px rgba(99,102,241,0.4);
          transform: scale(1.15);
        }
        .progress-step.done .progress-dot {
          background: #22c55e;
          border-color: #22c55e;
        }
        .dot-num {
          font-size: 9px;
          font-weight: 700;
          color: rgba(255,255,255,0.4);
        }
        .progress-step.active .dot-num {
          color: #fff;
        }
        .progress-label {
          font-size: 9px;
          color: rgba(255,255,255,0.25);
          font-weight: 500;
          white-space: nowrap;
          max-width: 52px;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: color 0.3s;
        }
        .progress-step.active .progress-label {
          color: rgba(255,255,255,0.7);
          font-weight: 600;
        }
        .progress-step.done .progress-label {
          color: rgba(255,255,255,0.35);
        }

        @media (max-width: 640px) {
          .progress-label {
            font-size: 8px;
            max-width: 40px;
          }
        }

        /* ── Toast ── */
        .toast {
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 10px;
          padding: 10px 16px;
          margin-bottom: 16px;
          font-size: 13px;
          color: rgba(255,255,255,0.75);
          animation: fadeSlideUp 0.3s ease;
        }

        /* ── Step container ── */
        .step-container {
          animation: fadeSlideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .step-container.anim-back {
          animation: fadeSlideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* ── Step card ── */
        .step-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 36px 32px;
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 40px rgba(0,0,0,0.3);
        }

        @media (max-width: 640px) {
          .step-card {
            padding: 24px 20px;
            border-radius: 16px;
          }
        }

        /* ── Step header ── */
        .step-header {
          margin-bottom: 28px;
        }
        .step-number {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #a78bfa;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .step-header h2 {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.03em;
          margin-bottom: 8px;
          color: #f1f5f9;
        }
        .step-why {
          font-size: 14px;
          color: rgba(255,255,255,0.45);
          line-height: 1.7;
        }

        @media (max-width: 640px) {
          .step-header h2 {
            font-size: 20px;
          }
          .step-why {
            font-size: 13px;
          }
        }

        /* ── Step body ── */
        .step-body {
          margin-bottom: 28px;
        }

        /* ── Step actions ── */
        .step-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 8px;
        }

        /* ── Buttons ── */
        .btn-primary-lg {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 13px 28px;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: #fff;
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-primary-lg:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(99,102,241,0.5);
        }
        .btn-primary-lg:active {
          transform: translateY(0);
        }
        .btn-primary-lg:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .btn-ghost {
          padding: 10px 20px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          background: transparent;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
        }
        .btn-ghost:hover {
          border-color: rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.8);
        }

        /* ── OAuth buttons ── */
        .oauth-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 24px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          font-family: inherit;
          transition: all 0.2s;
          width: 100%;
          justify-content: center;
        }
        .oauth-btn:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.18);
          transform: translateY(-1px);
        }
        .slack-btn { border-color: rgba(74,21,75,0.6); background: rgba(74,21,75,0.2); }
        .slack-btn:hover { border-color: rgba(74,21,75,0.8); background: rgba(74,21,75,0.3); }
        .google-btn { border-color: rgba(66,133,244,0.3); background: rgba(66,133,244,0.08); }
        .google-btn:hover { border-color: rgba(66,133,244,0.5); background: rgba(66,133,244,0.14); }
        .github-btn { border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); }
        .github-btn:hover { border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.07); }

        /* ── Divider ── */
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
          font-size: 11px;
          color: rgba(255,255,255,0.2);
        }
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.06);
        }

        /* ── Input ── */
        .input-group {
          margin-top: 8px;
        }
        .input-lg {
          width: 100%;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: #fff;
          font-size: 15px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          text-align: center;
          letter-spacing: 0.02em;
        }
        .input-lg:focus {
          border-color: rgba(139,92,246,0.4);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
          background: rgba(255,255,255,0.05);
        }
        .input-lg::placeholder { color: rgba(255,255,255,0.15); }
        .input-hint {
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          margin-top: 10px;
          text-align: center;
        }
        .input-hint strong { color: rgba(255,255,255,0.35); }

        /* ── Connected badge ── */
        .connected-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          font-size: 14px;
          color: rgba(255,255,255,0.6);
        }
        .connected-badge.success {
          background: rgba(34,197,94,0.06);
          border-color: rgba(34,197,94,0.2);
          color: #4ade80;
        }
        .connected-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #8b5cf6;
          box-shadow: 0 0 8px rgba(139,92,246,0.5);
          display: inline-block;
          animation: pulse 2s ease-in-out infinite;
        }
        .connected-dot.green {
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34,197,94,0.5);
        }

        /* ── Permission list ── */
        .permission-list {
          list-style: none;
          margin-top: 20px;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .permission-list li {
          font-size: 13px;
          color: rgba(255,255,255,0.35);
          padding: 8px 14px;
          background: rgba(255,255,255,0.02);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.03);
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
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,0.6);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 2px;
        }
        .field-hint {
          font-size: 12px;
          color: rgba(255,255,255,0.25);
          margin-bottom: 8px;
          line-height: 1.4;
        }
        .field-input {
          padding: 11px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: #fff;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .field-input:focus {
          border-color: rgba(99,102,241,0.4);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
          background: rgba(255,255,255,0.05);
        }
        .field-input::placeholder { color: rgba(255,255,255,0.12); }

        /* ── Style grid ── */
        .style-grid {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .style-field {}
        .pill-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .pill {
          padding: 8px 20px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.45);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .pill:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.65);
        }
        .pill.active {
          background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3));
          border-color: rgba(99,102,241,0.4);
          color: #fff;
          box-shadow: 0 2px 12px rgba(99,102,241,0.2);
        }

        /* ── Checkbox ── */
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 13px;
          color: rgba(255,255,255,0.6);
          user-select: none;
        }
        .checkbox-label input { display: none; }
        .checkbox-custom {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.03);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .checkbox-label input:checked + .checkbox-custom {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          border-color: transparent;
        }
        .checkbox-label input:checked + .checkbox-custom::after {
          content: '';
          width: 5px;
          height: 9px;
          border: solid #fff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          margin-top: -2px;
        }

        /* ── Welcome step ── */
        .step-illustration {
          text-align: center;
          margin-bottom: 28px;
          animation: popIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .welcome-title {
          font-size: 36px;
          font-weight: 800;
          letter-spacing: -0.04em;
          margin: 16px 0 8px;
          background: linear-gradient(135deg, #e0e7ff 0%, #c4b5fd 50%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .welcome-tagline {
          font-size: 16px;
          color: rgba(255,255,255,0.45);
        }
        .welcome-body {
          margin-bottom: 28px;
        }
        .welcome-text {
          font-size: 14px;
          color: rgba(255,255,255,0.5);
          line-height: 1.8;
          margin-bottom: 24px;
          text-align: center;
        }
        .welcome-features {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .welcome-feature {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 12px;
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          opacity: 0;
          animation: fadeSlideUp 0.4s ease forwards;
        }
        .wf-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        /* ── Done step ── */
        .done-illustration {
          text-align: center;
          margin-bottom: 24px;
          animation: popIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .done-check {
          display: inline-block;
        }
        .done-title {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 12px 0 4px;
          background: linear-gradient(135deg, #bbf7d0, #4ade80);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .done-subtitle {
          font-size: 15px;
          color: rgba(255,255,255,0.45);
        }
        .done-summary {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .done-summary h3 {
          font-size: 14px;
          font-weight: 700;
          color: rgba(255,255,255,0.6);
          margin-bottom: 14px;
          letter-spacing: 0.02em;
        }
        .summary-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .summary-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
        }
        .summary-icon {
          flex-shrink: 0;
          width: 24px;
          text-align: center;
        }
        .summary-label {
          color: rgba(255,255,255,0.5);
          min-width: 70px;
        }
        .summary-status {
          color: rgba(255,255,255,0.3);
        }
        .done-next {
          margin-bottom: 24px;
        }
        .done-next h3 {
          font-size: 14px;
          font-weight: 700;
          color: rgba(255,255,255,0.6);
          margin-bottom: 12px;
        }
        .next-steps {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .next-steps li {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          line-height: 1.7;
          padding-left: 8px;
          border-left: 2px solid rgba(255,255,255,0.06);
        }
        .next-steps li strong {
          color: rgba(255,255,255,0.65);
        }
        .next-steps li code {
          background: rgba(255,255,255,0.05);
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 12px;
        }
        .done-url-hint {
          font-size: 12px;
          color: rgba(255,255,255,0.25);
        }
        .link {
          color: rgba(139,92,246,0.6);
          text-decoration: none;
        }
        .link:hover {
          color: rgba(139,92,246,0.8);
        }

        /* ── Footer ── */
        .app-footer {
          text-align: center;
          margin-top: 40px;
          font-size: 11px;
          color: rgba(255,255,255,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .footer-dot {
          opacity: 0.3;
        }

        @media (max-width: 640px) {
          .welcome-title { font-size: 28px; }
          .done-title { font-size: 26px; }
          .done-url-hint {
            font-size: 10px;
          }
        }
      `}</style>
    </>
  );
}
