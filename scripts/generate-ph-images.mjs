import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'producthunt');

// Brand colors
const PURPLE = '#7C3AED';
const PURPLE_DARK = '#5B21B6';
const PURPLE_LIGHT = '#A78BFA';
const BG_DARK = '#0F0E17';
const BG_CARD = '#1A1928';
const WHITE = '#FFFFFF';
const GRAY = '#9CA3AF';
const GREEN = '#10B981';
const RED = '#EF4444';
const YELLOW = '#F59E0B';

// ─── 1. Logo JPEG (240x240) ───
async function generateLogo() {
  const svg = `
  <svg width="240" height="240" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
    <rect width="240" height="240" rx="48" fill="${PURPLE}"/>
    <path d="M40 120h32l24-72 48 144 24-72h32" stroke="white" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toFile(path.join(OUT, 'logo.jpg'));
  console.log('✓ logo.jpg');
}

// ─── 2. Hero Image (1270x760) ───
async function generateHero() {
  const svg = `
  <svg width="1270" height="760" viewBox="0 0 1270 760" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F0E17"/>
        <stop offset="100%" stop-color="#1a1040"/>
      </linearGradient>
      <linearGradient id="pulse" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${PURPLE_LIGHT}"/>
        <stop offset="100%" stop-color="${PURPLE}"/>
      </linearGradient>
      <!-- Glow filter -->
      <filter id="glow">
        <feGaussianBlur stdDeviation="6" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="glowBig">
        <feGaussianBlur stdDeviation="30" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="1270" height="760" fill="url(#bg)"/>

    <!-- Subtle grid -->
    <g opacity="0.05" stroke="${WHITE}">
      ${Array.from({length: 20}, (_, i) => `<line x1="${i*70}" y1="0" x2="${i*70}" y2="760"/>`).join('')}
      ${Array.from({length: 12}, (_, i) => `<line x1="0" y1="${i*70}" x2="1270" y2="${i*70}"/>`).join('')}
    </g>

    <!-- Decorative pulse lines in background -->
    <path d="M0 500 Q200 500 300 420 T500 380 T700 440 T900 360 T1100 400 T1270 380" stroke="${PURPLE}" stroke-width="1.5" fill="none" opacity="0.15" filter="url(#glowBig)"/>
    <path d="M0 550 Q200 550 350 480 T600 500 T800 460 T1000 520 T1270 470" stroke="${PURPLE_LIGHT}" stroke-width="1" fill="none" opacity="0.1"/>

    <!-- Logo icon -->
    <g transform="translate(535, 120)">
      <rect width="80" height="80" rx="18" fill="${PURPLE}" filter="url(#glow)"/>
      <path d="M14 40h10l8-24 16 48 8-24h10" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>

    <!-- Title -->
    <text x="635" y="270" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="800" fill="${WHITE}" letter-spacing="-2">AgentPulse</text>

    <!-- Tagline -->
    <text x="635" y="330" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="${GRAY}" font-weight="400">Real-time observability for AI agents</text>

    <!-- Subtitle -->
    <text x="635" y="375" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="${PURPLE_LIGHT}" font-weight="500">Track costs · Monitor errors · Optimize performance</text>

    <!-- Mini dashboard mockup -->
    <g transform="translate(235, 420)">
      <rect width="800" height="280" rx="16" fill="${BG_CARD}" stroke="${PURPLE}" stroke-width="1" opacity="0.9"/>

      <!-- Window dots -->
      <circle cx="24" cy="20" r="5" fill="#EF4444"/>
      <circle cx="44" cy="20" r="5" fill="#F59E0B"/>
      <circle cx="64" cy="20" r="5" fill="#10B981"/>

      <!-- Stat cards row -->
      <g transform="translate(24, 48)">
        <!-- Total Cost -->
        <rect width="175" height="80" rx="8" fill="#1E1D2F" stroke="#2D2B45" stroke-width="1"/>
        <text x="16" y="28" font-family="system-ui, sans-serif" font-size="11" fill="${GRAY}">Total Cost (30d)</text>
        <text x="16" y="58" font-family="system-ui, sans-serif" font-size="26" font-weight="700" fill="${GREEN}">$1,247</text>

        <!-- API Calls -->
        <g transform="translate(190, 0)">
          <rect width="175" height="80" rx="8" fill="#1E1D2F" stroke="#2D2B45" stroke-width="1"/>
          <text x="16" y="28" font-family="system-ui, sans-serif" font-size="11" fill="${GRAY}">API Calls</text>
          <text x="16" y="58" font-family="system-ui, sans-serif" font-size="26" font-weight="700" fill="${WHITE}">48,291</text>
        </g>

        <!-- Success Rate -->
        <g transform="translate(380, 0)">
          <rect width="175" height="80" rx="8" fill="#1E1D2F" stroke="#2D2B45" stroke-width="1"/>
          <text x="16" y="28" font-family="system-ui, sans-serif" font-size="11" fill="${GRAY}">Success Rate</text>
          <text x="16" y="58" font-family="system-ui, sans-serif" font-size="26" font-weight="700" fill="${GREEN}">99.2%</text>
        </g>

        <!-- Avg Latency -->
        <g transform="translate(570, 0)">
          <rect width="175" height="80" rx="8" fill="#1E1D2F" stroke="#2D2B45" stroke-width="1"/>
          <text x="16" y="28" font-family="system-ui, sans-serif" font-size="11" fill="${GRAY}">Avg Latency</text>
          <text x="16" y="58" font-family="system-ui, sans-serif" font-size="26" font-weight="700" fill="${YELLOW}">1.2s</text>
        </g>
      </g>

      <!-- Chart area -->
      <g transform="translate(24, 148)">
        <rect width="750" height="110" rx="8" fill="#1E1D2F" stroke="#2D2B45" stroke-width="1"/>
        <text x="16" y="24" font-family="system-ui, sans-serif" font-size="11" fill="${GRAY}">Cost Trend (30 days)</text>

        <!-- Bar chart -->
        ${Array.from({length: 30}, (_, i) => {
          const h = 15 + Math.random() * 55;
          const x = 16 + i * 24;
          return `<rect x="${x}" y="${85-h}" width="16" height="${h}" rx="3" fill="${PURPLE}" opacity="${0.5 + Math.random() * 0.5}"/>`;
        }).join('')}
      </g>
    </g>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toFile(path.join(OUT, 'hero.jpg'));
  console.log('✓ hero.jpg');
}

