DROP TABLE `blog_series`;--> statement-breakpoint
DROP TABLE `blog_tags`;--> statement-breakpoint
ALTER TABLE `blog_posts` ADD `pickup` integer DEFAULT false NOT NULL;--> statement-breakpoint
-- タグ「ピックアップ」はピックアップのチェックに移す
UPDATE `blog_posts` SET `pickup` = 1 WHERE EXISTS (SELECT 1 FROM json_each(`blog_posts`.`tags`) WHERE `value` = 'ピックアップ');--> statement-breakpoint
-- 種別をタグと統合した4つ（yugyou / offcampus / oncampus / play）に寄せる。event / other は学内か学外か決められないので未選択に戻す
UPDATE `blog_posts` SET `series` = 'offcampus' WHERE `series` = 'outreach';--> statement-breakpoint
UPDATE `blog_posts` SET `series` = '' WHERE `series` NOT IN ('', 'yugyou', 'offcampus', 'oncampus', 'play');
--> statement-breakpoint
-- 種別が未選択の記事は、タグから決められるものだけ補う（旧ルールの記事IDの記事など）
UPDATE `blog_posts` SET `series` = 'yugyou' WHERE `series` = '' AND EXISTS (SELECT 1 FROM json_each(`blog_posts`.`tags`) WHERE `value` = '遊行塾');--> statement-breakpoint
UPDATE `blog_posts` SET `series` = 'play' WHERE `series` = '' AND EXISTS (SELECT 1 FROM json_each(`blog_posts`.`tags`) WHERE `value` = '遊び');--> statement-breakpoint
UPDATE `blog_posts` SET `series` = 'offcampus' WHERE `series` = '' AND EXISTS (SELECT 1 FROM json_each(`blog_posts`.`tags`) WHERE `value` = '対外活動');
