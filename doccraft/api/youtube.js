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

  // Extract video ID
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]{11})/);
  const videoId = match ? match[1] : (url.match(/^[a-zA-Z0-9_-]{11}$/) ? url : null);
  if (!videoId) return res.status(400).json({ error: 'URL YouTube invalide. Exemple : https://youtube.com/watch?v=xxxxx' });

  const outLang = { fr: 'français', en: 'english', de: 'german' }[lang] || 'français';

  try {
    // Fetch transcript using timedtext API (no npm package needed)
    const langCodes = lang === 'fr' ? ['fr', 'fr-FR', 'en', 'en-US'] : lang === 'de' ? ['de', 'de-DE', 'en', 'en-US'] : ['en', 'en-US', 'fr'];
    
    let transcriptText = null;
    
    for (const langCode of langCodes) {
      try {
        const transcriptUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${langCode}&fmt=json3`;
        const tRes = await fetch(transcriptUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DocCraft/1.0)' }
        });
        
        if (tRes.ok) {
          const contentType = tRes.headers.get('content-type') || '';
          if (contentType.includes('json')) {
            const tData = await tRes.json();
            if (tData.events && tData.events.length > 0) {
              const texts = tData.events
                .filter(e => e.segs)
                .map(e => e.segs.map(s => s.utf8 || '').join(''))
                .filter(t => t.trim())
                .join(' ');
              if (texts.length > 100) {
                transcriptText = texts;
                break;
              }
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    // If timedtext API fails, try the list endpoint to find available tracks
    if (!transcriptText) {
      try {
        const listUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&type=list`;
        const listRes = await fetch(listUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DocCraft/1.0)' }
        });
        if (listRes.ok) {
          const listText = await listRes.text();
          // Extract lang codes from XML response
          const langMatches = [...listText.matchAll(/lang_code="([^"]+)"/g)];
          for (const m of langMatches) {
            const lc = m[1];
            try {
              const tUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lc}&fmt=json3`;
              const tRes = await fetch(tUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
              if (tRes.ok) {
                const contentType = tRes.headers.get('content-type') || '';
                if (contentType.includes('json')) {
                  const tData = await tRes.json();
                  if (tData.events && tData.events.length > 0) {
                    const texts = tData.events.filter(e => e.segs).map(e => e.segs.map(s => s.utf8 || '').join('')).filter(t => t.trim()).join(' ');
                    if (texts.length > 100) { transcriptText = texts; break; }
                  }
                }
              }
            } catch { continue; }
          }
        }
      } catch (e) {}
    }

    if (!transcriptText || transcriptText.length < 50) {
      return res.status(404).json({
        error: 'Sous-titres non disponibles pour cette vidéo. La vidéo doit avoir des sous-titres activés (pas générés automatiquement). Essayez une conférence TED ou une vidéo éducative.'
      });
    }

    const truncated = transcriptText.substring(0, 6000);

    const prompt = `You are a professional note-taker. Summarize this YouTube video transcript in ${outLang}.

TRANSCRIPT:
${truncated}

STRICT RULES:
- Output ONLY raw HTML - no markdown, no backticks, no explanations
- The output must be MUCH shorter than the input (max 20% of length)
- Never copy sentences from the transcript verbatim
- Start directly with <h2>
- Write all headings and content in ${outLang}

FORMAT:
<h2>[Summary]</h2>
<p>3 sentences maximum capturing the main idea</p>
<h2>[Key Points]</h2>
<ul>
<li><strong>Point 1</strong>: one sentence</li>
<li><strong>Point 2</strong>: one sentence</li>
<li><strong>Point 3</strong>: one sentence</li>
<li><strong>Point 4</strong>: one sentence</li>
<li><strong>Point 5</strong>: one sentence</li>
</ul>
<h2>[Detailed Notes]</h2>
<p>2-3 sentences of additional important context</p>
<h2>[Keywords]</h2>
<p><span class="pill">word1</span> <span class="pill">word2</span> <span class="pill">word3</span> <span class="pill">word4</span> <span class="pill">word5</span></p>`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'You are a summarization expert. Output ONLY raw HTML starting with <h2>. Never copy the input text.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const groqData = await groqRes.json();
    if (groqData.error) return res.status(400).json({ error: groqData.error.message });

    let result = groqData.choices?.[0]?.message?.content || '';
    result = result.replace(/```html\s*/gi, '').replace(/```\s*/gi, '').trim();
    const firstTag = result.search(/<h2/i);
    if (firstTag > 0) result = result.substring(firstTag);

    return res.status(200).json({ result, videoId });

  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur : ' + err.message });
  }
}
