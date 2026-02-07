export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ error: 'Missing question or answer' });
  }

  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ 
        error: 'API key not configured',
        details: 'GEMINI_API_KEY environment variable is missing'
      });
    }
    
    const prompt = `You are an expert interview coach providing feedback.

INTERVIEW QUESTION:
${question}

CANDIDATE'S ANSWER:
${answer}

Provide constructive feedback on this answer. Include:
1. What they did well
2. What could be improved
3. A suggested better way to answer
4. Tips for delivery

Be encouraging but honest. Keep feedback concise (3-4 paragraphs).

Return ONLY the feedback text, no additional formatting.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(500).json({ 
        error: 'AI service error',
        details: errorData.substring(0, 500)
      });
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      return res.status(500).json({
        error: 'Unexpected AI response',
        details: 'Response missing expected fields'
      });
    }
    
    const feedback = data.candidates[0].content.parts[0].text.trim();

    return res.status(200).json({ feedback });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Feedback failed',
      details: error.message 
    });
  }
}
