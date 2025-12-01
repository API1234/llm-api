export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { word } = req.body;
  if (!word) return res.status(400).json({ error: "Missing 'word'" });

  const appKey = process.env.XHS_APP_KEY;
  if (!appKey) {
    return res.status(500).json({ error: "APP_KEY environment variable is not set" });
  }

  // 设置 30 秒超时
  const timeoutMs = 30000;
  const controller = new AbortController();
  let timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {

    const response = await fetch(
      "https://aiplat-gateway.devops.beta.xiaohongshu.com/allin-workflow-apidemo/pipelines/main",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          APP_ID: "apidemo",
          APP_KEY: appKey
        },
        body: JSON.stringify({ word }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('API Error:', err);
    
    if (err.name === 'AbortError') {
      return res.status(504).json({ 
        error: "Request timeout", 
        details: "The request took too long to complete" 
      });
    }
    
    const statusCode = err.message.includes('504') ? 504 : 500;
    return res.status(statusCode).json({ 
      error: "LLM error", 
      details: err.message 
    });
  }
}

