-- CreateTable
CREATE TABLE `code_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `status` VARCHAR(10) NOT NULL,
    `pull_request_link` VARCHAR(128) NOT NULL,
    `slack_permalink` VARCHAR(128) NULL,
    `slack_thread_ts` VARCHAR(30) NULL,
    `slack_msg_id` VARCHAR(40) NULL,
    `slack_channel_id` VARCHAR(20) NULL,
    `jira_ticket` VARCHAR(128) NULL,
    `note` TINYTEXT NULL,
    `user_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `code_review_relations` (
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `status` VARCHAR(10) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `code_review_id` INTEGER NOT NULL,

    PRIMARY KEY (`user_id`, `code_review_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `display_name` VARCHAR(40) NOT NULL,
    `slack_user_id` VARCHAR(20) NULL,
    `email` VARCHAR(128) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `code_reviews` ADD CONSTRAINT `code_reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `code_review_relations` ADD CONSTRAINT `code_review_relations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `code_review_relations` ADD CONSTRAINT `code_review_relations_code_review_id_fkey` FOREIGN KEY (`code_review_id`) REFERENCES `code_reviews`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
