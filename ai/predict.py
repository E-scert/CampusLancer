import sys, json, joblib, numpy as np, os, random

try:
    model_path = os.path.join(os.path.dirname(__file__), "github_model.pkl")
    model = joblib.load(model_path)

    repo_count = int(sys.argv[1])
    stars = int(sys.argv[2])
    followers = int(sys.argv[3])
    account_age = int(sys.argv[4])
    has_readme = int(sys.argv[5])

    X = np.array([[repo_count, stars, followers, account_age, has_readme]])
    score = model.predict(X)[0]
    normalized_score = max(0, min(100, round(score)))

    # Multiple phrasing options
    repo_suggestions = [
        f"With only {repo_count} repos, consider building more projects.",
        "Expand your repository count to show breadth of skills.",
        "Try adding new repos to demonstrate variety."
    ]
    star_suggestions = [
        f"Your {stars} stars are a good start — aim for more by contributing to popular projects.",
        "Boost visibility by working on projects that attract stars.",
        "Collaborate on trending repos to gain more stars."
    ]
    follower_suggestions = [
        f"Currently at {followers} followers — engage more with the community to grow.",
        "Networking with other devs can help increase followers.",
        "Share your work on social platforms to attract followers."
    ]
    readme_suggestions = [
        "Add README files to explain your projects clearly.",
        "A strong README improves project visibility.",
        "Document your repos with READMEs for better impact."
    ]

    suggestions = []
    if repo_count < 5:
        suggestions.append(random.choice(repo_suggestions))
    if stars < 10:
        suggestions.append(random.choice(star_suggestions))
    if followers < 5:
        suggestions.append(random.choice(follower_suggestions))
    if not has_readme:
        suggestions.append(random.choice(readme_suggestions))

    print(json.dumps({"score": normalized_score, "suggestions": suggestions}))

except Exception as e:
    print(json.dumps({"error": str(e)}))
