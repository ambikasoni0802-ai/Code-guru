// Netlify Function — Code Guru khud deploy karta hai (owner ke apne token se)
// Zaroori Netlify secret: NETLIFY_DEPLOY_TOKEN (site ke OWNER ka apna Netlify Personal Access Token)
// Is function ko use karne wale kisi bhi user ko koi token nahi dena padta.

const crypto = require("crypto");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Sirf POST allowed hai" }) };
  }

  try {
    const { content } = JSON.parse(event.body || "{}");
    if (!content) {
      return { statusCode: 400, body: JSON.stringify({ error: "content zaroori hai" }) };
    }

    const ownerToken = process.env.NETLIFY_DEPLOY_TOKEN;
    if (!ownerToken) {
      return { statusCode: 500, body: JSON.stringify({ error: "Server par NETLIFY_DEPLOY_TOKEN set nahi hai. Site owner ko ye ek baar set karna hoga." }) };
    }

    const headers = {
      "Authorization": `Bearer ${ownerToken}`,
      "Content-Type": "application/json"
    };

    // Har app ke liye nayi site banao
    const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers,
      body: JSON.stringify({})
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      return { statusCode: createRes.status, body: JSON.stringify({ error: createData.message || "Site nahi ban payi" }) };
    }
    const siteId = createData.id;
    const siteUrl = createData.ssl_url || createData.url;

    const sha1 = crypto.createHash("sha1").update(content, "utf-8").digest("hex");

    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: "POST",
      headers,
      body: JSON.stringify({ files: { "/index.html": sha1 } })
    });
    const deployData = await deployRes.json();
    if (!deployRes.ok) {
      return { statusCode: deployRes.status, body: JSON.stringify({ error: deployData.message || "Deploy shuru nahi hui" }) };
    }

    if (deployData.required && deployData.required.includes(sha1)) {
      const uploadRes = await fetch(`https://api.netlify.com/api/v1/deploys/${deployData.id}/files/index.html`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${ownerToken}`,
          "Content-Type": "application/octet-stream"
        },
        body: content
      });
      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.json();
        return { statusCode: uploadRes.status, body: JSON.stringify({ error: uploadErr.message || "File upload fail hui" }) };
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: siteUrl })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
