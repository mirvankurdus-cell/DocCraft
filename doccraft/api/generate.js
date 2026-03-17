export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API non configurée.' });

  const { prompt, max_tokens, type } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt manquant.' });

  // Different system prompts depending on task type
  const systemPrompts = {
    cv: `You are a professional HR expert and CV writer. Your task is to generate a complete, well-structured CV in HTML format. 
CRITICAL RULES:
- Output ONLY raw HTML code, nothing else
- NO markdown, NO explanations, NO comments, NO backticks
- Start directly with an HTML tag like <div> or <section>
- Use only these HTML tags: div, h1, h2, h3, p, ul, li, span, strong, em, hr, table, tr, td
- Use inline CSS styles for formatting
- The CV must look professional and complete
- Write ALL content in the requested language`,

    summary: `You are a professional text summarization expert. Your task is to analyze a text and produce a SHORT, CONCISE summary.
CRITICAL RULES:
- Output ONLY raw HTML code, nothing else  
- NO markdown, NO explanations, NO backticks, NO repeating the original text
- The summary must be SHORTER than the original (max 30% of original length)
- Start directly with <h2>
- Structure: Summary (3-5 sentences max) + Key points (5-8 bullets) + Keywords (5-7 words)
- Write ALL content in the requested language`,

    social: `You are a social media content expert. Create engaging posts for different platforms.
CRITICAL RULES:
- Output ONLY raw HTML code, nothing else
- NO markdown, NO backticks, NO explanations
- Each post must be platform-appropriate
- Write ALL content in the requested language`,

    default: `You are a helpful AI assistant. Follow the instructions exactly.
CRITICAL RULES:
- Output ONLY what is requested
- NO extra explanations, NO markdown backticks
- If HTML is requested, output only raw HTML`
  };

  const systemPrompt = systemPrompts[type] || systemPrompts.default;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: max_tokens || 2000,
        temperature: type === 'cv' ? 0.3 : 0.5,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    let text = data.choices?.[0]?.message?.content || '';
    // Clean any markdown artifacts
    text = text.replace(/```html\s*/gi, '').replace(/```\s*/gi, '').trim();
    // Remove any leading text before first HTML tag
    const firstTag = text.search(/<[a-zA-Z]/);
    if (firstTag > 0) text = text.substring(firstTag);

    return res.status(200).json({ result: text });

  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur : ' + err.message });
  }
}
