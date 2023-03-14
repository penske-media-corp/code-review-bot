-- CreateTable
CREATE TABLE `archive` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pull_request_link` VARCHAR(128) NOT NULL,
    `jira_ticket` VARCHAR(128) NULL,
    `note` TINYTEXT NULL,
    `data` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
