export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, style, colors } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom manquant.' });

  const tagline = req.body.tagline || '';
  const N = name.toUpperCase();
  const n = name;
  const initial = name.charAt(0).toUpperCase();
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : (name.substring(0, 2).toUpperCase());

  const colorMap = {
    blue:   { p: '#1A73E8', s: '#0D47A1', l: '#E8F0FE', d: '#BBDEFB', t: '#FFFFFF' },
    green:  { p: '#2E7D32', s: '#1B5E20', l: '#E8F5E9', d: '#A5D6A7', t: '#FFFFFF' },
    red:    { p: '#C62828', s: '#B71C1C', l: '#FFEBEE', d: '#EF9A9A', t: '#FFFFFF' },
    purple: { p: '#6A1B9A', s: '#4A148C', l: '#F3E5F5', d: '#CE93D8', t: '#FFFFFF' },
    orange: { p: '#E65100', s: '#BF360C', l: '#FFF3E0', d: '#FFCC80', t: '#FFFFFF' },
    black:  { p: '#212121', s: '#424242', l: '#F5F5F5', d: '#BDBDBD', t: '#FFFFFF' },
    gold:   { p: '#F9A825', s: '#F57F17', l: '#FFFDE7', d: '#FFF176', t: '#212121' },
  };
  const c = colorMap[colors] || colorMap.blue;

  // Font choice by style
  const font = style === 'elegant' ? 'Georgia, serif' : style === 'tech' ? 'Courier New, monospace' : 'Arial, sans-serif';
  const fw = style === 'bold' ? '900' : '700';
  const rx = style === 'playful' ? '50' : style === 'modern' ? '10' : style === 'elegant' ? '2' : '6';

  // Short name for display (max 12 chars)
  const shortN = N.length > 12 ? N.substring(0, 12) : N;
  const fontSize = shortN.length > 8 ? '18' : shortN.length > 5 ? '22' : '26';
  const tgLine = tagline ? tagline.substring(0, 28).toUpperCase() : '';

  const logos = [
    // 1 - Badge / Shield with initials
    {
      name: 'Badge',
      description: 'Blason avec initiales',
      svg: `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" width="300" height="150">
  <defs>
    <clipPath id="shield1">
      <path d="M150 10 L260 40 L260 95 Q260 135 150 145 Q40 135 40 95 L40 40 Z"/>
    </clipPath>
  </defs>
  <rect width="300" height="150" fill="white"/>
  <path d="M150 10 L260 40 L260 95 Q260 135 150 145 Q40 135 40 95 L40 40 Z" fill="${c.p}" stroke="${c.s}" stroke-width="3"/>
  <path d="M150 20 L248 46 L248 93 Q248 128 150 137 Q52 128 52 93 L52 46 Z" fill="none" stroke="${c.l}" stroke-width="2" opacity="0.5"/>
  <text x="150" y="82" font-family="${font}" font-size="36" font-weight="${fw}" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  <text x="150" y="110" font-family="Arial, sans-serif" font-size="8" fill="${c.l}" text-anchor="middle" letter-spacing="3">${shortN.substring(0,10)}</text>
</svg>`
    },
    // 2 - Split color wordmark
    {
      name: 'Bicolore',
      description: 'Texte bicolore moderne',
      svg: `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" width="300" height="150">
  <rect width="300" height="150" fill="white"/>
  <rect x="0" y="0" width="150" height="150" fill="${c.p}"/>
  <text x="75" y="75" font-family="${font}" font-size="${fontSize}" font-weight="${fw}" fill="white" text-anchor="middle" dominant-baseline="middle">${shortN.substring(0, Math.ceil(shortN.length/2))}</text>
  <text x="225" y="75" font-family="${font}" font-size="${fontSize}" font-weight="${fw}" fill="${c.p}" text-anchor="middle" dominant-baseline="middle">${shortN.substring(Math.ceil(shortN.length/2))}</text>
  ${tgLine ? `<text x="150" y="125" font-family="Arial,sans-serif" font-size="9" fill="${c.s}" text-anchor="middle" letter-spacing="2">${tgLine}</text>` : ''}
</svg>`
    },
    // 3 - Circle badge
    {
      name: 'Cercle',
      description: 'Emblème circulaire',
      svg: `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" width="300" height="150">
  <rect width="300" height="150" fill="white"/>
  <circle cx="75" cy="75" r="60" fill="${c.p}"/>
  <circle cx="75" cy="75" r="52" fill="none" stroke="white" stroke-width="2" opacity="0.4"/>
  <text x="75" y="68" font-family="${font}" font-size="28" font-weight="${fw}" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  <text x="75" y="98" font-family="Arial,sans-serif" font-size="7" fill="${c.l}" text-anchor="middle" letter-spacing="2">${shortN.substring(0,8)}</text>
  <text x="185" y="58" font-family="${font}" font-size="${fontSize}" font-weight="${fw}" fill="${c.p}" dominant-baseline="middle">${shortN}</text>
  ${tgLine ? `<text x="185" y="90" font-family="Arial,sans-serif" font-size="10" fill="${c.s}" letter-spacing="2">${tgLine.substring(0,18)}</text>` : `<line x1="183" y1="78" x2="${Math.min(183 + shortN.length * 11, 295)}" y2="78" stroke="${c.d}" stroke-width="1.5"/>`}
</svg>`
    },
    // 4 - Dark banner
    {
      name: 'Bannière',
      description: 'Bannière sombre premium',
      svg: `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" width="300" height="150">
  <rect width="300" height="150" fill="#1C1C1A"/>
  <rect x="0" y="0" width="6" height="150" fill="${c.p}"/>
  <rect x="294" y="0" width="6" height="150" fill="${c.p}"/>
  <text x="153" y="62" font-family="${font}" font-size="${fontSize}" font-weight="${fw}" fill="white" text-anchor="middle" dominant-baseline="middle">${shortN}</text>
  <line x1="50" y1="80" x2="250" y2="80" stroke="${c.p}" stroke-width="1"/>
  <text x="153" y="100" font-family="Arial,sans-serif" font-size="9" fill="${c.p}" text-anchor="middle" letter-spacing="4">${tgLine || 'ESTABLISHED 2026'}</text>
</svg>`
    },
    // 5 - Hexagon tech
    {
      name: 'Hexagone',
      description: 'Forme hexagonale tech',
      svg: `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" width="300" height="150">
  <rect width="300" height="150" fill="white"/>
  <polygon points="75,15 110,35 110,75 75,95 40,75 40,35" fill="${c.p}"/>
  <polygon points="75,25 102,40 102,70 75,85 48,70 48,40" fill="none" stroke="${c.l}" stroke-width="1.5" opacity="0.6"/>
  <text x="75" y="60" font-family="${font}" font-size="22" font-weight="${fw}" fill="white" text-anchor="middle" dominant-baseline="middle">${initial}</text>
  <text x="135" y="50" font-family="${font}" font-size="${fontSize}" font-weight="${fw}" fill="${c.p}" dominant-baseline="middle">${shortN}</text>
  <text x="135" y="80" font-family="Arial,sans-serif" font-size="9" fill="${c.s}" letter-spacing="3">${tgLine || 'TECHNOLOGY'}</text>
  <line x1="133" y1="63" x2="${Math.min(133 + shortN.length * 11, 290)}" y2="63" stroke="${c.d}" stroke-width="1"/>
</svg>`
    },
    // 6 - Stacked / Stamp
    {
      name: 'Tampon',
      description: 'Style tampon / cachet',
      svg: `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" width="300" height="150">
  <rect width="300" height="150" fill="${c.l}"/>
  <rect x="20" y="15" width="260" height="120" rx="8" fill="none" stroke="${c.p}" stroke-width="3"/>
  <rect x="28" y="23" width="244" height="104" rx="5" fill="none" stroke="${c.p}" stroke-width="1" opacity="0.4"/>
  <text x="150" y="68" font-family="${font}" font-size="${fontSize}" font-weight="${fw}" fill="${c.p}" text-anchor="middle" dominant-baseline="middle">${shortN}</text>
  <line x1="40" y1="84" x2="260" y2="84" stroke="${c.p}" stroke-width="1.5"/>
  <text x="150" y="102" font-family="Arial,sans-serif" font-size="9" fill="${c.s}" text-anchor="middle" letter-spacing="4">${tgLine || 'SINCE 2026'}</text>
</svg>`
    }
  ];

  return res.status(200).json({ logos });
}
