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
    max_applicants   INT           DEFAULT NULL,
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
    status_reason   TEXT          DEFAULT NULL,
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
('hello@nexatech.co.za',                 '$2a$10$l/iKtozA8ZKxP6moCiIdouuq97UjquYFc.MVUPfCY5miVSKAH83vm',    'business'),
('letsbuild@bytebridge.co.za',           '$2a$10$l/iKtozA8ZKxP6moCiIdouuq97UjquYFc.MVUPfCY5miVSKAH83vm',    'business'),
('connect@cloudnest.co.za',              '$2a$10$l/iKtozA8ZKxP6moCiIdouuq97UjquYFc.MVUPfCY5miVSKAH83vm',    'business'),
('smartsolutions@intelli.co.za',         '$2a$10$l/iKtozA8ZKxP6moCiIdouuq97UjquYFc.MVUPfCY5miVSKAH83vm',    'business'),
('create@novapixel.co.za',               '$2a$10$l/iKtozA8ZKxP6moCiIdouuq97UjquYFc.MVUPfCY5miVSKAH83vm',    'business');

INSERT INTO business_profiles (user_id, company_name, company_email, industry, website_url, description) VALUES
(6, 'NexaTech Solutions', 'hello@nexatech.co.za', 'Software Development', 'https://nexatech.co.za', 'We build scalable enterprise software and SaaS platforms for modern businesses.'),
(7, 'ByteBridge Technologies', 'letsbuild@bytebridge.co.za', 'Data Analytics & Databases', 'https://bytebridge.co.za', 'We help businesses transform raw data into valuable insights and analytics.'),
(8, 'CloudNest Innovations', 'connect@cloudnest.co.za', 'Cloud Computing & DevOps', 'https://cloudnest.co.za', 'Delivering cloud infrastructure, automation, and DevOps solutions for scalable systems.'),
(9, 'IntelliWave Systems', 'smartsolutions@intelli.co.za', 'AI & Smart Systems', 'https://intelliwave.co.za', 'Building intelligent AI-driven systems and automation solutions for enterprises.'),
(10, 'NovaPixel Technologies', 'create@novapixel.co.za', 'UI/UX Design', 'https://novapixel.co.za', 'We focus on beginner UI/UX and frontend design projects for students.');

INSERT INTO tasks (business_id, title, description, required_skill, min_skill_score, task_type, status, max_applicants, deadline) VALUES
(6, 'Build Authentication Microservice', 'Create a secure JWT-based authentication microservice using Node.js and Express.', 'Node.js', 75, 'remote', 'open', 4, '2026-06-15'),
(6, 'Develop SaaS Billing Module', 'Implement a billing and subscription management module for SaaS customers.', 'Backend Development', 70, 'hybrid', 'open', 3, '2026-06-20'),
(6, 'Optimize REST API Performance', 'Improve API response times and optimize backend queries for better scalability.', 'API Optimization', 80, 'remote', 'open', 2, '2026-06-25'),
(6, 'Create Admin Dashboard Backend', 'Build backend services and analytics endpoints for an admin dashboard.', 'Express.js', 65, 'remote', 'open', 3, '2026-06-18'),
(6, 'Database Schema Refactor', 'Normalize and optimize the company database schema for performance and scalability.', 'SQL', 60, 'hybrid', 'open', 4, '2026-06-22'),
(7, 'Build ETL Data Pipeline', 'Design and implement an ETL pipeline to process data from multiple CSV sources into PostgreSQL.', 'Data Engineering', 75, 'hybrid', 'open', 3, '2026-06-30'),
(7, 'Create Sales Analytics Dashboard', 'Build a dashboard to visualize monthly sales and customer growth trends.', 'Power BI', 65, 'remote', 'open', 3, '2026-06-18'),
(7, 'Develop Data Cleaning Automation Scripts', 'Write Python scripts to automate data cleaning and preprocessing workflows.', 'Python', 60, 'remote', 'open', 3, '2026-06-12'),
(7, 'Optimize PostgreSQL Database Queries', 'Improve query efficiency and indexing strategies for large-scale databases.', 'SQL Optimization', 80, 'on-site', 'open', 2, '2026-06-28'),
(7, 'Build Customer Segmentation Model', 'Create a machine learning clustering model for customer segmentation analysis.', 'Machine Learning', 85, 'remote', 'open', 2, '2026-07-05'),
(8, 'Deploy CI/CD Pipeline', 'Configure GitHub Actions for automated testing and deployments.', 'DevOps', 70, 'remote', 'open', 3, '2026-06-10'),
(8, 'Configure AWS Infrastructure', 'Set up EC2, S3, and load balancing services for production deployment.', 'AWS', 75, 'hybrid', 'open', 3, '2026-06-15'),
(8, 'Dockerize Existing Applications', 'Convert legacy applications into Docker containers for deployment consistency.', 'Docker', 65, 'remote', 'open', 4, '2026-06-08'),
(8, 'Set Up Kubernetes Cluster', 'Deploy and manage a Kubernetes cluster for high-availability applications.', 'Kubernetes', 85, 'hybrid', 'open', 2, '2026-06-25'),
(8, 'Implement Monitoring & Logging System', 'Configure centralized monitoring and logging using Prometheus and Grafana.', 'System Monitoring', 70, 'on-site', 'open', 3, '2026-06-20'),
(9, 'Develop AI Chatbot', 'Build a customer-support chatbot using NLP and machine learning models.', 'Machine Learning', 85, 'remote', 'open', 2, '2026-06-30'),
(9, 'Build Predictive Analytics Model', 'Develop forecasting models for business performance prediction.', 'Data Science', 80, 'hybrid', 'open', 3, '2026-07-10'),
(9, 'Create Recommendation System', 'Build a recommendation engine for personalized product suggestions.', 'Python', 75, 'remote', 'open', 3, '2026-06-28'),
(9, 'Integrate Voice Recognition API', 'Integrate speech-to-text functionality into an enterprise platform.', 'AI Integration', 70, 'hybrid', 'open', 2, '2026-06-22'),
(9, 'Design Workflow Automation Engine', 'Develop a rules-based workflow automation system for internal processes.', 'System Design', 80, 'remote', 'open', 3, '2026-07-01'),
(10, 'Design Restaurant Landing Page', 'Create a visually appealing restaurant landing page using HTML and CSS.', 'HTML & CSS', 15, 'remote', 'open', 4, '2026-06-12'),
(10, 'Build Animated Button Effects', 'Create interactive hover animations for website buttons using CSS.', 'CSS', 10, 'remote', 'open', 4, '2026-06-08'),
(10, 'Create Music Player UI', 'Design a simple music player interface with responsive layout.', 'CSS & JavaScript', 20, 'hybrid', 'open', 4, '2026-06-15'),
(10, 'Build Simple React Gallery', 'Design an image gallery component using React JSX.', 'JSX & React', 25, 'remote', 'open', 4, '2026-06-18'),
(10, 'Design Signup Form UI', 'Build a clean signup form with validation styling and responsive design.', 'HTML, CSS & JS', 18, 'remote', 'open', 4, '2026-06-10');

-- No preloaded applications or submissions for the new business test data.

-- ── Add language and suggestions columns (run if upgrading existing DB) ──
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS top_languages TEXT DEFAULT NULL;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS ai_suggestions TEXT DEFAULT NULL;

-- ── Add AI analysis columns to student_profiles ─────────────
-- Run these if you already created the database:
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS top_languages TEXT DEFAULT '[]';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS suggestions   TEXT DEFAULT '[]';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS next_steps    TEXT DEFAULT '[]';
