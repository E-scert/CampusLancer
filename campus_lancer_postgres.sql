-- ============================================================
--  CampusLancer Database Script — PostgreSQL
-- ============================================================

-- Create the database (run this line separately in psql if needed):
-- CREATE DATABASE campus_lancer_db;

-- Then connect to it:
-- \c campus_lancer_db

-- ============================================================
-- TABLE 1: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id       SERIAL          NOT NULL,
    email         VARCHAR(255)    NOT NULL UNIQUE,
    password_hash VARCHAR(255)    NOT NULL,
    user_type     VARCHAR(20)     NOT NULL CHECK (user_type IN ('student', 'business')),
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id)
);

-- ============================================================
-- TABLE 2: student_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS student_profiles (
    profile_id      SERIAL        NOT NULL,
    user_id         INT           NOT NULL UNIQUE,
    first_name      VARCHAR(100)  NOT NULL,
    last_name       VARCHAR(100)  NOT NULL,
    institution     VARCHAR(255)  NOT NULL,
    course          VARCHAR(255)  NOT NULL,
    github_username VARCHAR(100)  DEFAULT NULL,
    ai_skill_score  INT           DEFAULT 0,
    bio             TEXT          DEFAULT NULL,
    profile_pic_url VARCHAR(500)  DEFAULT NULL,
    PRIMARY KEY (profile_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 3: business_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS business_profiles (
    profile_id      SERIAL        NOT NULL,
    user_id         INT           NOT NULL UNIQUE,
    company_name    VARCHAR(255)  NOT NULL,
    company_email   VARCHAR(255)  NOT NULL,
    industry        VARCHAR(255)  NOT NULL,
    website_url     VARCHAR(500)  DEFAULT NULL,
    description     TEXT          DEFAULT NULL,
    logo_url        VARCHAR(500)  DEFAULT NULL,
    PRIMARY KEY (profile_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 4: tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    task_id          SERIAL        NOT NULL,
    business_id      INT           NOT NULL,
    title            VARCHAR(255)  NOT NULL,
    description      TEXT          NOT NULL,
    required_skill   VARCHAR(255)  NOT NULL,
    min_skill_score  INT           DEFAULT 0,
    task_type        VARCHAR(20)   NOT NULL DEFAULT 'remote' CHECK (task_type IN ('remote', 'on-site', 'hybrid')),
    status           VARCHAR(20)   NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
    posted_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deadline         DATE          DEFAULT NULL,
    PRIMARY KEY (task_id),
    FOREIGN KEY (business_id) REFERENCES business_profiles(profile_id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 5: applications
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
    application_id  SERIAL        NOT NULL,
    task_id         INT           NOT NULL,
    student_id      INT           NOT NULL,
    cover_note      TEXT          DEFAULT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    applied_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (application_id),
    UNIQUE (task_id, student_id),
    FOREIGN KEY (task_id)    REFERENCES tasks(task_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_profiles(profile_id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 6: submissions
-- ============================================================
CREATE TABLE IF NOT EXISTS submissions (
    submission_id    SERIAL        NOT NULL,
    application_id   INT           NOT NULL UNIQUE,
    submission_url   VARCHAR(500)  NOT NULL,
    notes            TEXT          DEFAULT NULL,
    feedback         TEXT          DEFAULT NULL,
    submitted_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (submission_id),
    FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE
);


-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT INTO users (email, password_hash, user_type) VALUES
('thabo.mokoena@students.wits.ac.za',    'hashed_pw_1', 'student'),
('lerato.dlamini@students.uj.ac.za',     'hashed_pw_2', 'student'),
('sipho.nkosi@students.tut.ac.za',       'hashed_pw_3', 'student'),
('amahle.zulu@students.uct.ac.za',       'hashed_pw_4', 'student'),
('kyle.venter@students.cput.ac.za',      'hashed_pw_5', 'student'),
('careers@innovatetech.co.za',           'hashed_pw_6', 'business'),
('hr@pixelstudio.co.za',                 'hashed_pw_7', 'business'),
('talent@databridge.co.za',              'hashed_pw_8', 'business');

INSERT INTO student_profiles (user_id, first_name, last_name, institution, course, github_username, ai_skill_score, bio) VALUES
(1, 'Thabo',  'Mokoena', 'University of the Witwatersrand', 'BSc Computer Science',    'thabodev',     82, 'Passionate about backend development and APIs.'),
(2, 'Lerato', 'Dlamini', 'University of Johannesburg',      'BSc Information Systems', 'lerato_codes', 67, 'Frontend enthusiast who loves clean UI design.'),
(3, 'Sipho',  'Nkosi',   'Tshwane University of Technology','Diploma IT',              'sipho_nkosi',  55, 'Interested in databases and data engineering.'),
(4, 'Amahle', 'Zulu',    'University of Cape Town',         'BSc Computer Science',    'amahle_z',     90, 'Full-stack developer with a focus on React and Node.js.'),
(5, 'Kyle',   'Venter',  'Cape Peninsula University of Tech','BEng Computer Systems',  'kyleventer',   74, 'Hardware and embedded systems enthusiast.');

INSERT INTO business_profiles (user_id, company_name, company_email, industry, website_url, description) VALUES
(6, 'InnovateTech', 'careers@innovatetech.co.za', 'Software Development', 'https://innovatetech.co.za', 'We build enterprise software solutions for African markets.'),
(7, 'Pixel Studio',  'hr@pixelstudio.co.za',       'Design & Creative',    'https://pixelstudio.co.za',  'Award-winning digital design studio specialising in brand identity.'),
(8, 'DataBridge',    'talent@databridge.co.za',    'Data Analytics',       'https://databridge.co.za',   'Data consultancy helping businesses make smarter decisions.');

INSERT INTO tasks (business_id, title, description, required_skill, min_skill_score, task_type, status, deadline) VALUES
(1, 'Build a REST API for mobile app',   'Create a Node.js REST API with authentication and CRUD operations for our new mobile app.',       'Node.js',      70, 'remote',  'open',        '2025-08-01'),
(1, 'Fix bugs in React dashboard',       'Identify and resolve UI bugs in our internal analytics dashboard built with React.',               'React',        60, 'remote',  'open',        '2025-07-15'),
(2, 'Design a brand identity package',   'Create a logo, colour palette, and typography guide for a new fintech startup.',                  'UI/UX Design', 50, 'on-site', 'open',        '2025-07-30'),
(3, 'Build a sales data pipeline',       'Design and implement an ETL pipeline that pulls sales data from multiple CSV sources into PostgreSQL.', 'SQL',     55, 'hybrid',  'open',        '2025-08-15'),
(3, 'Data visualisation dashboard',      'Build an interactive dashboard using Python and Matplotlib to visualise monthly revenue trends.',  'Python',       65, 'remote',  'in_progress', '2025-07-20');

INSERT INTO applications (task_id, student_id, cover_note, status) VALUES
(1, 4, 'I have built multiple REST APIs with Node.js and Express. I am confident I can deliver this.',     'accepted'),
(1, 1, 'I have strong Node.js experience and have worked on similar projects at varsity.',                 'pending'),
(2, 2, 'React is my strongest skill. I have fixed complex state management bugs in several projects.',     'pending'),
(3, 2, 'I have a portfolio of brand identities I created for student-run businesses.',                    'accepted'),
(4, 3, 'I have experience with PostgreSQL and have built ETL processes as part of my diploma project.',    'pending'),
(5, 3, 'Python and data visualisation are my focus area. I use Matplotlib and Seaborn regularly.',        'accepted'),
(5, 1, 'I have done data visualisation modules and am comfortable with Python libraries.',                 'rejected');

INSERT INTO submissions (application_id, submission_url, notes, feedback) VALUES
(1, 'https://github.com/amahle_z/innovatetech-api',      'Completed all endpoints. Auth uses JWT.',        'Excellent work, clean code and well documented.'),
(4, 'https://github.com/lerato_codes/pixelstudio-brand', 'Brand pack includes SVG and PNG exports.',       'Very creative. Minor changes requested on colour palette.'),
(6, 'https://github.com/sipho_nkosi/databridge-dash',    'Used Matplotlib and Seaborn for all charts.',    'Good work. Add export to PDF next.');

-- ── Add language and suggestions columns (run if upgrading existing DB) ──
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS top_languages TEXT DEFAULT NULL;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS ai_suggestions TEXT DEFAULT NULL;

-- ── Add AI analysis columns to student_profiles ─────────────
-- Run these if you already created the database:
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS top_languages TEXT DEFAULT '[]';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS suggestions   TEXT DEFAULT '[]';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS next_steps    TEXT DEFAULT '[]';
