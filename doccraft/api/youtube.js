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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API Gemini non configurée.' });

  const { url, lang } = req.body;
  if (!url) return res.status(400).json({ error: 'URL manquante.' });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: 'URL YouTube invalide. Exemple : https://youtube.com/watch?v=xxxxx' });

  const outLang = { fr: 'français', en: 'english', de: 'german' }[lang] || 'français';

  try {
    // Fetch transcript - try requested language then fallback to English
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
      return res.status(404).json({ error: 'Aucun sous-titre disponible pour cette vidéo. La vidéo doit avoir des sous-titres activés.' });
    }

    // Build transcript text (limit to ~4000 tokens)
    const fullText = transcript.map(t => t.text).join(' ').substring(0, 12000);

    const prompt = `Tu es un assistant expert en prise de notes. Analyse cette transcription de vidéo YouTube et génère un résumé complet en ${outLang}.

Transcription :
${fullText}

Génère le résumé en HTML avec ce format EXACT (sans balises html/body/head) :

<h2>[Résumé en ${outLang}]</h2>
<p>3 à 5 phrases résumant l'essentiel de la vidéo</p>

<h2>[Points clés en ${outLang}]</h2>
<ul>
<li><strong>Point 1</strong> : explication</li>
<li><strong>Point 2</strong> : explication</li>
</ul>

<h2>[Notes détaillées en ${outLang}]</h2>
<p>Section 1 : ...</p>
<p>Section 2 : ...</p>

<h2>[Mots-clés en ${outLang}]</h2>
<p><span class="pill">mot1</span> <span class="pill">mot2</span></p>

Commence directement par le HTML.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.5 },
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = result.replace(/```html|```/g, '').trim();

    return res.status(200).json({
      result: clean,
      videoId,
      transcriptLength: transcript.length,
    });

  } catch (err) {
    if (err.message?.includes('Could not get transcripts')) {
      return res.status(404).json({ error: 'Sous-titres non disponibles pour cette vidéo. Essayez une vidéo avec des sous-titres activés.' });
    }
    return res.status(500).json({ error: 'Erreur : ' + err.message });
  }
}
