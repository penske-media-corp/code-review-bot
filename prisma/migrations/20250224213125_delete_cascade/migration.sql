-- DropForeignKey
ALTER TABLE `code_review_relations` DROP FOREIGN KEY `code_review_relations_code_review_id_fkey`;

-- AddForeignKey
ALTER TABLE `code_review_relations` ADD CONSTRAINT `code_review_relations_code_review_id_fkey` FOREIGN KEY (`code_review_id`) REFERENCES `code_reviews`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
