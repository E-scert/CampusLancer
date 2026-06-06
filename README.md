# CampusLancer

> Global freelance platform connecting students and industry with automated skill validation, flexible engagement, and career-ready portfolios.

CampusLancer bridges the gap between South African university students and businesses by letting students apply for real-world tasks, build verified portfolios, and have their skills automatically scored through GitHub analysis — while giving businesses access to vetted student talent.

🌐 **Live app:** [campuslancer.onrender.com](https://campuslancer.onrender.com)

---

## Table of contents

- [Features](#features)
- [Project structure](#project-structure)
- [Tech stack](#tech-stack)
- [Database schema](#database-schema)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Authors](#authors)

---

## Features

- **Two user types** — students and businesses each have their own registration, profile, and dashboard
- **Task board** — businesses post tasks (remote, on-site, or hybrid) with required skills and minimum skill scores
- **AI skill scoring** — GitHub profiles are scanned and analysed to generate an automated skill score for each student using the local Python ML pipeline in `/ai`
- **Application system** — students apply with a cover note; businesses accept or reject; one application per student per task enforced at the database level
- **Submission & feedback** — accepted students submit work via URL; businesses leave feedback; full submission history tracked
- **Report export** — students and businesses can download filtered summary reports as PDF files
- **Email notifications** — powered by Nodemailer for application status updates
- **Session-based authentication** — secure login and session management using bcrypt and express-session

---

## Project structure

```
CampusLancer/
├── ai/                          # GitHub scanner and AI skill analysis (Python)
├── config/                      # Database connection config
├── controllers/                 # Route handler logic (MVC pattern)
├── middleware/                  # Auth middleware (session checks)
├── public/                      # Static assets — CSS, client-side JS, images
├── routes/                      # Express route definitions
├── uploads/                     # User-uploaded files (profile pics, logos)
├── views/                       # EJS templates (server-side rendered HTML)
├── campus_lancer_postgres.sql   # Full database schema + sample data
├── ERD-CAMPUSLANCER(UPDATED).png
├── server.js                    # App entry point
├── testScanner.js               # GitHub scanner test script
└── package.json
```

---

## Tech stack

| Layer          | Technology                 | Purpose                                                                |
| -------------- | -------------------------- | ---------------------------------------------------------------------- |
| Backend        | Node.js + Express          | Server, routing, MVC controllers                                       |
| Templating     | EJS                        | Server-side rendered HTML views                                        |
| Database       | PostgreSQL                 | All user, task, application, and submission data                       |
| AI / Analysis  | Python                     | GitHub repo scanner for automated skill scoring and career suggestions |
| Authentication | bcryptjs + express-session | Secure login and session management                                    |
| File uploads   | Multer                     | Profile pictures and company logos                                     |
| PDF export     | html-pdf-node              | Downloadable PDF reports for students and businesses                   |
| Email          | Nodemailer                 | Application status notifications                                       |
| Hosting        | Render                     | Full-stack deployment                                                  |

---

## AI / ML implementation details

CampusLancer uses a local Python-based AI pipeline to compute student skill scores from GitHub profiles and repository features. This is the primary AI flow in the app, and it is intentionally designed to work without relying on an external LLM API.

- `/ai/predict.py` — loads extracted GitHub features and returns a score plus improvement suggestions.
- `/ai/train_model.py` — trains the internal model from labelled or synthetic data.
- `/ai/generate_synthetic_dataset.py` — creates synthetic training data for model development.
- `config/githubScanner.js` — collects GitHub profile/repo metadata, extracts features, and invokes the Python prediction pipeline.

This local AI path is the stable method for generating student skill scores and guidance when external API integration is unavailable.

---

## Database schema

CampusLancer uses a PostgreSQL database with 6 tables. The full script including sample data is in [`campus_lancer_postgres.sql`](campus_lancer_postgres.sql).

### Entity relationship diagram

![ERD](<ERD-CAMPUSLANCER(UPDATED).png>)

---

### `users`

| Column        | Type         | Description                        |
| ------------- | ------------ | ---------------------------------- |
| user_id       | SERIAL PK    | Auto-incremented unique identifier |
| email         | VARCHAR(255) | Unique login email                 |
| password_hash | VARCHAR(255) | bcrypt-hashed password             |
| user_type     | VARCHAR(20)  | `student` or `business`            |
| created_at    | TIMESTAMP    | Account creation timestamp         |

---

### `student_profiles`

| Column          | Type         | Description                                 |
| --------------- | ------------ | ------------------------------------------- |
| profile_id      | SERIAL PK    | Auto-incremented unique identifier          |
| user_id         | INT FK       | References `users.user_id`                  |
| first_name      | VARCHAR(100) | Student's first name                        |
| last_name       | VARCHAR(100) | Student's last name                         |
| institution     | VARCHAR(255) | University or college name                  |
| course          | VARCHAR(255) | Degree or diploma being studied             |
| github_username | VARCHAR(100) | GitHub handle for skill scanning            |
| ai_skill_score  | INT          | AI-generated score based on GitHub analysis |
| bio             | TEXT         | Short student bio                           |
| profile_pic_url | VARCHAR(500) | Path to uploaded profile picture            |
| top_languages   | TEXT         | Top coding languages detected from GitHub   |
| ai_suggestions  | TEXT         | AI-generated career suggestions             |
| next_steps      | TEXT         | AI-recommended next learning steps          |

---

### `business_profiles`

| Column        | Type         | Description                        |
| ------------- | ------------ | ---------------------------------- |
| profile_id    | SERIAL PK    | Auto-incremented unique identifier |
| user_id       | INT FK       | References `users.user_id`         |
| company_name  | VARCHAR(255) | Company name                       |
| company_email | VARCHAR(255) | Business contact email             |
| industry      | VARCHAR(255) | Industry sector                    |
| website_url   | VARCHAR(500) | Company website                    |
| description   | TEXT         | What the company does              |
| logo_url      | VARCHAR(500) | Path to uploaded company logo      |

---

### `tasks`

| Column          | Type         | Description                                 |
| --------------- | ------------ | ------------------------------------------- |
| task_id         | SERIAL PK    | Auto-incremented unique identifier          |
| business_id     | INT FK       | References `business_profiles.profile_id`   |
| title           | VARCHAR(255) | Task title                                  |
| description     | TEXT         | Full task description                       |
| required_skill  | VARCHAR(255) | Skill the student must have e.g. React, SQL |
| min_skill_score | INT          | Minimum AI skill score required to apply    |
| task_type       | VARCHAR(20)  | `remote`, `on-site`, or `hybrid`            |
| status          | VARCHAR(20)  | `open`, `in_progress`, or `closed`          |
| posted_at       | TIMESTAMP    | When the task was posted                    |
| deadline        | DATE         | Task submission deadline                    |

---

### `applications`

| Column         | Type        | Description                              |
| -------------- | ----------- | ---------------------------------------- |
| application_id | SERIAL PK   | Auto-incremented unique identifier       |
| task_id        | INT FK      | References `tasks.task_id`               |
| student_id     | INT FK      | References `student_profiles.profile_id` |
| cover_note     | TEXT        | Student's application message            |
| status         | VARCHAR(20) | `pending`, `accepted`, or `rejected`     |
| applied_at     | TIMESTAMP   | When the application was submitted       |

> One application per student per task is enforced via a `UNIQUE(task_id, student_id)` constraint.

---

### `submissions`

| Column         | Type         | Description                                                                        |
| -------------- | ------------ | ---------------------------------------------------------------------------------- |
| submission_id  | SERIAL PK    | Auto-incremented unique identifier                                                 |
| application_id | INT FK       | References `applications.application_id` (unique — one submission per application) |
| submission_url | VARCHAR(500) | Link to submitted work e.g. GitHub repo                                            |
| notes          | TEXT         | Student notes on the submission                                                    |
| feedback       | TEXT         | Business feedback on the submission                                                |
| submitted_at   | TIMESTAMP    | When the work was submitted                                                        |

---

## Getting started

### Prerequisites

- Node.js v18+
- PostgreSQL 13+
- Python 3 (for the AI GitHub scanner in `/ai`)
- npm

### 1. Clone the repository

```bash
git clone https://github.com/E-scert/CampusLancer.git
cd CampusLancer
```

### 2. Install Node dependencies

```bash
npm install
```

### 3. Set up the database

```bash
# Create the database in psql
CREATE DATABASE campus_lancer_db;

# Then run the schema and sample data script
psql -U your_username -d campus_lancer_db -f campus_lancer_postgres.sql
```

### 5. Run the app

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

The app runs at `http://localhost:3000`.

---

## Authors

- **E-scert** — [github.com/E-scert](https://github.com/E-scert)
