export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API Groq non configurée.' });

  const { name, style, colors, tagline } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom manquant.' });

  const styleGuides = {
    modern: 'modern, minimal, clean geometric shapes, sans-serif',
    bold: 'bold, strong, thick strokes, uppercase, impactful',
    elegant: 'elegant, luxury, thin lines, sophisticated',
    playful: 'playful, fun, rounded shapes, friendly',
    tech: 'tech, futuristic, sharp angles, digital',
    nature: 'organic, natural, leaf shapes, eco-friendly',
  };

  const colorMap = {
    blue: { primary: '#1A73E8', secondary: '#0D47A1', light: '#E8F0FE' },
    green: { primary: '#2E7D32', secondary: '#1B5E20', light: '#E8F5E9' },
    red: { primary: '#C62828', secondary: '#B71C1C', light: '#FFEBEE' },
    purple: { primary: '#6A1B9A', secondary: '#4A148C', light: '#F3E5F5' },
    orange: { primary: '#E65100', secondary: '#BF360C', light: '#FFF3E0' },
    black: { primary: '#212121', secondary: '#424242', light: '#F5F5F5' },
    gold: { primary: '#F57F17', secondary: '#E65100', light: '#FFF8E1' },
  };

  const c = colorMap[colors] || colorMap.blue;
  const styleDesc = styleGuides[style] || styleGuides.modern;

  const prompt = `You are a professional SVG logo designer. Create 3 different logo variations for company "${name}"${tagline ? ` with tagline "${tagline}"` : ''}.

Style: ${styleDesc}
Colors: primary=${c.primary}, secondary=${c.secondary}, light=${c.light}

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {"name": "Variation 1", "description": "brief description", "svg": "complete SVG string"},
  {"name": "Variation 2", "description": "brief description", "svg": "complete SVG string"},
  {"name": "Variation 3", "description": "brief description", "svg": "complete SVG string"}
]

SVG rules:
- viewBox="0 0 300 120"
- Include company name "${name}" as visible text
- Each variation must look completely different
- Use only the specified colors
- Valid, renderable SVG only
- No external resources

Return only the JSON array starting with [ and ending with ]`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 4000,
        temperature: 0.9,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    let text = data.choices?.[0]?.message?.content || '';
    text = text.replace(/```json|```/g, '').trim();

    const startIdx = text.indexOf('[');
    const endIdx = text.lastIndexOf(']');
    if (startIdx === -1 || endIdx === -1) throw new Error('Format JSON invalide');

    const logos = JSON.parse(text.substring(startIdx, endIdx + 1));
    return res.status(200).json({ logos });

  } catch (err) {
    return res.status(500).json({ error: 'Erreur génération logo : ' + err.message });
  }
}
