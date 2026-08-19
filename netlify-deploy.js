// Netlify Function — user ki apni Netlify account mein site deploy karta hai
// User apna khud ka Netlify Personal Access Token bhejta hai (server par store nahi hota)

const crypto = require("crypto");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Sirf POST allowed hai" };
  }

  try {
    const { token, siteId, content } = JSON.parse(event.body);
    if (!token || !content) {
      return { statusCode: 400, body: JSON.stringify({ error: "token aur content zaroori hain" }) };
    }

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    let finalSiteId = siteId;
    let siteUrl = "";

    // Agar site ID nahi di, to nayi site banao
    if (!finalSiteId) {
      const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
        method: "POST",
        headers,
        body: JSON.stringify({})
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        return { statusCode: createRes.status, body: JSON.stringify({ error: createData.message || "Site nahi ban payi" }) };
      }
      finalSiteId = createData.id;
      siteUrl = createData.ssl_url || createData.url;
    }

    // File ka SHA1 digest nikalo (Netlify ko chahiye hota hai)
    const sha1 = crypto.createHash("sha1").update(content, "utf-8").digest("hex");

    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${finalSiteId}/deploys`, {
      method: "POST",
      headers,
      body: JSON.stringify({ files: { "/index.html": sha1 } })
    });
    const deployData = await deployRes.json();
    if (!deployRes.ok) {
      return { statusCode: deployRes.status, body: JSON.stringify({ error: deployData.message || "Deploy shuru nahi hui" }) };
    }

    // Agar file abhi upload nahi hui hai to upload karo
    if (deployData.required && deployData.required.includes(sha1)) {
      const uploadRes = await fetch(`https://api.netlify.com/api/v1/deploys/${deployData.id}/files/index.html`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/octet-stream"
        },
        body: content
      });
      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.json();
        return { statusCode: uploadRes.status, body: JSON.stringify({ error: uploadErr.message || "File upload fail hui" }) };
      }
    }

    if (!siteUrl) {
      const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${finalSiteId}`, { headers });
      const siteData = await siteRes.json();
      siteUrl = siteData.ssl_url || siteData.url;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: siteUrl, siteId: finalSiteId, deployId: deployData.id })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
