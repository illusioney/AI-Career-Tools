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

  const { resumeText, jobDescription } = req.body;

  if (!resumeText || !jobDescription) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ 
        error: 'API key not configured',
        details: 'GEMINI_API_KEY environment variable is missing'
      });
    }
    
    const prompt = `You are a professional cover letter writer.

CANDIDATE BACKGROUND:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Write a compelling, professional cover letter for this candidate applying to this position. The cover letter should:
- Be 3-4 paragraphs long
- Highlight relevant experience and skills from the candidate's background
- Show enthusiasm for the specific role and company
- Use professional but engaging tone
- Include specific examples where possible
- Be tailored to the job requirements

Format the cover letter with:
[Date]
[Hiring Manager/Company]

Dear Hiring Manager,

[Body paragraphs]

Sincerely,
[Candidate Name]

Return ONLY the cover letter text, no additional commentary.`;

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
    
    const coverLetter = data.candidates[0].content.parts[0].text.trim();

    return res.status(200).json({ coverLetter });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Generation failed',
      details: error.message 
    });
  }
}
