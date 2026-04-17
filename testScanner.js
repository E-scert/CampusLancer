const scanGitHub = require("./config/githubScanner");

(async () => {
  try {
    const result = await scanGitHub("E-scert"); // test with GitHub's sample user
    console.log("=== GitHub Scan Result ===");
    console.log("Score:", result.score);
    console.log("Suggestions:", result.suggestions);
  } catch (err) {
    console.error("Error running scan:", err);
  }
})();
