-- AlterTable
ALTER TABLE `users` ADD COLUMN `github_id` VARCHAR(40) NULL,
    MODIFY `slack_user_id` VARCHAR(25) NOT NULL;
