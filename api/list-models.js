export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      return res.status(200).json({ error: 'No API key configured' });
    }
    
    // List all available models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(200).json({ 
        error: 'API call failed',
        status: response.status,
        details: errorText 
      });
    }
    
    const data = await response.json();
    
    // Filter for models that support generateContent
    const contentModels = data.models.filter(model => 
      model.supportedGenerationMethods && 
      model.supportedGenerationMethods.includes('generateContent')
    );
    
    return res.status(200).json({
      success: true,
      total: data.models.length,
      contentGenModels: contentModels.length,
      models: contentModels.map(m => ({
        name: m.name,
        displayName: m.displayName,
        description: m.description
      }))
    });
    
  } catch (error) {
    return res.status(200).json({ 
      error: 'Exception occurred',
      message: error.message 
    });
  }
}
