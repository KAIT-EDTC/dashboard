ALTER TABLE `activity_reports` ADD `approver_id` text REFERENCES users(id) ON DELETE set null;--> statement-breakpoint
-- 承認を1段にしたので、旧方式（部署長 → 本部長 など）の途中にある報告書は下書きに戻して出し直してもらう
UPDATE `activity_reports` SET `status` = 'draft', `approval_steps` = '[]', `current_step` = 0 WHERE `status` = 'submitted';--> statement-breakpoint
UPDATE `activity_reports` SET `approval_steps` = '[]', `current_step` = 0 WHERE `approval_steps` NOT IN ('[]', '["division_head"]', '["designated"]');--> statement-breakpoint
UPDATE `activity_report_reviews` SET `step` = 'designated' WHERE `step` NOT IN ('division_head', 'designated');
