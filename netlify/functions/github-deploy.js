// Netlify Function — GitHub par file push/update karta hai
// User apna khud ka GitHub Personal Access Token bhejta hai (server par store nahi hota)

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Sirf POST allowed hai" };
  }

  try {
    const { token, owner, repo, path, content, message } = JSON.parse(event.body);

    if (!token || !owner || !repo || !path) {
      return { statusCode: 400, body: JSON.stringify({ message: "token, owner, repo, path zaroori hain" }) };
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "code-guru-app"
    };

    // Pehle check karo file already exist karti hai (uska sha chahiye update ke liye)
    let sha = undefined;
    const getRes = await fetch(apiUrl, { headers });
    if (getRes.status === 200) {
      const getData = await getRes.json();
      sha = getData.sha;
    }

    const encodedContent = Buffer.from(content, "utf-8").toString("base64");

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message || "Update via Code Guru",
        content: encodedContent,
        sha: sha
      })
    });

    const putData = await putRes.json();

    return {
      statusCode: putRes.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(putData)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: err.message })
    };
  }
};
