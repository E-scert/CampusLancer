import pandas as pd
from sklearn.linear_model import LinearRegression
import joblib

# Load dataset
data = pd.read_csv("github_profiles.csv")

X = data[["repo_count", "stars", "followers", "account_age", "has_readme"]]
y = data["score"]

# Train model
model = LinearRegression()
model.fit(X, y)

# Save model
joblib.dump(model, "github_model.pkl")

print(" Model trained and saved as github_model.pkl")