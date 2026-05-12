const https = require("https");

// Fetch JSON from GitHub API (similar to githubScanner but minimal)
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: url,
      headers: { "User-Agent": "CampusLancer-App" },
    };
    https
      .get(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

// Get top languages from GitHub repos
async function getGitHubLanguages(username) {
  try {
    const repos = await fetchJSON(
      `/users/${username}/repos?per_page=100&sort=updated`,
    );
    if (!Array.isArray(repos)) {
      return [];
    }
    const languageCounts = {};
    repos.forEach((r) => {
      if (r.language) {
        languageCounts[r.language] = (languageCounts[r.language] || 0) + 1;
      }
    });
    const langs = Object.keys(languageCounts).map((lang) => lang.toLowerCase());
    return langs;
  } catch (err) {
    console.error("Error fetching GitHub languages:", err.message);
    return [];
  }
}

function normalizeSkill(skill) {
  if (!skill || typeof skill !== "string") return "";
  const normalized = skill.toLowerCase().trim();
  const mapping = {
    "node.js": "javascript",
    nodejs: "javascript",
    node: "javascript",
    js: "javascript",
    javascript: "javascript",
    typescript: "typescript",
    ts: "typescript",
    python: "python",
    java: "java",
    "c++": "c++",
    cpp: "c++",
    "c#": "c#",
    csharp: "c#",
    html: "html",
    css: "css",
    ruby: "ruby",
    php: "php",
    go: "go",
    rust: "rust",
    kotlin: "kotlin",
    swift: "swift",
    scala: "scala",
    dart: "dart",
    sql: "sql",
    bash: "bash",
    shell: "bash",
    powershell: "powershell",
    objectivec: "objective-c",
    "objective-c": "objective-c",
    perl: "perl",
    lua: "lua",
    matlab: "matlab",
    r: "r",
    groovy: "groovy",
    elixir: "elixir",
    haskell: "haskell",
    clojure: "clojure",
    julia: "julia",
  };
  return mapping[normalized] || normalized;
}

// Match skills: check if student's languages include required skills
function matchSkills(studentLanguages, requiredSkills) {
  if (!requiredSkills || !Array.isArray(requiredSkills)) return false;
  const requiredNormalized = requiredSkills
    .map((s) => normalizeSkill(s))
    .filter(Boolean);
  const studentNormalized = studentLanguages.map((lang) =>
    normalizeSkill(lang),
  );
  return requiredNormalized.every((req) => studentNormalized.includes(req));
}

// Main function to decide application status
async function decideApplicationStatus(githubUsername, requiredSkills) {
  if (!githubUsername || githubUsername.trim() === "") {
    return {
      status: "rejected",
      reason: "GitHub username is missing.",
    };
  }

  const studentLanguages = await getGitHubLanguages(githubUsername);
  if (!studentLanguages.length) {
    return {
      status: "rejected",
      reason: "No public GitHub languages were found for this profile.",
    };
  }

  const matches = matchSkills(studentLanguages, requiredSkills);
  if (matches) {
    return {
      status: "accepted",
      reason: `Matched required skills based on GitHub languages: ${studentLanguages.join(", ")}.`,
    };
  }

  const requiredNormalized = requiredSkills
    .map((s) => normalizeSkill(s))
    .filter(Boolean);
  const missing = requiredNormalized.filter(
    (req) =>
      !studentLanguages.map((lang) => normalizeSkill(lang)).includes(req),
  );

  return {
    status: "rejected",
    reason: `Required skills [${requiredNormalized.join(", ")}] not found in GitHub languages [${studentLanguages.join(", ")}]. Missing: [${missing.join(", ")}].`,
  };
}

module.exports = { decideApplicationStatus };
