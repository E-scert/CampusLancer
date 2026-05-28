import argparse
import pandas as pd
import numpy as np

DEFAULT_FEATURES = {
    "commit_frequency": 1,
    "has_ci_cd": 0,
    "license_present": 0,
}

FEATURE_COLUMNS = [
    "repo_count",
    "stars",
    "followers",
    "account_age",
    "has_readme",
    "commit_frequency",
    "has_ci_cd",
    "license_present",
    "score",
]


def load_data(path):
    data = pd.read_csv(path)
    for feature, default in DEFAULT_FEATURES.items():
        if feature not in data.columns:
            data[feature] = default
    return data


def generate_examples(base, target_size=1000, seed=42):
    rng = np.random.RandomState(seed)
    feature_means = base[[
        "repo_count",
        "stars",
        "followers",
        "account_age",
        "commit_frequency",
    ]].mean()
    rows = []
    for _ in range(max(0, target_size - len(base))):
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
        rows.append({
            "repo_count": repo_count,
            "stars": stars,
            "followers": followers,
            "account_age": account_age,
            "has_readme": has_readme,
            "commit_frequency": commit_frequency,
            "has_ci_cd": has_ci_cd,
            "license_present": license_present,
            "score": max(0, min(100, round(score))),
        })
    return pd.DataFrame(rows)


def main():
    parser = argparse.ArgumentParser(description="Generate a larger GitHub profile dataset.")
    parser.add_argument("--input", default="github_profiles.csv", help="Input CSV path.")
    parser.add_argument("--output", default="github_profiles_expanded.csv", help="Output CSV path.")
    parser.add_argument("--target-size", type=int, default=1000, help="Desired total rows.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed.")
    args = parser.parse_args()
    data = load_data(args.input)
    extra = generate_examples(data, target_size=args.target_size, seed=args.seed)
    result = pd.concat([data, extra], ignore_index=True)
    result.to_csv(args.output, index=False)
    print(f"Generated {len(result)} rows and saved to {args.output}")


if __name__ == "__main__":
    main()
