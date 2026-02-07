export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { resumeText, jobDescription } = req.body;

  if (!resumeText || !jobDescription) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return res.status(500).json({ 
        error: 'API key not configured',
        details: 'GEMINI_API_KEY environment variable is missing'
      });
    }
    
    const prompt = `You are an expert ATS (Applicant Tracking System) analyzer and career coach.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Analyze this resume against the job description and provide a comprehensive ATS analysis.

Return ONLY valid JSON with this exact structure (no markdown, no backticks, no extra text):
{
  "score": <number 0-100>,
  "keywordMatch": {
    "matched": [<array of matched keywords, limit 10>],
    "missing": [<array of critical missing keywords, limit 8>],
    "total": <total keywords analyzed>
  },
  "improvements": [
    {
      "title": "<improvement title>",
      "description": "<specific actionable advice>",
      "impact": "<high|medium|low>"
    }
  ],
  "sections": {
    "format": "<good|needs-work>",
    "keywords": "<good|needs-work>",
    "experience": "<good|needs-work>",
    "skills": "<good|needs-work>"
  }
}

Provide exactly 5 improvements ordered by impact (high to low). Be specific and actionable.`;

    // Use gemini-2.0-flash-lite - lighter model with separate quota
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
      console.error('Gemini API Error Response:', errorData);
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      return res.status(500).json({ 
        error: 'AI service error',
        details: errorData.substring(0, 500)
      });
    }

    const data = await response.json();
    console.log('Gemini Response:', JSON.stringify(data).substring(0, 200));
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Unexpected response structure:', JSON.stringify(data));
      return res.status(500).json({
        error: 'Unexpected AI response',
        details: 'Response missing expected fields'
      });
    }
    
    const text = data.candidates[0].content.parts[0].text;
    
    // Clean up the response (remove markdown code blocks if present)
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```\n?/g, '');
    }
    
    // Parse the JSON response
    const analysis = JSON.parse(cleanText);

    return res.status(200).json(analysis);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed',
      details: error.message 
    });
  }
}
