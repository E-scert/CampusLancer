require("dotenv").config();
const https = require("https");

const apiUrl = process.env.API_URL || process.env.AI_API_URL;
const apiKey = process.env.API_KEY || process.env.AI_API_KEY;

console.log("Testing API Key...");
console.log("API URL:", apiUrl);
console.log(
  "API Key format:",
  apiKey
    ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`
    : "<missing>",
);

if (!apiUrl || !apiKey) {
  console.error("❌ API URL or API KEY missing from .env");
  process.exit(1);
}

// Simple test prompt
const payload = {
  contents: [
    {
      parts: [{ text: "Say hello briefly." }],
    },
  ],
};

const data = JSON.stringify(payload);
const url = new URL(apiUrl);
let path = url.pathname + (url.search || "");

if (
  url.hostname &&
  url.hostname.includes("generativelanguage.googleapis.com")
) {
  path += (url.search ? "&" : "?") + `key=${apiKey}`;
}

const options = {
  hostname: url.hostname,
  path,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data),
  },
};

console.log("\nRequest details:");
console.log("Endpoint:", `${url.hostname}${path.split("?")[0]}`);
console.log("Method: POST");
console.log(
  "Full request URL (with key):",
  `${url.hostname}${path.substring(0, 80)}...`,
);

const req = https.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    console.log("\n✓ Response received (status:", res.statusCode + ")");
    try {
      const response = JSON.parse(body);
      if (response.error) {
        console.error("❌ API Error:", response.error);
      } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(
          "✓ Success! Response text:",
          response.candidates[0].content.parts[0].text,
        );
      } else {
        console.log("✓ Response structure looks valid, but no text extracted.");
        console.log("Response keys:", Object.keys(response));
      }
    } catch (e) {
      console.error("Failed to parse response:", e.message);
      console.log("Raw response:", body.substring(0, 200));
    }
  });
});

req.on("error", (err) => {
  console.error("❌ Request failed:", err.message);
});

req.write(data);
req.end();
