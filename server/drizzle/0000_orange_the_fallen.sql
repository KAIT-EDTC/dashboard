CREATE TABLE `blog_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`event_name` text NOT NULL,
	`event_date` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`github_pr_url` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`discord_username` text NOT NULL,
	`discord_avatar` text,
	`last_name` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name_kana` text NOT NULL,
	`first_name_kana` text NOT NULL,
	`student_id` text NOT NULL,
	`enrollment_year` integer NOT NULL,
	`faculty` text NOT NULL,
	`department` text NOT NULL,
	`division` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
