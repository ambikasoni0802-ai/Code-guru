// Netlify Function — Code Guru ka backend proxy (Groq — FREE)
// Ye function aapki Groq API key ko chhupa kar Groq API ko call karta hai.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Sirf POST allowed hai"
    };
  }

  try {
    const body = JSON.parse(event.body);

    // Groq OpenAI-compatible format chahta hai: system message array ke andar hi jaata hai
    const groqMessages = [
      { role: "system", content: body.system },
      ...body.messages
    ];

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.GROQ_API_KEY // Netlify ke secret se aayega
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        max_tokens: 4000,
        messages: groqMessages
      })
    });

    const data = await groqResponse.json();
    console.log("GROQ_STATUS:", groqResponse.status, "GROQ_BODY:", JSON.stringify(data));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
