import { YoutubeTranscript } from 'youtube-transcript';

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API Groq non configurée.' });

  const { url, lang } = req.body;
  if (!url) return res.status(400).json({ error: 'URL manquante.' });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: 'URL YouTube invalide.' });

  const outLang = { fr: 'français', en: 'english', de: 'german' }[lang] || 'français';

  try {
    let transcript;
    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: lang || 'fr' });
    } catch {
      try {
        transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
      } catch {
        transcript = await YoutubeTranscript.fetchTranscript(videoId);
      }
    }

    if (!transcript || transcript.length === 0) {
      return res.status(404).json({ error: 'Aucun sous-titre disponible pour cette vidéo.' });
    }

    const fullText = transcript.map(t => t.text).join(' ').substring(0, 10000);

    const prompt = `Analyse cette transcription YouTube et génère un résumé complet en ${outLang}.

Transcription : ${fullText}

Format HTML exact (sans html/body/head) :
<h2>[Résumé]</h2>
<p>3 à 5 phrases de résumé</p>
<h2>[Points clés]</h2>
<ul><li><strong>Point</strong> : explication</li></ul>
<h2>[Notes détaillées]</h2>
<p>Sections importantes développées</p>
<h2>[Mots-clés]</h2>
<p><span class="pill">mot1</span> <span class="pill">mot2</span></p>

Commence directement par le HTML.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2000,
        temperature: 0.5,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const result = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({
      result: result.replace(/```html|```/g, '').trim(),
      videoId,
    });

  } catch (err) {
    if (err.message?.includes('Could not get transcripts')) {
      return res.status(404).json({ error: 'Sous-titres non disponibles pour cette vidéo.' });
    }
    return res.status(500).json({ error: 'Erreur : ' + err.message });
  }
}
