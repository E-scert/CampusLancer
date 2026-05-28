import argparse
import os
import numpy as np
import pandas as pd
import pickle
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

FEATURE_COLUMNS = [
    "repo_count",
    "stars",
    "followers",
    "account_age",
    "has_readme",
    "commit_frequency",
    "has_ci_cd",
    "license_present",
]

DEFAULT_FEATURES = {
    "commit_frequency": 1,
    "has_ci_cd": 0,
    "license_present": 0,
}


def load_data(path):
    data = pd.read_csv(path)
    for feature, default in DEFAULT_FEATURES.items():
        if feature not in data.columns:
            data[feature] = default
    if "score" not in data.columns:
        raise ValueError("Dataset must include a 'score' column.")
    return data


def synthesize_examples(data, target_size=500, random_state=42):
    if len(data) >= target_size:
        return data.copy()

    rng = np.random.RandomState(random_state)
    synthetic_rows = []
    feature_means = data[FEATURE_COLUMNS].mean()

    for _ in range(target_size - len(data)):
        repo_count = max(0, int(rng.normal(loc=feature_means["repo_count"], scale=3)))
        stars = max(0, int(rng.normal(loc=feature_means["stars"], scale=15)))
        followers = max(0, int(rng.normal(loc=feature_means["followers"], scale=7)))
        account_age = max(0, int(rng.normal(loc=feature_means["account_age"], scale=2)))
        has_readme = int(rng.rand() < 0.85)
        commit_frequency = max(0, int(rng.normal(loc=feature_means["commit_frequency"], scale=2)))
        has_ci_cd = int(rng.rand() < 0.3)
        license_present = int(rng.rand() < 0.55)

        score = (
            0.17 * repo_count
            + 0.14 * stars
            + 0.14 * followers
            + 1.6 * account_age
            + 8.5 * has_readme
            + 7.5 * commit_frequency
            + 11.0 * has_ci_cd
            + 8.0 * license_present
            + rng.normal(scale=10)
        )

        synthetic_rows.append(
            {
                "repo_count": repo_count,
                "stars": stars,
                "followers": followers,
                "account_age": account_age,
                "has_readme": has_readme,
                "commit_frequency": commit_frequency,
                "has_ci_cd": has_ci_cd,
                "license_present": license_present,
                "score": max(0, min(100, round(score))),
            }
        )

    synthetic_df = pd.DataFrame(synthetic_rows)
    return pd.concat([data, synthetic_df], ignore_index=True)


def build_model(random_state=42):
    return DecisionTreeRegressor(
        max_depth=8,
        min_samples_leaf=3,
        random_state=random_state,
    )


def main():
    parser = argparse.ArgumentParser(description="Train a GitHub profile scoring model.")
    parser.add_argument("--data", default="github_profiles.csv", help="Path to the profile dataset CSV.")
    parser.add_argument("--target-size", type=int, default=500, help="Minimum dataset size after synthetic augmentation.")
    parser.add_argument("--output", default="github_model.pkl", help="Output model filename.")
    parser.add_argument("--random-state", type=int, default=42, help="Random seed for reproducibility.")
    args = parser.parse_args()

    data_path = os.path.join(os.path.dirname(__file__), args.data) if not os.path.isabs(args.data) else args.data
    data = load_data(data_path)
    data = synthesize_examples(data, target_size=args.target_size, random_state=args.random_state)

    X = data[FEATURE_COLUMNS]
    y = data["score"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=args.random_state
    )

    model = build_model(random_state=args.random_state)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)

    print("Training complete.")
    print(f"Dataset rows: {len(data)} (train={len(X_train)}, test={len(X_test)})")
    print(f"RMSE: {rmse:.2f}")
    print(f"R2: {r2:.3f}")

    model_path = os.path.join(os.path.dirname(__file__), args.output)
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"Saved model to {model_path}")


if __name__ == "__main__":
    main()
