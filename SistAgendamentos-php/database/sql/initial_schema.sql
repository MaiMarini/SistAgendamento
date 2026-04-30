-- =============================================================================
-- SistAgendamentos — Schema MySQL inicial (alternativa ao `php artisan migrate`)
-- =============================================================================
--
-- Use este arquivo apenas se as migrations do Laravel não puderem ser
-- executadas (ex: hospedagem sem SSH). Pode ser importado via phpMyAdmin
-- no cPanel da HostGator.
--
-- O conteúdo replica exatamente o que `php artisan migrate` gera a partir
-- das migrations em database/migrations/. Mantenha os dois em sincronia.
--
-- Charset: utf8mb4 + collation utf8mb4_unicode_ci para suporte completo a
-- acentuação, emojis e nomes em qualquer idioma.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- AUTH (users + sessions + reset tokens)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
    `id`                 CHAR(36)        NOT NULL,
    `email`              VARCHAR(255)    NOT NULL,
    `email_verified_at`  TIMESTAMP       NULL,
    `password`           VARCHAR(255)    NOT NULL,
    `user_type`          ENUM('company','professional') NOT NULL,
    `company_id`         CHAR(36)        NULL,
    `remember_token`     VARCHAR(100)    NULL,
    `created_at`         TIMESTAMP       NULL,
    `updated_at`         TIMESTAMP       NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `users_email_unique` (`email`),
    KEY `users_company_id_index` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
    `email`      VARCHAR(255) NOT NULL,
    `token`      VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP    NULL,
    PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
    `id`            VARCHAR(255)        NOT NULL,
    `user_id`       CHAR(36)            NULL,
    `ip_address`    VARCHAR(45)         NULL,
    `user_agent`    TEXT                NULL,
    `payload`       LONGTEXT            NOT NULL,
    `last_activity` INT                 NOT NULL,
    PRIMARY KEY (`id`),
    KEY `sessions_user_id_index` (`user_id`),
    KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- CACHE / JOBS / SANCTUM
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `cache` (
    `key`         VARCHAR(255) NOT NULL,
    `value`       MEDIUMTEXT   NOT NULL,
    `expiration`  INT          NOT NULL,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache_locks` (
    `key`        VARCHAR(255) NOT NULL,
    `owner`      VARCHAR(255) NOT NULL,
    `expiration` INT          NOT NULL,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `jobs` (
    `id`           BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `queue`        VARCHAR(255)     NOT NULL,
    `payload`      LONGTEXT         NOT NULL,
    `attempts`     TINYINT UNSIGNED NOT NULL,
    `reserved_at`  INT UNSIGNED     NULL,
    `available_at` INT UNSIGNED     NOT NULL,
    `created_at`   INT UNSIGNED     NOT NULL,
    PRIMARY KEY (`id`),
    KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `job_batches` (
    `id`              VARCHAR(255) NOT NULL,
    `name`            VARCHAR(255) NOT NULL,
    `total_jobs`      INT          NOT NULL,
    `pending_jobs`    INT          NOT NULL,
    `failed_jobs`     INT          NOT NULL,
    `failed_job_ids`  LONGTEXT     NOT NULL,
    `options`         MEDIUMTEXT   NULL,
    `cancelled_at`    INT          NULL,
    `created_at`      INT          NOT NULL,
    `finished_at`     INT          NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `failed_jobs` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `uuid`       VARCHAR(255)    NOT NULL,
    `connection` TEXT            NOT NULL,
    `queue`      TEXT            NOT NULL,
    `payload`    LONGTEXT        NOT NULL,
    `exception` LONGTEXT         NOT NULL,
    `failed_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tokenable_type`  VARCHAR(255)    NOT NULL,
    `tokenable_id`    CHAR(36)        NOT NULL,
    `name`            VARCHAR(255)    NOT NULL,
    `token`           VARCHAR(64)     NOT NULL,
    `abilities`       TEXT            NULL,
    `last_used_at`    TIMESTAMP       NULL,
    `expires_at`      TIMESTAMP       NULL,
    `created_at`      TIMESTAMP       NULL,
    `updated_at`      TIMESTAMP       NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
    KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
    KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- DOMAIN: licenses
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `licenses` (
    `id`         CHAR(36)    NOT NULL,
    `code`       VARCHAR(64) NOT NULL,
    `used`       TINYINT(1)  NOT NULL DEFAULT 0,
    `used_by`    CHAR(36)    NULL,
    `used_at`    TIMESTAMP   NULL,
    `created_at` TIMESTAMP   NULL,
    `updated_at` TIMESTAMP   NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `licenses_code_unique` (`code`),
    KEY `licenses_used_index` (`used`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- DOMAIN: companies
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `companies` (
    `id`                       CHAR(36)        NOT NULL,
    `name`                     VARCHAR(255)    NOT NULL,
    `cnpj`                     VARCHAR(14)     NOT NULL,
    `phone`                    VARCHAR(30)     NULL,
    `contact_email`            VARCHAR(255)    NULL,
    `cep`                      VARCHAR(8)      NULL,
    `street`                   VARCHAR(255)    NULL,
    `address_number`           VARCHAR(20)     NULL,
    `complement`               VARCHAR(255)    NULL,
    `neighborhood`             VARCHAR(255)    NULL,
    `city`                     VARCHAR(255)    NULL,
    `state`                    VARCHAR(2)      NULL,
    `reminder_hours_before`    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `active`                   TINYINT(1)      NOT NULL DEFAULT 1,
    `created_at`               TIMESTAMP       NULL,
    `updated_at`               TIMESTAMP       NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `companies_cnpj_unique` (`cnpj`),
    CONSTRAINT `companies_id_foreign` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- DOMAIN: specialties
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `specialties` (
    `id`         CHAR(36)     NOT NULL,
    `company_id` CHAR(36)     NOT NULL,
    `name`       VARCHAR(255) NOT NULL,
    `info`       TEXT         NULL,
    `created_at` TIMESTAMP    NULL,
    `updated_at` TIMESTAMP    NULL,
    PRIMARY KEY (`id`),
    KEY `specialties_company_id_index` (`company_id`),
    UNIQUE KEY `specialties_company_id_name_unique` (`company_id`,`name`),
    CONSTRAINT `specialties_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- DOMAIN: professionals
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `professionals` (
    `id`                        CHAR(36)        NOT NULL,
    `company_id`                CHAR(36)        NOT NULL,
    `name`                      VARCHAR(255)    NOT NULL,
    `email`                     VARCHAR(255)    NOT NULL,
    `cpf`                       VARCHAR(11)     NULL,
    `phone`                     VARCHAR(30)     NULL,
    `photo_url`                 VARCHAR(1024)   NULL,
    `color`                     VARCHAR(16)     NULL,
    `default_duration_minutes`  SMALLINT UNSIGNED NOT NULL DEFAULT 60,
    `active`                    TINYINT(1)      NOT NULL DEFAULT 0,
    `status`                    ENUM('pending','active','inactive','deleted') NOT NULL DEFAULT 'pending',
    `created_at`                TIMESTAMP       NULL,
    `updated_at`                TIMESTAMP       NULL,
    PRIMARY KEY (`id`),
    KEY `professionals_company_id_status_index` (`company_id`,`status`),
    UNIQUE KEY `professionals_company_id_email_unique` (`company_id`,`email`),
    UNIQUE KEY `professionals_company_id_cpf_unique` (`company_id`,`cpf`),
    CONSTRAINT `professionals_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
    CONSTRAINT `professionals_id_foreign` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `professional_specialty` (
    `professional_id` CHAR(36) NOT NULL,
    `specialty_id`    CHAR(36) NOT NULL,
    PRIMARY KEY (`professional_id`,`specialty_id`),
    KEY `professional_specialty_specialty_id_foreign` (`specialty_id`),
    CONSTRAINT `professional_specialty_professional_id_foreign` FOREIGN KEY (`professional_id`) REFERENCES `professionals` (`id`) ON DELETE CASCADE,
    CONSTRAINT `professional_specialty_specialty_id_foreign`    FOREIGN KEY (`specialty_id`)    REFERENCES `specialties`   (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- DOMAIN: company availabilities + time blocks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `company_availabilities` (
    `id`           CHAR(36)         NOT NULL,
    `company_id`   CHAR(36)         NOT NULL,
    `day_of_week`  TINYINT UNSIGNED NOT NULL,
    `start_time`   TIME             NOT NULL,
    `end_time`     TIME             NOT NULL,
    `active`       TINYINT(1)       NOT NULL DEFAULT 1,
    `created_at`   TIMESTAMP        NULL,
    `updated_at`   TIMESTAMP        NULL,
    PRIMARY KEY (`id`),
    KEY `company_availabilities_company_id_day_of_week_index` (`company_id`,`day_of_week`),
    CONSTRAINT `company_availabilities_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `company_time_blocks` (
    `id`                   CHAR(36)     NOT NULL,
    `company_id`           CHAR(36)     NOT NULL,
    `is_recurring`         TINYINT(1)   NOT NULL DEFAULT 0,
    `starts_at`            DATETIME     NULL,
    `ends_at`              DATETIME     NULL,
    `recurring_start_time` TIME         NULL,
    `recurring_end_time`   TIME         NULL,
    `reason`               VARCHAR(255) NULL,
    `created_at`           TIMESTAMP    NULL,
    `updated_at`           TIMESTAMP    NULL,
    PRIMARY KEY (`id`),
    KEY `company_time_blocks_company_id_is_recurring_index` (`company_id`,`is_recurring`),
    KEY `company_time_blocks_company_id_starts_at_index`    (`company_id`,`starts_at`),
    CONSTRAINT `company_time_blocks_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- DOMAIN: professional availabilities + time blocks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `availabilities` (
    `id`               CHAR(36)         NOT NULL,
    `professional_id`  CHAR(36)         NOT NULL,
    `day_of_week`      TINYINT UNSIGNED NOT NULL,
    `start_time`       TIME             NOT NULL,
    `end_time`         TIME             NOT NULL,
    `active`           TINYINT(1)       NOT NULL DEFAULT 1,
    `created_at`       TIMESTAMP        NULL,
    `updated_at`       TIMESTAMP        NULL,
    PRIMARY KEY (`id`),
    KEY `availabilities_professional_id_day_of_week_index` (`professional_id`,`day_of_week`),
    CONSTRAINT `availabilities_professional_id_foreign` FOREIGN KEY (`professional_id`) REFERENCES `professionals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `time_blocks` (
    `id`                   CHAR(36)     NOT NULL,
    `professional_id`      CHAR(36)     NOT NULL,
    `is_recurring`         TINYINT(1)   NOT NULL DEFAULT 0,
    `starts_at`            DATETIME     NULL,
    `ends_at`              DATETIME     NULL,
    `recurring_start_time` TIME         NULL,
    `recurring_end_time`   TIME         NULL,
    `reason`               VARCHAR(255) NULL,
    `created_at`           TIMESTAMP    NULL,
    `updated_at`           TIMESTAMP    NULL,
    PRIMARY KEY (`id`),
    KEY `time_blocks_professional_id_is_recurring_index` (`professional_id`,`is_recurring`),
    KEY `time_blocks_professional_id_starts_at_index`    (`professional_id`,`starts_at`),
    CONSTRAINT `time_blocks_professional_id_foreign` FOREIGN KEY (`professional_id`) REFERENCES `professionals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- DOMAIN: clients
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `clients` (
    `id`                            CHAR(36)     NOT NULL,
    `company_id`                    CHAR(36)     NOT NULL,
    `name`                          VARCHAR(255) NOT NULL,
    `birth_date`                    DATE         NULL,
    `is_minor`                      TINYINT(1)   NOT NULL DEFAULT 0,
    `observations`                  TEXT         NULL,
    `cpf`                           VARCHAR(11)  NULL,
    `cep`                           VARCHAR(8)   NULL,
    `street`                        VARCHAR(255) NULL,
    `neighborhood`                  VARCHAR(255) NULL,
    `city`                          VARCHAR(255) NULL,
    `state`                         VARCHAR(2)   NULL,
    `address_number`                VARCHAR(20)  NULL,
    `complement`                    VARCHAR(255) NULL,
    `phone`                         VARCHAR(30)  NULL,
    `phone_is_whatsapp`             TINYINT(1)   NOT NULL DEFAULT 0,
    `email`                         VARCHAR(255) NULL,
    `guardian_name`                 VARCHAR(255) NULL,
    `guardian_birth_date`           DATE         NULL,
    `guardian_cpf`                  VARCHAR(11)  NULL,
    `guardian_cep`                  VARCHAR(8)   NULL,
    `guardian_street`               VARCHAR(255) NULL,
    `guardian_neighborhood`         VARCHAR(255) NULL,
    `guardian_city`                 VARCHAR(255) NULL,
    `guardian_state`                VARCHAR(2)   NULL,
    `guardian_number`               VARCHAR(20)  NULL,
    `guardian_complement`           VARCHAR(255) NULL,
    `guardian_phone`                VARCHAR(30)  NULL,
    `guardian_phone_is_whatsapp`    TINYINT(1)   NOT NULL DEFAULT 0,
    `guardian_email`                VARCHAR(255) NULL,
    `notifications_enabled`         TINYINT(1)   NOT NULL DEFAULT 1,
    `notification_channel`          VARCHAR(16)  NULL,
    `is_provisional`                TINYINT(1)   NOT NULL DEFAULT 0,
    `active`                        TINYINT(1)   NOT NULL DEFAULT 1,
    `created_at`                    TIMESTAMP    NULL,
    `updated_at`                    TIMESTAMP    NULL,
    PRIMARY KEY (`id`),
    KEY `clients_company_id_active_index` (`company_id`,`active`),
    KEY `clients_company_id_phone_index`  (`company_id`,`phone`),
    KEY `clients_company_id_name_index`   (`company_id`,`name`),
    UNIQUE KEY `clients_company_id_cpf_unique` (`company_id`,`cpf`),
    CONSTRAINT `clients_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `client_observations` (
    `id`         CHAR(36)  NOT NULL,
    `client_id`  CHAR(36)  NOT NULL,
    `company_id` CHAR(36)  NOT NULL,
    `content`    TEXT      NOT NULL,
    `created_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    KEY `client_observations_client_id_created_at_index` (`client_id`,`created_at`),
    KEY `client_observations_company_id_foreign` (`company_id`),
    CONSTRAINT `client_observations_client_id_foreign`  FOREIGN KEY (`client_id`)  REFERENCES `clients`   (`id`) ON DELETE CASCADE,
    CONSTRAINT `client_observations_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- DOMAIN: appointments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `appointments` (
    `id`               CHAR(36)     NOT NULL,
    `company_id`       CHAR(36)     NOT NULL,
    `professional_id`  CHAR(36)     NOT NULL,
    `client_id`        CHAR(36)     NULL,
    `service_id`       CHAR(36)     NULL,
    `client_name`      VARCHAR(255) NOT NULL,
    `client_email`     VARCHAR(255) NULL,
    `client_phone`     VARCHAR(30)  NULL,
    `client_cpf`       VARCHAR(11)  NULL,
    `starts_at`        DATETIME     NOT NULL,
    `ends_at`          DATETIME     NOT NULL,
    `status`           ENUM('scheduled','confirmed','cancelled','completed','no_show') NOT NULL DEFAULT 'scheduled',
    `notes`            TEXT         NULL,
    `reminder_sent`    TINYINT(1)   NOT NULL DEFAULT 0,
    `created_at`       TIMESTAMP    NULL,
    `updated_at`       TIMESTAMP    NULL,
    PRIMARY KEY (`id`),
    KEY `appointments_company_id_starts_at_index`      (`company_id`,`starts_at`),
    KEY `appointments_professional_id_starts_at_index` (`professional_id`,`starts_at`),
    KEY `appointments_client_id_starts_at_index`       (`client_id`,`starts_at`),
    KEY `appointments_reminder_lookup_idx`             (`company_id`,`status`,`reminder_sent`,`starts_at`),
    CONSTRAINT `appointments_company_id_foreign`      FOREIGN KEY (`company_id`)      REFERENCES `companies`     (`id`) ON DELETE CASCADE,
    CONSTRAINT `appointments_professional_id_foreign` FOREIGN KEY (`professional_id`) REFERENCES `professionals` (`id`) ON DELETE CASCADE,
    CONSTRAINT `appointments_client_id_foreign`       FOREIGN KEY (`client_id`)       REFERENCES `clients`       (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `client_documents` (
    `id`               CHAR(36)         NOT NULL,
    `client_id`        CHAR(36)         NOT NULL,
    `company_id`       CHAR(36)         NOT NULL,
    `observation_id`   CHAR(36)         NULL,
    `appointment_id`   CHAR(36)         NULL,
    `file_name`        VARCHAR(255)     NOT NULL,
    `file_type`        VARCHAR(100)     NOT NULL,
    `storage_path`     VARCHAR(1024)    NOT NULL,
    `file_size_bytes`  BIGINT UNSIGNED  NULL,
    `created_at`       TIMESTAMP        NULL,
    `updated_at`       TIMESTAMP        NULL,
    PRIMARY KEY (`id`),
    KEY `client_documents_client_id_created_at_index` (`client_id`,`created_at`),
    KEY `client_documents_observation_id_index`       (`observation_id`),
    KEY `client_documents_appointment_id_index`       (`appointment_id`),
    KEY `client_documents_company_id_foreign`         (`company_id`),
    CONSTRAINT `client_documents_client_id_foreign`      FOREIGN KEY (`client_id`)      REFERENCES `clients`              (`id`) ON DELETE CASCADE,
    CONSTRAINT `client_documents_company_id_foreign`     FOREIGN KEY (`company_id`)     REFERENCES `companies`            (`id`) ON DELETE CASCADE,
    CONSTRAINT `client_documents_observation_id_foreign` FOREIGN KEY (`observation_id`) REFERENCES `client_observations`  (`id`) ON DELETE SET NULL,
    CONSTRAINT `client_documents_appointment_id_foreign` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`         (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- Fim do schema. Total: 17 tabelas.
-- =============================================================================
