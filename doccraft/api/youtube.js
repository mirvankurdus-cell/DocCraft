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
  if (!apiKey) return res.status(500).json({ error: 'Clé API non configurée.' });

  const { url, lang } = req.body;
  if (!url) return res.status(400).json({ error: 'URL manquante.' });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: 'URL YouTube invalide. Exemple : https://youtube.com/watch?v=xxxxx' });

  const outLang = { fr: 'français', en: 'english', de: 'german' }[lang] || 'français';

  try {
    let transcript;
    try { transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: lang || 'fr' }); }
    catch { try { transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' }); }
    catch { transcript = await YoutubeTranscript.fetchTranscript(videoId); } }

    if (!transcript || transcript.length === 0) {
      return res.status(404).json({ error: 'Aucun sous-titre disponible pour cette vidéo.' });
    }

    const fullText = transcript.map(t => t.text).join(' ').substring(0, 8000);

    const prompt = `You are a note-taking expert. Analyze this YouTube transcript and create a CONCISE summary in ${outLang}.

TRANSCRIPT:
${fullText}

OUTPUT RULES:
- Output ONLY raw HTML, no markdown, no backticks, no explanations
- Start directly with <h2>
- The summary must be MUCH shorter than the transcript (max 20% of length)
- Use this exact structure:

<h2>[Summary title in ${outLang}]</h2>
<p>[3-4 sentences maximum summarizing the main point]</p>

<h2>[Key points title in ${outLang}]</h2>
<ul>
<li><strong>[Point 1 title]</strong> : [one sentence explanation]</li>
<li><strong>[Point 2 title]</strong> : [one sentence explanation]</li>
<li><strong>[Point 3 title]</strong> : [one sentence explanation]</li>
<li><strong>[Point 4 title]</strong> : [one sentence explanation]</li>
<li><strong>[Point 5 title]</strong> : [one sentence explanation]</li>
</ul>

<h2>[Detailed notes title in ${outLang}]</h2>
<p>[2-3 sentences of additional context]</p>

<h2>[Keywords title in ${outLang}]</h2>
<p><span class="pill">keyword1</span> <span class="pill">keyword2</span> <span class="pill">keyword3</span> <span class="pill">keyword4</span> <span class="pill">keyword5</span></p>`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1200,
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'You are a summarization expert. Output ONLY raw HTML. Never repeat the input text. Be concise.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    let result = data.choices?.[0]?.message?.content || '';
    result = result.replace(/```html\s*/gi, '').replace(/```\s*/gi, '').trim();
    const firstTag = result.search(/<[a-zA-Z]/);
    if (firstTag > 0) result = result.substring(firstTag);

    return res.status(200).json({ result, videoId });

  } catch (err) {
    if (err.message?.includes('Could not get transcripts')) {
      return res.status(404).json({ error: 'Sous-titres non disponibles. La vidéo doit avoir des sous-titres activés.' });
    }
    return res.status(500).json({ error: 'Erreur : ' + err.message });
  }
}
