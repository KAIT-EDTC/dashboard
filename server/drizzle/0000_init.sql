CREATE TABLE `blog_images` (
	`post_id` text NOT NULL,
	`file_name` text NOT NULL,
	`data` text NOT NULL,
	`size` integer NOT NULL,
	`git_blob_sha` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`post_id`, `file_name`),
	FOREIGN KEY (`post_id`) REFERENCES `blog_posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`event_date` text DEFAULT '' NOT NULL,
	`slug` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`author_name` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`thumbnail` text,
	`body` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`submitted_content` text,
	`article_id` text,
	`branch` text,
	`pr_number` integer,
	`pr_url` text,
	`submitted_at` text,
	`published_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `blog_posts_author_idx` ON `blog_posts` (`author_id`);--> statement-breakpoint
CREATE INDEX `blog_posts_pr_idx` ON `blog_posts` (`pr_number`);--> statement-breakpoint
CREATE TABLE `event_items` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`assignee_id` text,
	`prepared` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `event_items_event_idx` ON `event_items` (`event_id`);--> statement-breakpoint
CREATE INDEX `event_items_assignee_idx` ON `event_items` (`assignee_id`);--> statement-breakpoint
CREATE TABLE `event_participants` (
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`attended` integer DEFAULT false NOT NULL,
	`paid` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`event_id`, `user_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_participants_user_idx` ON `event_participants` (`user_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`rsvp_deadline` text,
	`capacity` integer,
	`fee` integer,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_starts_at_idx` ON `events` (`starts_at`);--> statement-breakpoint
CREATE TABLE `user_divisions` (
	`user_id` text NOT NULL,
	`division` text NOT NULL,
	PRIMARY KEY(`user_id`, `division`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`discord_username` text NOT NULL,
	`discord_avatar` text,
	`role` text DEFAULT 'member' NOT NULL,
	`last_name` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name_kana` text NOT NULL,
	`first_name_kana` text NOT NULL,
	`student_id` text NOT NULL,
	`enrollment_year` integer NOT NULL,
	`faculty` text NOT NULL,
	`department` text NOT NULL,
	`nickname` text DEFAULT '' NOT NULL,
	`headline` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`interests` text DEFAULT '[]' NOT NULL,
	`links` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
