/*
  Warnings:

  - Made the column `slack_user_id` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `users` MODIFY `slack_user_id` VARCHAR(20) NOT NULL;
