CREATE TABLE `activity_report_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`field` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`quote` text NOT NULL,
	`body` text NOT NULL,
	`suggestion` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `activity_report_reviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_report_comments_review_idx` ON `activity_report_comments` (`review_id`);--> statement-breakpoint
CREATE TABLE `activity_report_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`reviewer_id` text,
	`step` text NOT NULL,
	`decision` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `activity_reports`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activity_report_reviews_report_idx` ON `activity_report_reviews` (`report_id`);--> statement-breakpoint
CREATE TABLE `activity_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`author_id` text NOT NULL,
	`kind` text DEFAULT 'activity' NOT NULL,
	`division` text,
	`content` text DEFAULT '' NOT NULL,
	`reflection` text DEFAULT '' NOT NULL,
	`rating` integer,
	`notes` text DEFAULT '' NOT NULL,
	`hosting` text,
	`analyses` text DEFAULT '[]' NOT NULL,
	`overview` text DEFAULT '' NOT NULL,
	`impressions` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`submitted_at` text,
	`approval_steps` text DEFAULT '[]' NOT NULL,
	`approver_id` text,
	`current_step` integer DEFAULT 0 NOT NULL,
	`approved_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_reports_event_author_idx` ON `activity_reports` (`event_id`,`author_id`,`kind`);--> statement-breakpoint
CREATE UNIQUE INDEX `activity_reports_event_summary_idx` ON `activity_reports` (`event_id`) WHERE kind = 'summary';--> statement-breakpoint
CREATE INDEX `activity_reports_author_idx` ON `activity_reports` (`author_id`);--> statement-breakpoint
CREATE INDEX `activity_reports_status_division_idx` ON `activity_reports` (`status`,`division`);--> statement-breakpoint
ALTER TABLE `event_categories` ADD `has_lecturer` integer DEFAULT true NOT NULL;--> statement-breakpoint
-- ミーティング・親睦には講師を置かない（ほかの種類は「イベント設定」で変えられる）
UPDATE `event_categories` SET `has_lecturer` = false WHERE `id` IN ('meeting', 'social');--> statement-breakpoint
ALTER TABLE `event_participants` ADD `role` text DEFAULT 'assistant' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `summary_writer_id` text REFERENCES users(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `notification_settings` ADD `on_report_review_requested` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_settings` ADD `on_report_reviewed` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `head_of` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `officer` text;