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

  const { jobDescription } = req.body;

  if (!jobDescription) {
    return res.status(400).json({ error: 'Missing job description' });
  }

  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ 
        error: 'API key not configured',
        details: 'GEMINI_API_KEY environment variable is missing'
      });
    }
    
    const prompt = `You are an expert interview coach.

JOB DESCRIPTION:
${jobDescription}

Generate 5 relevant interview questions for this position. Include a mix of:
- Technical/skills-based questions
- Behavioral questions
- Situation-specific questions

Return ONLY a JSON array of questions, like this:
["Question 1 here?", "Question 2 here?", "Question 3 here?", "Question 4 here?", "Question 5 here?"]

No markdown, no additional text, just the JSON array.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
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
    
    let text = data.candidates[0].content.parts[0].text.trim();
    
    // Clean up markdown
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const questions = JSON.parse(text);

    return res.status(200).json({ questions });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Generation failed',
      details: error.message 
    });
  }
}
