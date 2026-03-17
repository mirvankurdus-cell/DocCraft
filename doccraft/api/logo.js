export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API Gemini non configurée.' });

  const { name, style, colors, tagline } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom manquant.' });

  const styleGuides = {
    modern: 'modern, minimal, clean lines, geometric shapes, sans-serif typography',
    bold: 'bold, strong, impactful, thick strokes, uppercase letters, powerful',
    elegant: 'elegant, luxury, thin lines, serif or script typography, sophisticated',
    playful: 'playful, fun, rounded shapes, vibrant, friendly, approachable',
    tech: 'tech, futuristic, circuit-like, sharp angles, digital, innovation',
    nature: 'organic, natural, leaf or wave shapes, eco-friendly, earthy tones',
  };

  const colorGuides = {
    blue: ['#1A73E8', '#0D47A1', '#E8F0FE'],
    green: ['#2E7D32', '#1B5E20', '#E8F5E9'],
    red: ['#C62828', '#B71C1C', '#FFEBEE'],
    purple: ['#6A1B9A', '#4A148C', '#F3E5F5'],
    orange: ['#E65100', '#BF360C', '#FFF3E0'],
    black: ['#212121', '#424242', '#F5F5F5'],
    gold: ['#F57F17', '#E65100', '#FFF8E1'],
  };

  const selectedColors = colorGuides[colors] || colorGuides.blue;
  const styleDesc = styleGuides[style] || styleGuides.modern;

  const prompt = `You are a professional logo designer. Create 3 different SVG logo variations for a company called "${name}"${tagline ? ` with tagline "${tagline}"` : ''}.

Style: ${styleDesc}
Primary color: ${selectedColors[0]}
Secondary color: ${selectedColors[1]}
Background/light color: ${selectedColors[2]}

STRICT RULES:
- Return ONLY a valid JSON array with 3 objects, no markdown, no explanation
- Each object: { "name": "Variation name", "svg": "complete SVG code", "description": "brief description" }
- Each SVG must be self-contained, viewBox="0 0 300 150", no external dependencies
- Include the company name "${name}" as text in each logo
- Each variation must look completely different (icon + text, text only, emblem, etc.)
- Use only the specified colors
- Make them professional and realistic
- SVG must be valid and renderable

Return only the JSON array, starting with [ and ending with ]`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4000, temperature: 0.9 },
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.replace(/```json|```/g, '').trim();

    const startIdx = text.indexOf('[');
    const endIdx = text.lastIndexOf(']');
    if (startIdx === -1 || endIdx === -1) throw new Error('Format JSON invalide');

    const jsonStr = text.substring(startIdx, endIdx + 1);
    const logos = JSON.parse(jsonStr);

    return res.status(200).json({ logos });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur génération logo : ' + err.message });
  }
}
