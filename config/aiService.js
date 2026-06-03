const https = require("https");

// Simple AI service wrapper for Gemini API.
// Falls back to template feedback if API_URL or API_KEY are missing.
async function callExternalAI(payload) {
  const apiUrl = process.env.AI_API_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!apiUrl || !apiKey) return null;

  try {
    const data = JSON.stringify(payload);
    const url = new URL(apiUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + (url.search || ""),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        Authorization: `Bearer ${apiKey}`,
      },
    };

    return await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          console.log("Gemini raw response:", body); // <-- log full response
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            console.error("Failed to parse Gemini response:", e.message);
            resolve(null);
          }
        });
      });
      req.on("error", reject);
      req.write(data);
      req.end();
    });
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

  // Parse Gemini response correctly
  if (
    external &&
    external.candidates &&
    external.candidates[0]?.content?.parts &&
    external.candidates[0].content.parts[0]?.text
  ) {
    return external.candidates[0].content.parts[0].text;
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
