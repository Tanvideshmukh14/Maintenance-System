-- Smart Maintenance Request & Escalation System
-- ---------------------------------------------------------------------
-- REFERENCE ONLY. This file is not used by the application and is not
-- executed anywhere. The real, authoritative schema is defined by the
-- SQLAlchemy models in app/models.py / app/enums.py and versioned by
-- Alembic migrations in alembic/versions/. To stand up a database, run:
--
--   alembic upgrade head
--
-- This dump exists purely so a reader can see the resulting MySQL DDL
-- without installing Alembic or running the app. It was generated with
-- `mysqldump --no-data` against a database created by
-- `alembic upgrade head` from this same commit, so it is exact as of
-- migration 38d634b582a0 -- but if it and the migrations ever disagree,
-- trust the migrations, not this file.
-- ---------------------------------------------------------------------

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hashed_password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('employee','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'employee',
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `maintenance_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('IT','Facilities','Infrastructure','Other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Other',
  `priority` enum('Low','Medium','High') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Medium',
  `status` enum('Pending','In Progress','Resolved','Escalated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `assigned_to` int DEFAULT NULL,
  `escalation_level` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `employee_id` (`employee_id`),
  KEY `ix_requests_created_at` (`created_at`),
  KEY `ix_requests_status` (`status`),
  CONSTRAINT `maintenance_requests_ibfk_1` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `maintenance_requests_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `escalation_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `escalated_from` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `escalated_to` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `escalated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_escalation_logs_request_id` (`request_id`),
  CONSTRAINT `escalation_logs_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `maintenance_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- To create a development admin/employee dataset after migrating:
--   python seed_admin.py
