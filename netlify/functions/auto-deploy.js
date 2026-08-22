// Netlify Function — Code Guru khud deploy karta hai, ab VERCEL ke through (owner ke apne token se)
// Zaroori Netlify secret: VERCEL_TOKEN (site ke OWNER ka apna Vercel token, https://vercel.com/account/tokens se)
// Is function ko use karne wale kisi bhi user ko koi token nahi dena padta.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Sirf POST allowed hai" }) };
  }

  try {
    const { content } = JSON.parse(event.body || "{}");
    if (!content) {
      return { statusCode: 400, body: JSON.stringify({ error: "content zaroori hai" }) };
    }

    const ownerToken = process.env.VERCEL_TOKEN;
    if (!ownerToken) {
      return { statusCode: 500, body: JSON.stringify({ error: "Server par VERCEL_TOKEN set nahi hai. Site owner ko ye ek baar set karna hoga." }) };
    }

    const projectName = "cg-app-" + Math.random().toString(36).slice(2, 9);
    const base64Content = Buffer.from(content, "utf-8").toString("base64");

    const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ownerToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: projectName,
        files: [{ file: "index.html", data: base64Content, encoding: "base64" }],
        target: "production",
        projectSettings: { framework: null }
      })
    });

    const deployData = await deployRes.json();
    if (!deployRes.ok) {
      return { statusCode: deployRes.status, body: JSON.stringify({ error: deployData.error?.message || "Deploy fail hui" }) };
    }

    const liveUrl = "https://" + deployData.url;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: liveUrl })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