// ─── 3. Features Overview (1270x760) ───
async function generateFeatures() {
  const features = [
    { icon: '$', title: 'Cost Tracking', desc: 'Track every cent spent\non LLM API calls' },
    { icon: '~', title: 'Real-Time Events', desc: 'Live feed of every\nAPI call and response' },
    { icon: '!', title: 'Smart Alerts', desc: 'Get notified on cost\nspikes and failures' },
    { icon: '#', title: 'Model Analytics', desc: 'Compare models by\ncost, speed and tokens' },
    { icon: '>', title: '2-Min Setup', desc: 'pip install + config\nNo code changes needed' },
    { icon: '*', title: 'Multi-Provider', desc: 'Claude, GPT-4,\nMiniMax and more' },
  ];

  const svg = `
  <svg width="1270" height="760" viewBox="0 0 1270 760" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F0E17"/>
        <stop offset="100%" stop-color="#1a1040"/>
      </linearGradient>
    </defs>
    <rect width="1270" height="760" fill="url(#bg2)"/>

    <!-- Title -->
    <text x="635" y="80" text-anchor="middle" font-family="system-ui, sans-serif" font-size="48" font-weight="800" fill="${WHITE}">Everything You Need to Monitor AI Agents</text>
    <text x="635" y="120" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" fill="${GRAY}">Full observability in one dashboard - no code changes required</text>

    <!-- Feature cards (2 rows x 3 cols) -->
    ${features.map((f, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 110 + col * 370;
      const y = 170 + row * 270;
      const lines = f.desc.split('\n');
      return `
      <g transform="translate(${x}, ${y})">
        <rect width="340" height="230" rx="16" fill="${BG_CARD}" stroke="#2D2B45" stroke-width="1"/>
        <rect width="340" height="4" rx="2" y="0" fill="${PURPLE}"/>
        <circle cx="170" cy="60" r="30" fill="${PURPLE}" opacity="0.3"/>
        <text x="170" y="70" text-anchor="middle" font-family="monospace" font-size="32" font-weight="700" fill="${PURPLE_LIGHT}">${f.icon}</text>
        <text x="170" y="120" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="${WHITE}">${f.title}</text>
        ${lines.map((line, li) => `<text x="170" y="${155 + li * 26}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" fill="${GRAY}">${line}</text>`).join('')}
      </g>`;
    }).join('')}

    <!-- Bottom branding -->
    <text x="635" y="720" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" fill="${PURPLE_LIGHT}" font-weight="600">agentpulses.com - Free tier available</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toFile(path.join(OUT, 'features.jpg'));
  console.log('✓ features.jpg');
}

// ─── 4. How It Works (1270x760) ───
async function generateHowItWorks() {
  const steps = [
    { num: '1', title: 'Install Plugin', desc: 'pip install agentpulse', sub: '30 seconds' },
    { num: '2', title: 'Add Config', desc: 'Set your API key in config', sub: '30 seconds' },
    { num: '3', title: 'Run Your Agent', desc: 'Start your AI agent normally', sub: 'No changes' },
    { num: '4', title: 'See Everything', desc: 'Open dashboard and monitor', sub: 'Real-time' },
  ];

  const svg = `
  <svg width="1270" height="760" viewBox="0 0 1270 760" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F0E17"/>
        <stop offset="100%" stop-color="#1a1040"/>
      </linearGradient>
      <filter id="glow3">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect width="1270" height="760" fill="url(#bg3)"/>

    <!-- Title -->
    <text x="635" y="90" text-anchor="middle" font-family="system-ui, sans-serif" font-size="48" font-weight="800" fill="${WHITE}">Up and Running in 2 Minutes</text>
    <text x="635" y="130" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" fill="${GRAY}">Zero code changes. Just install, configure, and go.</text>

    <!-- Steps -->
    ${steps.map((s, i) => {
      const x = 100 + i * 280;
      return `
      <g transform="translate(${x}, 200)">
        <!-- Connector line -->
        ${i < 3 ? `<line x1="250" y1="50" x2="280" y2="50" stroke="${PURPLE}" stroke-width="2" stroke-dasharray="6,4"/>` : ''}

        <!-- Card -->
        <rect width="250" height="300" rx="16" fill="${BG_CARD}" stroke="#2D2B45" stroke-width="1"/>

        <!-- Step number circle -->
        <circle cx="125" cy="70" r="36" fill="${PURPLE}" filter="url(#glow3)"/>
        <text x="125" y="82" text-anchor="middle" font-family="system-ui, sans-serif" font-size="32" font-weight="800" fill="${WHITE}">${s.num}</text>

        <!-- Title -->
        <text x="125" y="140" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="${WHITE}">${s.title}</text>

        <!-- Description -->
        <text x="125" y="175" text-anchor="middle" font-family="system-ui, sans-serif" font-size="15" fill="${GRAY}">${s.desc}</text>

        <!-- Code/badge -->
        <rect x="50" y="210" width="150" height="36" rx="8" fill="#1E1D2F" stroke="${PURPLE}" stroke-width="1"/>
        <text x="125" y="234" text-anchor="middle" font-family="monospace" font-size="13" fill="${PURPLE_LIGHT}">${s.sub}</text>
      </g>`;
    }).join('')}

    <!-- Terminal mockup at bottom -->
    <g transform="translate(235, 550)">
      <rect width="800" height="150" rx="12" fill="#1E1D2F" stroke="#2D2B45" stroke-width="1"/>
      <circle cx="20" cy="18" r="5" fill="#EF4444"/>
      <circle cx="38" cy="18" r="5" fill="#F59E0B"/>
      <circle cx="56" cy="18" r="5" fill="#10B981"/>
      <text x="20" y="55" font-family="monospace" font-size="15" fill="${GREEN}">$</text>
      <text x="40" y="55" font-family="monospace" font-size="15" fill="${WHITE}">pip install agentpulse</text>
      <text x="20" y="80" font-family="monospace" font-size="15" fill="${GREEN}">$</text>
      <text x="40" y="80" font-family="monospace" font-size="15" fill="${WHITE}">agentpulse init --api-key YOUR_KEY</text>
      <text x="20" y="105" font-family="monospace" font-size="15" fill="${GREEN}">$</text>
      <text x="40" y="105" font-family="monospace" font-size="15" fill="${WHITE}">agentpulse start</text>
      <text x="20" y="130" font-family="monospace" font-size="14" fill="${PURPLE_LIGHT}">AgentPulse is monitoring your agent. Dashboard: agentpulses.com/dashboard</text>
    </g>

    <!-- Bottom -->
    <text x="635" y="740" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" fill="${PURPLE_LIGHT}" font-weight="600">agentpulses.com - Start for free</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toFile(path.join(OUT, 'how-it-works.jpg'));
  console.log('✓ how-it-works.jpg');
}

