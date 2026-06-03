require("dotenv").config();
const { generateRejectionFeedback } = require("./config/aiService.js"); // replace with your actual filename

(async () => {
  const feedback = await generateRejectionFeedback(
    { title: "Backend Task", description: "Build API", required_skill: "SQL" },
    {
      first_name: "JR",
      last_name: "Escert",
      top_languages: ["Java", "Node.js"],
    },
    ["SQL"],
  );

  console.log("Feedback:", feedback);
})();
