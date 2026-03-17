export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API non configurée.' });

  const { name, style, colors, tagline } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom manquant.' });

  const colorMap = {
    blue:   { p: '#1A73E8', s: '#0D47A1', l: '#E8F0FE', t: '#FFFFFF' },
    green:  { p: '#2E7D32', s: '#1B5E20', l: '#E8F5E9', t: '#FFFFFF' },
    red:    { p: '#C62828', s: '#B71C1C', l: '#FFEBEE', t: '#FFFFFF' },
    purple: { p: '#6A1B9A', s: '#4A148C', l: '#F3E5F5', t: '#FFFFFF' },
    orange: { p: '#E65100', s: '#BF360C', l: '#FFF3E0', t: '#FFFFFF' },
    black:  { p: '#212121', s: '#424242', l: '#F5F5F5', t: '#FFFFFF' },
    gold:   { p: '#F9A825', s: '#F57F17', l: '#FFFDE7', t: '#212121' },
  };
  const c = colorMap[colors] || colorMap.blue;
  const N = name.toUpperCase();
  const initial = name.charAt(0).toUpperCase();
  const words = name.trim().split(' ');
  const initials = words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : initial + (name[1]||'').toUpperCase();

  // Generate 3 logos directly in code - no AI needed for SVG (AI is bad at SVG)
  const logos = [
    {
      name: style === 'elegant' ? 'Serif Classic' : style === 'tech' ? 'Tech Shield' : 'Modern Minimal',
      description: 'Icône + nom horizontal',
      svg: `<svg viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="120" fill="white"/>
  <rect x="20" y="30" width="60" height="60" rx="${style==='playful'?'30':style==='modern'?'8':'4'}" fill="${c.p}"/>
  <text x="50" y="72" font-family="${style==='elegant'?'Georgia,serif':'Arial,sans-serif'}" font-size="28" font-weight="bold" fill="${c.t}" text-anchor="middle">${initial}</text>
  <text x="100" y="58" font-family="${style==='elegant'?'Georgia,serif':'Arial,sans-serif'}" font-size="26" font-weight="${style==='bold'?'900':'700'}" fill="${c.p}" dominant-baseline="middle">${N}</text>
  ${tagline ? `<text x="100" y="82" font-family="Arial,sans-serif" font-size="11" fill="${c.s}" letter-spacing="2">${tagline.toUpperCase().substring(0,30)}</text>` : `<line x1="100" y1="68" x2="${Math.min(100+N.length*15,280)}" y2="68" stroke="${c.s}" stroke-width="1.5"/>`}
</svg>`
    },
    {
      name: style === 'elegant' ? 'Monogram Élégant' : style === 'tech' ? 'Hexagone Tech' : 'Emblème Cercle',
      description: 'Monogramme centré',
      svg: `<svg viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="120" fill="white"/>
  <circle cx="150" cy="60" r="50" fill="${c.p}"/>
  <circle cx="150" cy="60" r="44" fill="none" stroke="${c.l}" stroke-width="1.5"/>
  <text x="150" y="55" font-family="${style==='elegant'?'Georgia,serif':'Arial,sans-serif'}" font-size="${initials.length>1?'30':'36'}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  <text x="150" y="80" font-family="Arial,sans-serif" font-size="9" fill="white" text-anchor="middle" letter-spacing="2">${N.substring(0,12)}</text>
</svg>`
    },
    {
      name: style === 'elegant' ? 'Typographie Pure' : style === 'tech' ? 'Gradient Tech' : 'Wordmark Moderne',
      description: 'Texte stylisé',
      svg: `<svg viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="120" fill="${c.l}"/>
  <rect x="0" y="0" width="8" height="120" fill="${c.p}"/>
  <text x="30" y="52" font-family="${style==='elegant'?'Georgia,serif':style==='tech'?'Courier New,monospace':'Arial,sans-serif'}" font-size="${N.length>8?'28':'36'}" font-weight="${style==='bold'?'900':'700'}" fill="${c.p}" dominant-baseline="middle">${N.substring(0,10)}</text>
  ${N.length > 10 ? `<text x="30" y="80" font-family="${style==='elegant'?'Georgia,serif':'Arial,sans-serif'}" font-size="28" font-weight="700" fill="${c.p}" dominant-baseline="middle">${N.substring(10,20)}</text>` : ''}
  <text x="32" y="${N.length>10?'100':'75'}" font-family="Arial,sans-serif" font-size="11" fill="${c.s}" letter-spacing="3">${tagline ? tagline.toUpperCase().substring(0,25) : (style==='tech'?'TECHNOLOGY':'SINCE 2026')}</text>
</svg>`
    }
  ];

  return res.status(200).json({ logos });
}