// ─── 5. Cost Dashboard Detail (1270x760) ───
async function generateDashboard() {
  const svg = `
  <svg width="1270" height="760" viewBox="0 0 1270 760" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg4" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F0E17"/>
        <stop offset="100%" stop-color="#1a1040"/>
      </linearGradient>
    </defs>
    <rect width="1270" height="760" fill="url(#bg4)"/>

    <!-- Title bar -->
    <text x="635" y="55" text-anchor="middle" font-family="system-ui, sans-serif" font-size="36" font-weight="800" fill="${WHITE}">Stop Burning Money Blind on LLM API Calls</text>

    <!-- Main dashboard -->
    <g transform="translate(60, 80)">
      <rect width="1150" height="620" rx="16" fill="${BG_CARD}" stroke="#2D2B45" stroke-width="1"/>

      <!-- Window chrome -->
      <circle cx="24" cy="22" r="6" fill="#EF4444"/>
      <circle cx="46" cy="22" r="6" fill="#F59E0B"/>
      <circle cx="68" cy="22" r="6" fill="#10B981"/>
      <text x="575" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" fill="${GRAY}">AgentPulse Dashboard</text>

      <!-- Sidebar -->
      <rect x="0" y="44" width="200" height="576" fill="#141325" rx="0"/>
      <g transform="translate(20, 70)">
        <rect x="0" y="0" width="160" height="36" rx="8" fill="${PURPLE}" opacity="0.2"/>
        <text x="16" y="24" font-family="system-ui, sans-serif" font-size="14" fill="${PURPLE_LIGHT}" font-weight="600">Dashboard</text>
        <text x="16" y="64" font-family="system-ui, sans-serif" font-size="14" fill="${GRAY}">Events Log</text>
        <text x="16" y="100" font-family="system-ui, sans-serif" font-size="14" fill="${GRAY}">Agents</text>
        <text x="16" y="136" font-family="system-ui, sans-serif" font-size="14" fill="${GRAY}">Alerts</text>
        <text x="16" y="172" font-family="system-ui, sans-serif" font-size="14" fill="${GRAY}">Analytics</text>
        <text x="16" y="208" font-family="system-ui, sans-serif" font-size="14" fill="${GRAY}">Settings</text>
      </g>

      <!-- Main content area -->
      <g transform="translate(220, 60)">
        <!-- Stat cards -->
        <g>
          <!-- Today's Cost -->
          <rect width="210" height="100" rx="12" fill="#1E1D2F" stroke="#2D2B45" stroke-width="1"/>
          <text x="20" y="30" font-family="system-ui, sans-serif" font-size="12" fill="${GRAY}">Today's Cost</text>
          <text x="20" y="65" font-family="system-ui, sans-serif" font-size="32" font-weight="800" fill="${GREEN}">$42.18</text>
          <text x="20" y="85" font-family="system-ui, sans-serif" font-size="12" fill="${GREEN}">-12% vs yesterday</text>

          <!-- Monthly Cost -->
          <g transform="translate(230, 0)">
            <rect width="210" height="100" rx="12" fill="#1E1D2F" stroke="#2D2B45" stroke-width="1"/>
            <text x="20" y="30" font-family="system-ui, sans-serif" font-size="12" fill="${GRAY}">Monthly Cost</text>
            <text x="20" y="65" font-family="system-ui, sans-serif" font-size="32" font-weight="800" fill="${WHITE}">$1,247</text>
            <text x="20" y="85" font-family="system-ui, sans-serif" font-size="12" fill="${YELLOW}">Projected: $1,890</text>
          </g>

          <!-- Total Calls -->
          <g transform="translate(460, 0)">
            <rect width="210" height="100" rx="12" fill="#1E1D2F" stroke="#2D2B45" stroke-width="1"/>
            <text x="20" y="30" font-family="system-ui, sans-serif" font-size="12" fill="${GRAY}">Total API Calls</text>
            <text x="20" y="65" font-family="system-ui, sans-serif" font-size="32" font-weight="800" fill="${WHITE}">48,291</text>
            <text x="20" y="85" font-family="system-ui, sans-serif" font-size="12" fill="${PURPLE_LIGHT}">5 active agents</text>
          </g>

          <!-- Error Rate -->
          <g transform="translate(690, 0)">
            <rect width="210" height="100" rx="12" fill="#1E1D2F" stroke="#2D2B45" stroke-width="1"/>
            <text x="20" y="30" font-family="system-ui, sans-serif" font-size="12" fill="${GRAY}">Error Rate</text>
            <text x="20" y="65" font-family="system-ui, sans-serif" font-size="32" font-weight="800" fill="${GREEN}">0.8%</text>
            <text x="20" y="85" font-family="system-ui, sans-serif" font-size="12" fill="${GREEN}">All systems healthy</text>
          </g>
        </g>

        <!-- Cost chart -->
        <g transform="translate(0, 120)">
          <rect width="560" height="240" rx="12" fill="#1E1D2F" stroke="#2D2B45" stroke-width="1"/>
          <text x="20" y="30" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="${WHITE}">Cost Trend - Last 30 Days</text>

          <!-- Y axis labels -->
          <text x="20" y="65" font-family="monospace" font-size="10" fill="${GRAY}">$80</text>
          <text x="20" y="110" font-family="monospace" font-size="10" fill="${GRAY}">$60</text>
          <text x="20" y="155" font-family="monospace" font-size="10" fill="${GRAY}">$40</text>
          <text x="20" y="200" font-family="monospace" font-size="10" fill="${GRAY}">$20</text>

          <!-- Grid lines -->
          <line x1="50" y1="60" x2="540" y2="60" stroke="#2D2B45" stroke-width="1"/>
          <line x1="50" y1="105" x2="540" y2="105" stroke="#2D2B45" stroke-width="1"/>
          <line x1="50" y1="150" x2="540" y2="150" stroke="#2D2B45" stroke-width="1"/>
          <line x1="50" y1="195" x2="540" y2="195" stroke="#2D2B45" stroke-width="1"/>

          <!-- Area chart -->
          <path d="M50 180 L66 170 L82 155 L98 160 L114 140 L130 135 L146 145 L162 125 L178 110 L194 120 L210 105 L226 95 L242 100 L258 85 L274 90 L290 75 L306 80 L322 65 L338 70 L354 60 L370 72 L386 65 L402 58 L418 62 L434 55 L450 60 L466 50 L482 55 L498 48 L514 52 L530 45" stroke="${PURPLE}" stroke-width="2.5" fill="none"/>
          <path d="M50 180 L66 170 L82 155 L98 160 L114 140 L130 135 L146 145 L162 125 L178 110 L194 120 L210 105 L226 95 L242 100 L258 85 L274 90 L290 75 L306 80 L322 65 L338 70 L354 60 L370 72 L386 65 L402 58 L418 62 L434 55 L450 60 L466 50 L482 55 L498 48 L514 52 L530 45 L530 210 L50 210 Z" fill="${PURPLE}" opacity="0.1"/>
        </g>

        <!-- Model breakdown -->
        <g transform="translate(580, 120)">
          <rect width="320" height="240" rx="12" fill="#1E1D2F" stroke="#2D2B45" stroke-width="1"/>
          <text x="20" y="30" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="${WHITE}">Cost by Model</text>

          <!-- Donut chart (simplified) -->
          <circle cx="100" cy="130" r="60" fill="none" stroke="#2D2B45" stroke-width="20"/>
          <circle cx="100" cy="130" r="60" fill="none" stroke="${PURPLE}" stroke-width="20" stroke-dasharray="165 212" stroke-dashoffset="0" transform="rotate(-90 100 130)"/>
          <circle cx="100" cy="130" r="60" fill="none" stroke="${GREEN}" stroke-width="20" stroke-dasharray="95 282" stroke-dashoffset="-165" transform="rotate(-90 100 130)"/>
          <circle cx="100" cy="130" r="60" fill="none" stroke="${YELLOW}" stroke-width="20" stroke-dasharray="40 337" stroke-dashoffset="-260" transform="rotate(-90 100 130)"/>
          <text x="100" y="126" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="${WHITE}">$1,247</text>
          <text x="100" y="143" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${GRAY}">total</text>

          <!-- Legend -->
          <rect x="195" y="80" width="10" height="10" rx="2" fill="${PURPLE}"/>
          <text x="212" y="90" font-family="system-ui, sans-serif" font-size="12" fill="${WHITE}">Claude 3.5</text>
          <text x="280" y="90" font-family="system-ui, sans-serif" font-size="12" fill="${GRAY}">44%</text>

          <rect x="195" y="108" width="10" height="10" rx="2" fill="${GREEN}"/>
          <text x="212" y="118" font-family="system-ui, sans-serif" font-size="12" fill="${WHITE}">GPT-4</text>
          <text x="280" y="118" font-family="system-ui, sans-serif" font-size="12" fill="${GRAY}">25%</text>

          <rect x="195" y="136" width="10" height="10" rx="2" fill="${YELLOW}"/>
          <text x="212" y="146" font-family="system-ui, sans-serif" font-size="12" fill="${WHITE}">MiniMax</text>
          <text x="280" y="146" font-family="system-ui, sans-serif" font-size="12" fill="${GRAY}">11%</text>

          <rect x="195" y="164" width="10" height="10" rx="2" fill="#2D2B45"/>
          <text x="212" y="174" font-family="system-ui, sans-serif" font-size="12" fill="${WHITE}">Other</text>
          <text x="280" y="174" font-family="system-ui, sans-serif" font-size="12" fill="${GRAY}">20%</text>
        </g>

        <!-- Recent events table -->
        <g transform="translate(0, 380)">
          <rect width="900" height="170" rx="12" fill="#1E1D2F" stroke="#2D2B45" stroke-width="1"/>
          <text x="20" y="28" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="${WHITE}">Recent Events</text>

          <!-- Table header -->
          <text x="20" y="56" font-family="system-ui, sans-serif" font-size="11" fill="${GRAY}">TIME</text>
          <text x="140" y="56" font-family="system-ui, sans-serif" font-size="11" fill="${GRAY}">AGENT</text>
          <text x="300" y="56" font-family="system-ui, sans-serif" font-size="11" fill="${GRAY}">MODEL</text>
          <text x="460" y="56" font-family="system-ui, sans-serif" font-size="11" fill="${GRAY}">TOKENS</text>
          <text x="580" y="56" font-family="system-ui, sans-serif" font-size="11" fill="${GRAY}">LATENCY</text>
          <text x="680" y="56" font-family="system-ui, sans-serif" font-size="11" fill="${GRAY}">COST</text>
          <text x="780" y="56" font-family="system-ui, sans-serif" font-size="11" fill="${GRAY}">STATUS</text>
          <line x1="20" y1="64" x2="880" y2="64" stroke="#2D2B45" stroke-width="1"/>

          <!-- Row 1 -->
          <text x="20" y="86" font-family="monospace" font-size="12" fill="${GRAY}">14:23:01</text>
          <text x="140" y="86" font-family="system-ui, sans-serif" font-size="12" fill="${WHITE}">research-bot</text>
          <text x="300" y="86" font-family="system-ui, sans-serif" font-size="12" fill="${PURPLE_LIGHT}">claude-3.5-sonnet</text>
          <text x="460" y="86" font-family="monospace" font-size="12" fill="${WHITE}">4,821</text>
          <text x="580" y="86" font-family="monospace" font-size="12" fill="${WHITE}">1.2s</text>
          <text x="680" y="86" font-family="monospace" font-size="12" fill="${GREEN}">$0.034</text>
          <rect x="780" y="74" width="60" height="18" rx="9" fill="#10B98120"/>
          <text x="810" y="87" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${GREEN}">success</text>

          <!-- Row 2 -->
          <text x="20" y="112" font-family="monospace" font-size="12" fill="${GRAY}">14:22:58</text>
          <text x="140" y="112" font-family="system-ui, sans-serif" font-size="12" fill="${WHITE}">code-agent</text>
          <text x="300" y="112" font-family="system-ui, sans-serif" font-size="12" fill="${PURPLE_LIGHT}">gpt-4-turbo</text>
          <text x="460" y="112" font-family="monospace" font-size="12" fill="${WHITE}">12,340</text>
          <text x="580" y="112" font-family="monospace" font-size="12" fill="${WHITE}">2.8s</text>
          <text x="680" y="112" font-family="monospace" font-size="12" fill="${GREEN}">$0.186</text>
          <rect x="780" y="100" width="60" height="18" rx="9" fill="#10B98120"/>
          <text x="810" y="113" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${GREEN}">success</text>

          <!-- Row 3 -->
          <text x="20" y="138" font-family="monospace" font-size="12" fill="${GRAY}">14:22:45</text>
          <text x="140" y="138" font-family="system-ui, sans-serif" font-size="12" fill="${WHITE}">data-analyst</text>
          <text x="300" y="138" font-family="system-ui, sans-serif" font-size="12" fill="${PURPLE_LIGHT}">claude-3.5-sonnet</text>
          <text x="460" y="138" font-family="monospace" font-size="12" fill="${WHITE}">8,102</text>
          <text x="580" y="138" font-family="monospace" font-size="12" fill="${YELLOW}">3.1s</text>
          <text x="680" y="138" font-family="monospace" font-size="12" fill="${GREEN}">$0.057</text>
          <rect x="780" y="126" width="72" height="18" rx="9" fill="#F59E0B20"/>
          <text x="816" y="139" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${YELLOW}">rate limit</text>

          <!-- Row 4 -->
          <text x="20" y="164" font-family="monospace" font-size="12" fill="${GRAY}">14:22:31</text>
          <text x="140" y="164" font-family="system-ui, sans-serif" font-size="12" fill="${WHITE}">support-bot</text>
          <text x="300" y="164" font-family="system-ui, sans-serif" font-size="12" fill="${PURPLE_LIGHT}">gpt-4</text>
          <text x="460" y="164" font-family="monospace" font-size="12" fill="${WHITE}">3,290</text>
          <text x="580" y="164" font-family="monospace" font-size="12" fill="${WHITE}">1.8s</text>
          <text x="680" y="164" font-family="monospace" font-size="12" fill="${GREEN}">$0.098</text>
          <rect x="780" y="152" width="60" height="18" rx="9" fill="#10B98120"/>
          <text x="810" y="165" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${GREEN}">success</text>
        </g>
      </g>
    </g>

    <!-- Bottom -->
    <text x="635" y="740" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" fill="${PURPLE_LIGHT}" font-weight="600">agentpulses.com</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toFile(path.join(OUT, 'dashboard.jpg'));
  console.log('✓ dashboard.jpg');
}

// ─── Run all ───
async function main() {
  console.log('Generating Product Hunt images...\n');
  await Promise.all([
    generateLogo(),
    generateHero(),
    generateFeatures(),
    generateHowItWorks(),
    generateDashboard(),
  ]);
  console.log('\nAll images generated in public/producthunt/');
}

main().catch(console.error);
