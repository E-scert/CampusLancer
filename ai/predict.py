import sys, json, joblib, numpy as np, os

try:
    # Load model relative to this file
    model_path = os.path.join(os.path.dirname(__file__), "github_model.pkl")
    model = joblib.load(model_path)

    # Accept plain arguments: repo_count stars followers account_age has_readme
    repo_count = int(sys.argv[1])
    stars = int(sys.argv[2])
    followers = int(sys.argv[3])
    account_age = int(sys.argv[4])
    has_readme = int(sys.argv[5])

    # Convert to array
    X = np.array([[repo_count, stars, followers, account_age, has_readme]])

    # Predict
    score = model.predict(X)[0]

    # normalize to 0 - 100 range
    normalized_score = max(0, min(100, round(score)))

    # Suggestions
    suggestions = []
    if repo_count < 5:
        suggestions.append("Build more repositories to showcase skills.")
    if stars < 10:
        suggestions.append("Work on projects that attract attention.")
    if followers < 5:
        suggestions.append("Engage with the community to grow your network.")

    print(json.dumps({"score": normalized_score, "suggestions": suggestions}))

except Exception as e:
    print(json.dumps({"error": str(e)}))