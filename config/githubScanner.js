const https = require("https");
const { exec } = require("child_process");

// Fetch JSON from GitHub API
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

// Helper to call Python prediction
function runPrediction(features) {
  return new Promise((resolve, reject) => {
    const args = `${features.repo_count} ${features.stars} ${features.followers} ${features.account_age} ${features.has_readme}`;
    exec(
      `python predict.py ${args}`,
      { cwd: "./ai" },
      (error, stdout, stderr) => {
        if (error) {
          console.error("Python error:", stderr);
          return reject(error);
        }
        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (e) {
          console.error("Parse error. Raw output was:", stdout);
          reject(e);
        }
      },
    );
  });
}

// Helper for language demand notes
function getLanguageNote(lang) {
  const notes = {
    JavaScript: "Very High",
    Python: "High",
    Java: "High",
    "C#": "Growing",
    TypeScript: "Growing",
  };
  return notes[lang] || "Moderate";
}

// Map score ranges to recommended tasks
function getTasksFromScore(score) {
  const normalized = Math.max(0, Math.min(100, score));
  if (normalized < 30) {
    return [
      "Create at least 3 new repositories to showcase your skills.",
      "Add detailed READMEs to explain your projects.",
      "Engage with open source by contributing to issues or PRs.",
    ];
  } else if (normalized < 60) {
    return [
      "Work on projects that can attract stars.",
      "Improve documentation and add screenshots to repos.",
      "Network with peers and follow developers in your domain.",
    ];
  } else if (normalized < 80) {
    return [
      "Focus on polishing existing projects.",
      "Add tests and CI/CD pipelines to repos.",
      "Write blog posts or tutorials linked to your GitHub.",
    ];
  } else {
    return [
      "Maintain consistency by updating repos regularly.",
      "Mentor others or collaborate on larger projects.",
      "Consider building a flagship project that demonstrates leadership.",
    ];
  }
}

// Main GitHub scan function
async function scanGitHub(username) {
  try {
    const user = await fetchJSON(`/users/${username}`);
    if (user.message === "Not Found") {
      return {
        score: 0,
        suggestions: ["GitHub username not found. Please check and rescan."],
        languages: [],
        activity: {},
        community: {},
        tasks: [],
      };
    }

    const repos = await fetchJSON(
      `/users/${username}/repos?per_page=100&sort=updated`,
    );
    if (!Array.isArray(repos) || repos.length === 0) {
      return {
        score: 5,
        suggestions: [
          "No public repos found. Start building projects and push them to GitHub.",
        ],
        languages: [],
        activity: {},
        community: {},
        tasks: [],
      };
    }

    // Build features for the ML model
    const features = {
      repo_count: repos.length,
      stars: repos.reduce((s, r) => s + r.stargazers_count, 0),
      followers: user.followers,
      account_age:
        new Date().getFullYear() - new Date(user.created_at).getFullYear(),
      has_readme: repos.some((r) => r.description && r.description.length > 10)
        ? 1
        : 0,
    };

    // Call Python model
    const prediction = await runPrediction(features);

    // Languages breakdown
    const languageCounts = {};
    repos.forEach((r) => {
      if (r.language) {
        languageCounts[r.language] = (languageCounts[r.language] || 0) + 1;
      }
    });
    const topLanguages = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([lang, count]) => ({
        name: lang,
        count,
        demand: getLanguageNote(lang), // must be one of the expected strings
        jobs: `${lang} developers are in demand`,
      }));

    // Activity trend
    const recentRepos = repos.filter(
      (r) =>
        new Date(r.pushed_at) >
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    );
    const activity = {
      repos_updated_last_year: recentRepos.length,
      status:
        recentRepos.length > 5
          ? "Active contributor"
          : recentRepos.length > 0
            ? "Moderate activity"
            : "Low activity",
    };

    // Community engagement
    const community = {
      followers: user.followers,
      stars: features.stars,
      forks: repos.reduce((sum, r) => sum + r.forks_count, 0),
      status:
        user.followers < 10 && features.stars < 10
          ? "Below average engagement"
          : "Healthy engagement",
    };

    // Recommended tasks based on score
    const tasks = getTasksFromScore(prediction.score);

    // Return enriched JSON
    return {
      score: prediction.score,
      suggestions: prediction.suggestions,
      languages: topLanguages,
      activity,
      community,
      tasks,
    };
  } catch (err) {
    console.error("GitHub scan error:", err.message);
    return {
      score: 0,
      suggestions: ["GitHub scan failed. Please try again."],
      languages: [],
      activity: {},
      community: {},
      tasks: [],
    };
  }
}

module.exports = scanGitHub;
