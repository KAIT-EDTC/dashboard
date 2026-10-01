CREATE TABLE `blog_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_tags_label_unique` ON `blog_tags` (`label`);--> statement-breakpoint
ALTER TABLE `blog_posts` ADD `series` text DEFAULT '' NOT NULL;--> statement-breakpoint
INSERT INTO `blog_tags` (`id`, `label`, `sort_order`) VALUES
	('tag-pickup', 'ピックアップ', 0),
	('tag-yugyou', '遊行塾', 1),
	('tag-event', 'イベント', 2),
	('tag-outreach', '対外活動', 3),
	('tag-play', '遊び', 4);
