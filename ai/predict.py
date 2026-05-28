import argparse
import json
import os
import pickle
import numpy as np

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

THRESHOLDS = {
    "repo_count": 8,
    "stars": 25,
    "followers": 12,
    "account_age": 3,
    "has_readme": 1,
    "commit_frequency": 4,
    "has_ci_cd": 1,
    "license_present": 1,
}

SUGGESTION_TEMPLATES = [
    {
        "metric": "repo_count",
        "category": "repo_growth",
        "text": "Increase your repo count to showcase consistent project growth and skill breadth.",
    },
    {
        "metric": "stars",
        "category": "community",
        "text": "More stars help your profile stand out; focus on shareable, useful projects.",
    },
    {
        "metric": "followers",
        "category": "community",
        "text": "Engage with other developers and open source communities to grow your follower base.",
    },
    {
        "metric": "account_age",
        "category": "trust",
        "text": "Older accounts with steady contributions signal reliability; keep building consistently.",
    },
    {
        "metric": "has_readme",
        "category": "quality",
        "text": "Add clear README files and documentation to make your projects easier to understand.",
    },
    {
        "metric": "commit_frequency",
        "category": "quality",
        "text": "Commit regularly so your profile shows active progress, not a single burst of work.",
    },
    {
        "metric": "has_ci_cd",
        "category": "advanced",
        "text": "Add CI/CD pipelines to demonstrate professional-quality workflows and automation.",
    },
    {
        "metric": "license_present",
        "category": "advanced",
        "text": "Include a license to make your work reusable and show project readiness.",
    },
]


def load_model():
    model_path = os.path.join(os.path.dirname(__file__), "github_model.pkl")
    with open(model_path, 'rb') as f:
        return pickle.load(f)


def parse_args():
    parser = argparse.ArgumentParser(description="Predict a GitHub profile score.")
    parser.add_argument("repo_count", type=int)
    parser.add_argument("stars", type=int)
    parser.add_argument("followers", type=int)
    parser.add_argument("account_age", type=int)
    parser.add_argument("has_readme", type=int, choices=[0, 1])
    parser.add_argument("commit_frequency", type=int, nargs="?", default=1)
    parser.add_argument("has_ci_cd", type=int, nargs="?", default=0, choices=[0, 1])
    parser.add_argument("license_present", type=int, nargs="?", default=0, choices=[0, 1])
    return parser.parse_args()


def build_input_vector(args):
    return np.array([
        [
            args.repo_count,
            args.stars,
            args.followers,
            args.account_age,
            args.has_readme,
            args.commit_frequency,
            args.has_ci_cd,
            args.license_present,
        ]
    ])


def severity(value, threshold, higher_is_better=True):
    if higher_is_better:
        gap = max(0, threshold - value)
        return gap / max(threshold, 1)
    return max(0, value - threshold) / max(threshold, 1)


def build_suggestions(args):
    metrics = {
        "repo_count": args.repo_count,
        "stars": args.stars,
        "followers": args.followers,
        "account_age": args.account_age,
        "has_readme": args.has_readme,
        "commit_frequency": args.commit_frequency,
        "has_ci_cd": args.has_ci_cd,
        "license_present": args.license_present,
    }

    candidates = []
    for template in SUGGESTION_TEMPLATES:
        metric = template["metric"]
        score = severity(metrics[metric], THRESHOLDS[metric], higher_is_better=True)
        if score > 0:
            candidates.append(
                {
                    "category": template["category"],
                    "text": template["text"],
                    "weight": round(score, 3),
                }
            )

    candidates.sort(key=lambda item: item["weight"], reverse=True)

    selected = []
    categories = set()
    for candidate in candidates:
        if len(selected) >= 5:
            break
        if candidate["category"] not in categories or len(selected) < 3:
            selected.append(candidate)
            categories.add(candidate["category"])

    if not selected:
        selected.append(
            {
                "category": "balanced",
                "text": "Your profile looks healthy — continue improving by adding meaningful projects and checks.",
                "weight": 0,
            }
        )

    return [item["text"] for item in selected]


def main():
    args = parse_args()
    model = load_model()
    X = build_input_vector(args)

    raw_score = model.predict(X)[0]
    normalized_score = max(0, min(100, round(raw_score)))
    suggestions = build_suggestions(args)

    result = {
        "score": normalized_score,
        "raw_score": float(raw_score),
        "features": {feature: getattr(args, feature) for feature in FEATURE_COLUMNS},
        "suggestions": suggestions,
    }
    print(json.dumps(result))


if __name__ == "__main__":
    main()
