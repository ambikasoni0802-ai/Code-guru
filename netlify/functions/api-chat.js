// Netlify Function — Ye Code Guru ka PUBLIC API hai
// Koi bhi developer apni Code Guru API key se ise call kar sakta hai.
// Andar Groq use hota hai, lekin caller ko Groq ke baare mein pata nahi chalta.

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key"
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: "Sirf POST allowed hai" }) };
  }

  try {
    const apiKey = event.headers["x-api-key"];
    if (!apiKey) {
      return { statusCode: 401, headers: corsHeaders(), body: JSON.stringify({ error: "x-api-key header zaroori hai. Pehle Code Guru se apni key banayein." }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    // Key ko database mein verify karo
    const checkRes = await fetch(
      `${supabaseUrl}/rest/v1/api_keys?key=eq.${encodeURIComponent(apiKey)}&active=eq.true&select=id`,
      { headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` } }
    );
    const checkData = await checkRes.json();

    if (!checkRes.ok || !Array.isArray(checkData) || checkData.length === 0) {
      return { statusCode: 401, headers: corsHeaders(), body: JSON.stringify({ error: "Invalid ya inactive API key." }) };
    }

    const { messages, system } = JSON.parse(event.body || "{}");
    if (!messages) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: "messages array zaroori hai." }) };
    }

    const groqMessages = system ? [{ role: "system", content: system }, ...messages] : messages;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        max_tokens: 1000,
        messages: groqMessages
      })
    });

    const data = await groqResponse.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
  }
};
