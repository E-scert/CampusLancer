const https = require("https");

// Helper to make a single HTTPS request with Google API key support
function makeRequest(url, data, apiKey) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    let path = parsedUrl.pathname + (parsedUrl.search || "");
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    };

    // If using Google's generativelanguage endpoint, pass API key as query param
    if (
      parsedUrl.hostname &&
      parsedUrl.hostname.includes("generativelanguage.googleapis.com")
    ) {
      path += (parsedUrl.search ? "&" : "?") + `key=${apiKey}`;
    } else {
      // Default: use Bearer auth
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const options = {
      hostname: parsedUrl.hostname,
      path,
      method: "POST",
      headers,
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          // Try to extract common text fields from different response shapes
          let extractedText = null;
          if (
            parsed &&
            parsed.candidates &&
            parsed.candidates[0]?.content?.parts &&
            parsed.candidates[0].content.parts[0]?.text
          ) {
            extractedText = parsed.candidates[0].content.parts[0].text;
          } else if (parsed && parsed.output && parsed.output[0]?.content) {
            const firstContent = parsed.output[0].content[0];
            if (firstContent && firstContent.text)
              extractedText = firstContent.text;
          } else if (parsed && parsed.output_text) {
            extractedText = parsed.output_text;
          }
          resolve({ parsed, text: extractedText, statusCode: res.statusCode });
        } catch (e) {
          console.error("Failed to parse response:", e.message);
          resolve(null);
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// Simple AI service wrapper for Gemini API.
// Falls back to template feedback if API_URL or API_KEY are missing.
async function callExternalAI(payload) {
  // Support both AI_API_* and generic API_* env var names
  const apiUrl = process.env.AI_API_URL || process.env.API_URL;
  const apiKey = process.env.AI_API_KEY || process.env.API_KEY;
  if (!apiUrl || !apiKey) return null;

  try {
    const data = JSON.stringify(payload);

    // Try primary URL first
    console.log("Attempting primary API URL:", apiUrl);
    let result = await makeRequest(apiUrl, data, apiKey);
    console.log("Primary API response:", result?.parsed || result);

    if (result && result.parsed && !result.parsed.error) {
      return result;
    }

    // If primary URL fails with 404, try fallback models
    if (result && result.parsed && result.parsed.error?.code === 404) {
      console.log("Primary URL returned 404. Trying fallback models...");

      const fallbackModels = [
        // Try standard models first
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
        "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
        "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-latest:generateContent",
        // Try generateText endpoint instead
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText",
        "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateText",
      ];

      for (const fallbackUrl of fallbackModels) {
        try {
          console.log("Trying fallback URL:", fallbackUrl);
          result = await makeRequest(fallbackUrl, data, apiKey);
          console.log("Fallback response:", result?.parsed || result);

          if (result && result.parsed && !result.parsed.error) {
            console.log("Fallback successful with:", fallbackUrl);
            return result;
          }
        } catch (err) {
          console.error("Fallback attempt failed:", err.message);
          continue;
        }
      }
    }

    return result;
  } catch (err) {
    console.error("AI call failed:", err.message);
    return null;
  }
}

async function generateRejectionFeedback(task, profile, missingSkills) {
  // Build prompt text for Gemini
  const promptText = `
    Task: ${task.title}
    Description: ${task.description}
    Required skill: ${task.required_skill}
    Student: ${profile?.first_name || "Student"} ${profile?.last_name || ""}
    Student skills: ${profile?.top_languages || "None"}
    Missing skills: ${missingSkills?.join(", ") || "None"}

    Generate polite rejection feedback highlighting missing skills and suggestions.
  `;

  // Gemini expects { contents: [...] }
  const external = await callExternalAI({
    contents: [
      {
        parts: [{ text: promptText }],
      },
    ],
  });

  // If callExternalAI returns an object with extracted text, use it
  if (external && external.text && typeof external.text === "string") {
    return external.text;
  }
  // Fallback: if parsed object exists and contains Gemini-like candidates, try that
  if (
    external &&
    external.parsed &&
    external.parsed.candidates &&
    external.parsed.candidates[0]?.content?.parts &&
    external.parsed.candidates[0].content.parts[0]?.text
  ) {
    return external.parsed.candidates[0].content.parts[0].text;
  }
  // Also try older shapes
  if (external && external.parsed && external.parsed.output_text) {
    return external.parsed.output_text;
  }

  // Fallback: simple template-driven feedback
  let feedback = `Thanks for applying to "${task.title}". `;
  if (missingSkills && missingSkills.length) {
    feedback += `This role requires: ${missingSkills.join(", ")} which we found to be missing or limited on your profile. `;
  }
  feedback += "Recommendations: ";
  if (missingSkills && missingSkills.length) {
    feedback += `Work on projects and tutorials that demonstrate ${missingSkills.join(", ")} skills, add README and CI where possible, and reapply when you have practical examples.`;
  } else {
    feedback +=
      "Consider improving your project documentation and demonstrating applied examples in a public repo.";
  }
  return feedback;
}

module.exports = { generateRejectionFeedback };
