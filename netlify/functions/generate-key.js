// Netlify Function — Naya Code Guru API key banata hai aur Supabase mein save karta hai
// Ye "central" Supabase hai jo Code Guru ke OWNER (aap) ka hai — har user ka apna alag Supabase nahi.
// Zaroori Netlify secrets: SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role key, anon key nahi!)

const crypto = require("crypto");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Sirf POST allowed hai" };
  }

  try {
    const { name } = JSON.parse(event.body || "{}");
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server par SUPABASE_URL / SUPABASE_SERVICE_KEY set nahi hai." })
      };
    }

    const newKey = "cg_" + crypto.randomBytes(24).toString("hex");

    const res = await fetch(`${supabaseUrl}/rest/v1/api_keys`, {
      method: "POST",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        key: newKey,
        owner_name: name || "anonymous",
        created_at: new Date().toISOString(),
        active: true
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: data.message || data }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: newKey })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
