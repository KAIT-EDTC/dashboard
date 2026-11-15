-- ブログの「イベント種別（series）」を、HP（EDTCHP_v2）に合わせて「カテゴリ（category）」に改名する
ALTER TABLE `blog_posts` RENAME COLUMN `series` TO `category`;
