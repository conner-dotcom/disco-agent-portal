import { useState, useEffect } from 'react';

function getUrlParam(key: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(key) || '';
}

const CLOUDFLARE_WORKER = 'https://dias-mac-studio.tail4f36cb.ts.net/webhooks';

export default function Home() {
  const [userId, setUserId] = useState(() => getUrlParam('id') || getUrlParam('userId') || '');
  const [userName, setUserName] = useState(() => getUrlParam('name') || '');
  const [tab, setTab] = useState<'services' | 'profile' | 'style' | 'projects' | 'guide'>('guide');
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    role: '',
    team: '',
    timezone: 'America/Los_Angeles',
    focus: '',
    goals: '',
    collaborators: '',
  });
  const [style, setStyle] = useState({
    verbosity: 'concise',
    proactivity: 'medium',
    humor: 'medium',
    format: 'bullets',
    emoji: true,
  });
  const [services, setServices] = useState<Record<string, boolean>>({});
  const [showGranolaKey, setShowGranolaKey] = useState(false);
  const [granolaKey, setGranolaKey] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [animIn, setAnimIn] = useState(false);

  const tabs = [
    { key: 'guide' as const, label: 'Guide' },
    { key: 'services' as const, label: 'Services' },
    { key: 'profile' as const, label: 'Profile' },
    { key: 'style' as const, label: 'Style' },
    { key: 'projects' as const, label: 'Projects' },
  ];

  useEffect(() => {
    requestAnimationFrame(() => setAnimIn(true));
  }, []);

  useEffect(() => {
    setAnimIn(false);
    const t = setTimeout(() => setAnimIn(true), 50);
    return () => clearTimeout(t);
  }, [tab]);

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
    setMessage(`Approve the ${service} prompt in the window that opened`);
  };

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'oauth-connected') {
        setServices((s) => ({ ...s, [event.data.service]: true }));
        setMessage(`✓ ${event.data.service} connected!`);
        if (event.data.service === 'google' && userId) {
          fetch(`${CLOUDFLARE_WORKER}/onboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, slackId: userId, service: 'google' }),
          }).catch(() => {});
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [userId]);

  const saveGranolaKey = async () => {
    if (!userId || !granolaKey) return;
    await fetch(`${CLOUDFLARE_WORKER}/oauth-granola`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, apiKey: granolaKey, service: 'granola' }),
    });
    setServices((s) => ({ ...s, granola: true }));
    setShowGranolaKey(false);
    setMessage('Granola connected!');
  };

  const saveProfile = async () => {
    if (!userId) return;
    setLoading(true);
    await fetch(`${CLOUDFLARE_WORKER}/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, displayName: userId, ...profile, ...style }),
    });
    setSaved(true);
    setLoading(false);
    setMessage('Profile saved! Rhythm will use this to personalize your experience.');
  };

  // ── Sign‑in screen ──────────────────────────────────────────────────────
  if (!userId) {
    return (
      <>
        <div className="signin-root">
          <div className="signin-card">
            <div className="signin-badge">BETA</div>
            <div className="signin-logo">
              <div className="logo-icon">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  <circle cx="28" cy="28" r="26" stroke="url(#lg)" strokeWidth="3" />
                  <path d="M18 28c0 5.5 4.5 10 10 10s10-4.5 10-10" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="28" cy="22" r="4" fill="url(#lg)" />
                  <defs>
                    <linearGradient id="lg" x1="0" y1="0" x2="56" y2="56">
                      <stop stopColor="#818cf8" />
                      <stop offset="1" stopColor="#c084fc" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
            <h1 className="signin-title">Rhythm</h1>
            <p className="signin-subtitle">Your personal AI agent, tuned to how you work.</p>
            <p className="signin-desc">
              Connect your accounts, set your preferences, and make Rhythm yours — your
              context-aware companion across Slack, Gmail, Calendar, GitHub, and beyond.
            </p>
            <a
              href={`https://slack.com/openid/connect/authorize?response_type=code&client_id=879184060177.11209135000535&scope=openid,profile,email&redirect_uri=${encodeURIComponent(
                'https://disco-agent-portal.vercel.app/api/oauth/slack'
              )}`}
              className="signin-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 15a3 3 0 013-3h3v3a3 3 0 01-6 0zm3-9a3 3 0 013 3v1H8a3 3 0 010-6zm7 3a3 3 0 013 3v1h-3a3 3 0 010-6zm3 7a3 3 0 01-3 3h-3v-3a3 3 0 016 0z" />
              </svg>
              Sign in with Slack
            </a>
            <div className="signin-divider">
              <span>or enter your Slack User ID</span>
            </div>
            <input
              placeholder="URTU2JQCT"
              onChange={(e) => {
                if (e.target.value.length > 8) setUserId(e.target.value);
              }}
              className="signin-input"
            />
            <p className="signin-hint">
              Slack → Profile → ⋯ → <strong>Copy member ID</strong>
            </p>
          </div>
        </div>
        <style jsx>{`
          .signin-root {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0a0a0f;
            background-image:
              radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%),
              radial-gradient(ellipse 60% 50% at 80% 100%, rgba(168,85,247,0.08) 0%, transparent 60%),
              radial-gradient(ellipse 40% 40% at 20% 80%, rgba(59,130,246,0.06) 0%, transparent 60%);
            padding: 24px;
          }
          .signin-card {
            width: 100%;
            max-width: 440px;
            text-align: center;
            animation: fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .signin-badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            color: #a78bfa;
            border: 1px solid rgba(167,139,250,0.3);
            border-radius: 20px;
            padding: 4px 14px;
            margin-bottom: 24px;
          }
          .signin-logo { margin-bottom: 20px; }
          .logo-icon { display: inline-block; }
          .signin-title {
            font-size: 52px;
            font-weight: 800;
            letter-spacing: -0.04em;
            margin: 0;
            background: linear-gradient(135deg, #e0e7ff 0%, #c4b5fd 50%, #a5b4fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .signin-subtitle {
            font-size: 17px;
            color: rgba(255,255,255,0.7);
            margin-top: 8px;
            margin-bottom: 0;
          }
          .signin-desc {
            font-size: 14px;
            color: rgba(255,255,255,0.45);
            line-height: 1.7;
            margin-top: 16px;
            margin-bottom: 32px;
          }
          .signin-btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 14px 40px;
            font-size: 16px;
            font-weight: 600;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            text-decoration: none;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: #fff;
            box-shadow: 0 4px 24px rgba(99,102,241,0.35);
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .signin-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(99,102,241,0.5);
          }
          .signin-divider {
            margin-top: 32px;
            margin-bottom: 16px;
            font-size: 12px;
            color: rgba(255,255,255,0.3);
            position: relative;
          }
          .signin-divider::before,
          .signin-divider::after {
            content: '';
            position: absolute;
            top: 50%;
            width: 60px;
            height: 1px;
            background: rgba(255,255,255,0.1);
          }
          .signin-divider::before { left: 0; }
          .signin-divider::after { right: 0; }
          .signin-input {
            margin-top: 8px;
            padding: 12px 20px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.04);
            color: #fff;
            font-size: 16px;
            width: 200px;
            text-align: center;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
          }
          .signin-input:focus {
            border-color: rgba(139,92,246,0.5);
            box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
          }
          .signin-input::placeholder { color: rgba(255,255,255,0.2); }
          .signin-hint {
            font-size: 12px;
            color: rgba(255,255,255,0.25);
            margin-top: 10px;
          }
          @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </>
    );
  }

  // ── Main portal ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="portal-root">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <div className="logo-sm">
              <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="26" stroke="url(#lg2)" strokeWidth="3" />
                <path d="M18 28c0 5.5 4.5 10 10 10s10-4.5 10-10" stroke="url(#lg2)" strokeWidth="3" strokeLinecap="round" />
                <circle cx="28" cy="22" r="4" fill="url(#lg2)" />
                <defs>
                  <linearGradient id="lg2" x1="0" y1="0" x2="56" y2="56">
                    <stop stopColor="#818cf8" />
                    <stop offset="1" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1 className="header-title">Rhythm</h1>
              <p className="header-sub">Your Disco AI agent</p>
            </div>
          </div>
          <div className="header-right">
            <div className="online-badge">
              <span className="pulse-dot" />
              <span>{userId}</span>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <nav className="tab-bar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`tab-item ${tab === t.key ? 'active' : ''}`}
            >
              {t.label}
            </button>
          ))}
          <div className="tab-underline" style={{ '--idx': tabs.findIndex((t) => t.key === tab) } as React.CSSProperties} />
        </nav>

        {/* Message toast */}
        {message && (
          <div className="toast" key={message}>
            {message}
          </div>
        )}

        {/* Tab content */}
        <main className={`tab-content ${animIn ? 'in' : ''}`}>
          {/* ── Guide ── */}
          {tab === 'guide' && (
            <section className="card">
              <h3 className="card-title">Welcome to Rhythm</h3>
              <p className="card-desc">
                Your personal AI agent with access to all of Disco&apos;s data and
                tools.
              </p>
              <div className="guide-grid">
                {[
                  {
                    icon: '💬',
                    title: 'Talk to Rhythm',
                    lines: [
                      'DM <strong>@rhythm</strong> in Slack anytime',
                      'In channels, just @mention rhythm',
                      'Each DM thread is a separate workspace — start a new thread for each project',
                      'Rhythm remembers context within each thread',
                    ],
                  },
                  {
                    icon: '📊',
                    title: 'Data & Analytics',
                    lines: [
                      '<code>"how many users signed up last week?"</code>',
                      '<code>"show me Q2 revenue by channel"</code>',
                      '<code>"what is our conversion rate this month?"</code>',
                      'Rhythm queries Snowflake directly — no SQL needed',
                      "Uses Disco's semantic models for accurate answers",
                    ],
                  },
                  {
                    icon: '🎙',
                    title: 'Customer Intelligence',
                    lines: [
                      '<code>"summarize the last Gong call with Lunya"</code>',
                      '<code>"what did we discuss with True Classic?"</code>',
                      '<code>"find recent calls about marketplace pricing"</code>',
                      'Pulls transcripts, highlights, and action items',
                    ],
                  },
                  {
                    icon: '💰',
                    title: 'Pipeline & Deals',
                    lines: [
                      '<code>"what deals moved this week?"</code>',
                      '<code>"show me HubSpot pipeline by stage"</code>',
                      '<code>"what is the status of the parcelLab deal?"</code>',
                      'Live HubSpot data — stages, amounts, owners',
                    ],
                  },
                  {
                    icon: '🔧',
                    title: 'Engineering',
                    lines: [
                      '<code>"where does auction logic live in the codebase?"</code>',
                      '<code>"review the last 5 PRs in backend"</code>',
                      '<code>"what changed in the iOS SDK this sprint?"</code>',
                      'Knows every repo, can review code, find bugs',
                    ],
                  },
                  {
                    icon: '📝',
                    title: 'Your Personal Context',
                    lines: [
                      '<code>"what is on my calendar tomorrow?"</code>',
                      '<code>"summarize my Granola notes from this week"</code>',
                      '<code>"find my notes about the Q2 planning session"</code>',
                      'Connect Gmail, Calendar, Granola on the Services tab',
                    ],
                  },
                  {
                    icon: '⏰',
                    title: 'Personal Cron Jobs',
                    lines: [
                      '<code>"send me a daily briefing every morning at 8am"</code>',
                      '<code>"check for new Gong calls every hour and DM me summaries"</code>',
                      '<code>"remind me about open PRs every Monday"</code>',
                      'Cron jobs run on your schedule — set and forget',
                    ],
                  },
                  {
                    icon: '🎨',
                    title: 'Make Rhythm Yours',
                    lines: [
                      'Set your working style on the Style tab (concise vs detailed)',
                      'Tell Rhythm your goals and focus areas on the Profile tab',
                      'Rhythm adapts to how you work — the more you use it, the better it gets',
                      'Each thread is a project workspace — stay organized',
                    ],
                  },
                ].map((section, i) => (
                  <div key={i} className="guide-item" style={{ animationDelay: `${i * 0.06}s` } as React.CSSProperties}>
                    <div className="guide-item-icon">{section.icon}</div>
                    <div className="guide-item-title">{section.title}</div>
                    <ul className="guide-item-list">
                      {section.lines.map((line, j) => (
                        <li key={j} dangerouslySetInnerHTML={{ __html: line }} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Services ── */}
          {tab === 'services' && (
            <section className="card">
              <h3 className="card-title">Connected Services</h3>
              <p className="card-desc">Link your accounts so Rhythm can work across your tools.</p>
              <div className="services-list">
                {[
                  { icon: '📧', name: 'Google', desc: 'Gmail, Calendar, Drive', key: 'google' },
                  { icon: '🐙', name: 'GitHub', desc: 'Repos, PRs, code', key: 'github' },
                ].map((s) => (
                  <div key={s.key} className="svc-row">
                    <div className="svc-info">
                      <span className="svc-icon">{s.icon}</span>
                      <div>
                        <div className="svc-name">{s.name}</div>
                        <div className="svc-desc">{s.desc}</div>
                      </div>
                    </div>
                    <div className="svc-action">
                      {services[s.key] ? (
                        <span className="svc-connected">
                          <span className="pulse-dot green" />
                          Connected
                        </span>
                      ) : (
                        <button onClick={() => connectOAuth(s.key)} className="btn btn-primary">
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {/* Granola */}
                <div className="svc-row">
                  <div className="svc-info">
                    <span className="svc-icon">📝</span>
                    <div>
                      <div className="svc-name">Granola</div>
                      <div className="svc-desc">Meeting notes & transcripts</div>
                    </div>
                  </div>
                  <div className="svc-action">
                    {services.granola ? (
                      <span className="svc-connected">
                        <span className="pulse-dot green" />
                        Connected
                      </span>
                    ) : showGranolaKey ? (
                      <div className="granola-form">
                        <input
                          value={granolaKey}
                          onChange={(e) => setGranolaKey(e.target.value)}
                          placeholder="Paste API key"
                          className="input-sm"
                        />
                        <button onClick={saveGranolaKey} className="btn btn-success btn-sm">
                          Save
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setShowGranolaKey(true)} className="btn btn-success">
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Profile ── */}
          {tab === 'profile' && (
            <section className="card">
              <h3 className="card-title">Your Profile</h3>
              <p className="card-desc">
                Help Rhythm understand who you are and what you&apos;re working on.
              </p>
              <div className="profile-grid">
                {[
                  { key: 'role', label: 'Role', placeholder: 'Product Engineer', hint: 'What do you do at Disco?' },
                  { key: 'team', label: 'Team', placeholder: 'Marketplace', hint: 'Which team are you on?' },
                  { key: 'timezone', label: 'Timezone', placeholder: 'America/Los_Angeles' },
                  { key: 'focus', label: 'Current Focus', placeholder: 'Auction model optimization, Q2 planning', hint: 'What are you working on right now? Top 1-2 things.' },
                  { key: 'goals', label: 'Goals / Bets', placeholder: 'Ship auction V2 by EOM', hint: 'What outcomes are you driving toward?' },
                  { key: 'collaborators', label: 'Key Collaborators', placeholder: 'Aaron, Gaurav, Lydia', hint: 'Who do you work with most? (@names)' },
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
            </section>
          )}

          {/* ── Style ── */}
          {tab === 'style' && (
            <section className="card">
              <h3 className="card-title">How Rhythm Works With You</h3>
              <p className="card-desc">
                Tune how Rhythm communicates — short & punchy or thorough with
                context.
              </p>
              <div className="style-grid">
                {[
                  {
                    key: 'verbosity',
                    label: 'Response Style',
                    desc: 'Short and punchy, or thorough with context?',
                    options: ['concise', 'detailed'],
                  },
                  {
                    key: 'proactivity',
                    label: 'Proactivity',
                    desc: 'Wait to be asked, or suggest things unprompted?',
                    options: ['low', 'medium', 'high'],
                  },
                  {
                    key: 'format',
                    label: 'Format',
                    desc: 'How should I structure responses?',
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
            </section>
          )}

          {/* ── Projects ── */}
          {tab === 'projects' && (
            <section className="card">
              <h3 className="card-title">Import Your Claude Projects</h3>
              <p className="card-desc">
                Centralize your work so Rhythm knows everything you&apos;ve built.
              </p>

              <div className="project-panel gdrive-panel">
                <div className="panel-header">
                  <span className="panel-icon">📂</span>
                  <span className="panel-title">Your GDrive Folder</span>
                </div>
                <p className="panel-body">
                  All your projects live in{' '}
                  <strong>
                    Disco Agent Workspace → people → {userId} → claude-projects
                  </strong>
                </p>
                <a
                  href="https://drive.google.com/drive/folders/0ADzUC74f0zEaUk9PVA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Open in Google Drive
                </a>
              </div>

              <div className="project-panel upload-panel">
                <div className="panel-header">
                  <span className="panel-icon">📤</span>
                  <span className="panel-title">Upload Files</span>
                </div>
                <p className="panel-body">
                  Upload Claude project files (.md, .json, .claude/) or any working
                  documents. Rhythm will index them into GBrain so you can search and
                  reference them.
                </p>
                <label className="upload-btn">
                  <span>Choose files</span>
                  <input
                    type="file"
                    multiple
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || !userId) return;
                      setMessage(`Uploading ${files.length} files...`);
                      const formData = new FormData();
                      for (let i = 0; i < Math.min(files.length, 20); i++)
                        formData.append('files', files[i]);
                      formData.append('userId', userId);
                      try {
                        await fetch('/api/upload', { method: 'POST', body: formData });
                        setMessage(
                          `Uploaded ${Math.min(files.length, 20)} files! Rhythm will index them shortly.`
                        );
                      } catch {
                        setMessage('Upload failed — try dragging files to your GDrive folder instead.');
                      }
                    }}
                    className="sr-only"
                  />
                </label>
              </div>

              <div className="tip-banner">
                <strong>💡 Tip:</strong> For Claude Code projects, go to{' '}
                <code>~/.claude/projects/</code> on your Mac, drag the project folders
                into your GDrive folder above. Rhythm auto-indexes new files within 30
                minutes.
              </div>
            </section>
          )}
        </main>

        {/* Save button */}
        <div className="save-bar">
          <button
            onClick={saveProfile}
            disabled={loading}
            className={`btn-save ${saved ? 'saved' : ''}`}
          >
            {loading ? (
              <span className="spinner" />
            ) : saved ? (
              '✓ Profile Saved'
            ) : (
              'Save Profile'
            )}
          </button>
        </div>
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
        }

        /* Keyframes */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <style jsx>{`
        /* Root */
        .portal-root {
          max-width: 720px;
          margin: 0 auto;
          padding: 32px 24px 80px;
          min-height: 100vh;
          background: #0a0a0f;
          background-image:
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 100%, rgba(168,85,247,0.05) 0%, transparent 70%);
          color: #f1f5f9;
        }

        @media (max-width: 600px) {
          .portal-root {
            padding: 20px 16px 80px;
          }
        }

        /* Header */
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          animation: fadeIn 0.6s ease;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-sm {
          display: flex;
          align-items: center;
        }
        .header-title {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #e0e7ff, #c4b5fd);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.1;
        }
        .header-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          margin-top: 1px;
        }
        .header-right {
          display: flex;
          align-items: center;
        }
        .online-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 6px 14px;
        }

        /* Pulsing dot */
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34,197,94,0.6);
          animation: pulse 2s ease-in-out infinite;
          display: inline-block;
        }
        .pulse-dot.green {
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34,197,94,0.6);
        }

        /* Tab bar */
        .tab-bar {
          position: relative;
          display: flex;
          gap: 2px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 4px;
          margin-bottom: 24px;
          overflow: hidden;
          animation: fadeIn 0.6s ease 0.1s both;
        }
        .tab-item {
          flex: 1;
          position: relative;
          z-index: 1;
          padding: 10px 8px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: rgba(255,255,255,0.45);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.25s;
          white-space: nowrap;
          font-family: inherit;
        }
        .tab-item:hover {
          color: rgba(255,255,255,0.7);
        }
        .tab-item.active {
          color: #fff;
        }
        .tab-underline {
          position: absolute;
          top: 4px;
          left: 4px;
          height: calc(100% - 8px);
          width: calc((100% - 8px) / 5);
          background: rgba(99,102,241,0.25);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 10px;
          transform: translateX(calc(var(--idx) * 100%));
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          pointer-events: none;
          z-index: 0;
        }

        @media (max-width: 600px) {
          .tab-item {
            font-size: 12px;
            padding: 9px 4px;
          }
        }

        /* Toast */
        .toast {
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 16px;
          font-size: 13px;
          color: rgba(255,255,255,0.8);
          animation: slideUp 0.3s ease;
        }

        /* Tab content */
        .tab-content {
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        .tab-content.in {
          opacity: 1;
          transform: translateY(0);
        }

        /* Card */
        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 28px;
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.2);
        }
        @media (max-width: 600px) {
          .card { padding: 20px; }
        }
        .card-title {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 4px;
        }
        .card-desc {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          margin: 0 0 24px;
          line-height: 1.5;
        }

        /* Guide grid */
        .guide-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        .guide-item {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 18px;
          opacity: 0;
          animation: slideUp 0.4s ease forwards;
          transition: border-color 0.2s, background 0.2s;
        }
        .guide-item:hover {
          border-color: rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
        }
        .guide-item-icon {
          font-size: 24px;
          margin-bottom: 6px;
        }
        .guide-item-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .guide-item-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .guide-item-list li {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          line-height: 1.8;
          padding-left: 12px;
          position: relative;
        }
        .guide-item-list li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: rgba(255,255,255,0.2);
        }
        .guide-item-list :global(code) {
          background: rgba(255,255,255,0.06);
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 11px;
          color: rgba(255,255,255,0.7);
        }
        .guide-item-list :global(strong) {
          color: rgba(255,255,255,0.8);
        }

        @media (max-width: 600px) {
          .guide-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Services */
        .services-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .svc-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-radius: 12px;
          transition: background 0.2s;
        }
        .svc-row:hover {
          background: rgba(255,255,255,0.03);
        }
        .svc-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .svc-icon { font-size: 26px; }
        .svc-name { font-weight: 600; font-size: 14px; }
        .svc-desc { font-size: 12px; color: rgba(255,255,255,0.35); }
        .svc-action { flex-shrink: 0; }
        .svc-connected {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 600;
          color: #4ade80;
          background: rgba(34,197,94,0.08);
          padding: 6px 12px;
          border-radius: 20px;
        }
        .granola-form {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        @media (max-width: 600px) {
          .svc-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
            padding: 14px 0;
          }
          .granola-form { flex-wrap: wrap; }
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          font-family: inherit;
          text-decoration: none;
        }
        .btn:hover {
          transform: translateY(-1px);
        }
        .btn:active {
          transform: translateY(0);
        }
        .btn-primary {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: #fff;
          box-shadow: 0 2px 12px rgba(99,102,241,0.3);
        }
        .btn-primary:hover {
          box-shadow: 0 4px 20px rgba(99,102,241,0.45);
        }
        .btn-success {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #fff;
          box-shadow: 0 2px 12px rgba(34,197,94,0.3);
        }
        .btn-success:hover {
          box-shadow: 0 4px 20px rgba(34,197,94,0.45);
        }
        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
          border-radius: 6px;
        }

        /* Inputs */
        .input-sm {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #fff;
          font-size: 13px;
          width: 160px;
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-sm:focus {
          border-color: rgba(139,92,246,0.4);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }
        .input-sm::placeholder { color: rgba(255,255,255,0.2); }

        /* Profile fields */
        .profile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }
        @media (max-width: 600px) {
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
          font-weight: 700;
          color: rgba(255,255,255,0.7);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 2px;
        }
        .field-hint {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          margin-bottom: 8px;
        }
        .field-input {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #fff;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .field-input:focus {
          border-color: rgba(99,102,241,0.4);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
          background: rgba(255,255,255,0.06);
        }
        .field-input::placeholder { color: rgba(255,255,255,0.15); }

        /* Style pills */
        .style-grid {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .style-field { }
        .pill-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .pill {
          padding: 7px 18px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .pill:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.7);
        }
        .pill.active {
          background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3));
          border-color: rgba(99,102,241,0.4);
          color: #fff;
          box-shadow: 0 2px 12px rgba(99,102,241,0.2);
        }

        /* Checkbox */
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          user-select: none;
        }
        .checkbox-label input {
          display: none;
        }
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

        /* Projects */
        .project-panel {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 22px;
          margin-bottom: 16px;
          transition: border-color 0.2s;
        }
        .project-panel:hover {
          border-color: rgba(255,255,255,0.1);
        }
        .panel-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .panel-icon { font-size: 22px; }
        .panel-title {
          font-size: 15px;
          font-weight: 700;
        }
        .panel-body {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          line-height: 1.6;
          margin-bottom: 14px;
        }
        .panel-body strong {
          color: rgba(255,255,255,0.8);
        }
        .gdrive-panel .btn {
          display: inline-flex;
        }
        .upload-panel { }
        .upload-btn {
          display: inline-flex;
          align-items: center;
          padding: 9px 18px;
          border-radius: 8px;
          border: 1px dashed rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.6);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .upload-btn:hover {
          border-color: rgba(99,102,241,0.4);
          color: rgba(255,255,255,0.9);
          background: rgba(99,102,241,0.06);
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
          border: 0;
        }
        .tip-banner {
          font-size: 12px;
          color: rgba(255,255,255,0.35);
          line-height: 1.7;
          padding: 14px 18px;
          border-radius: 10px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
        }
        .tip-banner code {
          background: rgba(255,255,255,0.06);
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 11px;
          color: rgba(255,255,255,0.55);
        }

        /* Save button */
        .save-bar {
          margin-top: 28px;
          padding-bottom: 40px;
          animation: fadeIn 0.6s ease 0.15s both;
        }
        .btn-save {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: #fff;
          box-shadow: 0 4px 28px rgba(99,102,241,0.4);
          transition: transform 0.2s, box-shadow 0.2s, background 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-save:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 36px rgba(99,102,241,0.55);
        }
        .btn-save:active {
          transform: translateY(0);
        }
        .btn-save.saved {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          box-shadow: 0 4px 28px rgba(34,197,94,0.4);
        }
        .btn-save:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
      `}</style>
    </>
  );
}
