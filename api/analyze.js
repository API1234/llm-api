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
        body: JSON.stringify({ word })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "LLM error", details: err.message });
  }
}

