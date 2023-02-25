-- CreateTable
CREATE TABLE `options` (
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `slack_channel_id` VARCHAR(20) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `value` JSON NULL,

    PRIMARY KEY (`slack_channel_id`, `name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
