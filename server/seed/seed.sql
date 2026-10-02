-- 開発用のダミーデータ（ローカルD1専用）。`npm run db:seed` で clear.sql のあとに流す
-- 学年・イベントの日付は実行した日を基準に計算するので、いつ流しても「1〜4年生」「過去と今後のイベント」がそろう
-- ※ wrangler はセミコロンで文を区切るので、文字列やコメントの中にセミコロンを書かないこと

-- ---------------------------------------------------------------------------
-- メンバー（20人）
-- ---------------------------------------------------------------------------

WITH
  -- 今日の年度（4月始まり・日本時間）。shared の gradeOf と同じ考え方
  fy(year) AS (SELECT CAST(strftime('%Y', 'now', '+9 hours', '-3 months') AS INTEGER)),
  -- shared/src/student.ts の DEPARTMENT_MAP の一部
  dept(code, faculty, department) AS (VALUES
    ('11', '工学部', '機械工学科'),
    ('12', '工学部', '電気電子情報工学科'),
    ('15', '創造工学部', '自動車システム開発工学科'),
    ('16', '工学部', 'ロボット・メカトロニクス学科'),
    ('21', '情報学部', '情報工学科'),
    ('22', '情報学部', '情報ネットワーク・コミュニケーション学科'),
    ('23', '情報学部', '情報メディア学科'),
    ('24', '情報学部', '情報システム学科'),
    ('25', '情報学部', 'データサイエンス学科'),
    ('33', '創造工学部', 'ホームエレクトロニクス開発学科'),
    ('35', '創造工学部', '宇宙航空システム工学科'),
    ('51', '応用バイオ科学部', '応用バイオ科学科'),
    ('61', '健康医療科学部', '看護学科')
  ),
  m(n, last_name, first_name, last_kana, first_kana, username, grade, dept_code, role, nickname, headline, bio, interests, links) AS (VALUES
    (1,  '佐藤',   '健太', 'サトウ',   'ケンタ', 'seed_sato',      4, '21', 'admin',  'けんた', '部長です。何でも聞いてください', 'EDTCの部長をしています。電子工作とRustが好きです。', '["電子工作","Rust","自作キーボード"]', '{"github":"seed-sato","x":"seed_sato"}'),
    (2,  '鈴木',   '美咲', 'スズキ',   'ミサキ', 'seed_suzuki',    4, '23', 'admin',  'みさき', '広報担当。写真撮ります', 'イベントの写真とブログの編集を担当しています。', '["写真","デザイン"]', '{"instagram":"seed_suzuki"}'),
    (3,  '高橋',   '翔',   'タカハシ', 'ショウ', 'seed_takahashi', 3, '16', 'admin',  '',       '遊行塾の企画をしています', '', '["ロボット","Arduino"]', '{}'),
    (4,  '田中',   '陽菜', 'タナカ',   'ヒナ',   'seed_tanaka',    3, '24', 'member', 'ひな',   'Webサイトを作るのが好き', 'フロントエンドの勉強中です。EDTCのサイトも触っています。', '["React","TypeScript"]', '{"github":"seed-tanaka","website":"https://example.com"}'),
    (5,  '伊藤',   '大輝', 'イトウ',   'ダイキ', 'seed_ito',       3, '12', 'member', '',       '', '', '[]', '{}'),
    (6,  '渡辺',   'さくら', 'ワタナベ', 'サクラ', 'seed_watanabe',  3, '21', 'member', 'さくら', '人事部。新歓がんばります', '', '["ボードゲーム"]', '{}'),
    (7,  '山本',   '蓮',   'ヤマモト', 'レン',   'seed_yamamoto',  2, '35', 'member', '',       'ドローン飛ばしたい', 'モデルロケットとドローンに興味があります。', '["ドローン","3Dプリンタ"]', '{"x":"seed_yamamoto"}'),
    (8,  '中村',   '結衣', 'ナカムラ', 'ユイ',   'seed_nakamura',  2, '23', 'member', 'ゆい',   '', '', '["イラスト"]', '{}'),
    (9,  '小林',   '悠斗', 'コバヤシ', 'ユウト', 'seed_kobayashi', 2, '11', 'member', '',       '', '', '[]', '{}'),
    (10, '加藤',   '美月', 'カトウ',   'ミヅキ', 'seed_kato',      2, '25', 'member', '',       'データ分析勉強中', '', '["Python","統計"]', '{"github":"seed-kato"}'),
    (11, '吉田',   '湊',   'ヨシダ',   'ミナト', 'seed_yoshida',   2, '22', 'member', 'みなと', '', 'ネットワークとサーバーまわりが好きです。', '["Linux","自宅サーバー"]', '{}'),
    (12, '山田',   '葵',   'ヤマダ',   'アオイ', 'seed_yamada',    2, '33', 'member', '',       '', '', '[]', '{}'),
    (13, '佐々木', '颯太', 'ササキ',   'ソウタ', 'seed_sasaki',    1, '21', 'member', '',       'プログラミング始めました', '', '["競技プログラミング"]', '{}'),
    (14, '山口',   '凛',   'ヤマグチ', 'リン',   'seed_yamaguchi', 1, '23', 'member', 'りん',   '', '', '[]', '{}'),
    (15, '松本',   '陸',   'マツモト', 'リク',   'seed_matsumoto', 1, '16', 'member', '',       '', '', '["ロボコン"]', '{}'),
    (16, '井上',   '芽依', 'イノウエ', 'メイ',   'seed_inoue',     1, '24', 'member', '',       '', '', '[]', '{}'),
    (17, '木村',   '樹',   'キムラ',   'イツキ', 'seed_kimura',    1, '12', 'member', '',       '電子工作やってみたい', '', '[]', '{}'),
    (18, '林',     '心春', 'ハヤシ',   'コハル', 'seed_hayashi',   1, '51', 'member', 'こはる', '', '', '["料理"]', '{}'),
    (19, '清水',   '奏太', 'シミズ',   'カナタ', 'seed_shimizu',   1, '15', 'member', '',       '', '', '[]', '{}'),
    (20, '森',     '杏奈', 'モリ',     'アンナ', 'seed_mori',      1, '61', 'member', '',       '', '', '[]', '{}')
  )
INSERT INTO users (
  id, discord_username, discord_avatar, role,
  last_name, first_name, last_name_kana, first_name_kana,
  student_id, enrollment_year, faculty, department,
  nickname, headline, bio, interests, links
)
SELECT
  printf('seed-%02d', m.n), m.username, NULL, m.role,
  m.last_name, m.first_name, m.last_kana, m.first_kana,
  printf('%02d%s%03d', (fy.year - m.grade + 1) % 100, m.dept_code, m.n), fy.year - m.grade + 1, dept.faculty, dept.department,
  m.nickname, m.headline, m.bio, m.interests, m.links
FROM m
JOIN dept ON dept.code = m.dept_code
CROSS JOIN fy;

-- 兼部の人は複数行
INSERT INTO user_divisions (user_id, division) VALUES
  ('seed-01', '総務部'), ('seed-01', '企画部'),
  ('seed-02', '広報部'),
  ('seed-03', '企画部'), ('seed-03', '営業部'),
  ('seed-04', '広報部'),
  ('seed-05', '営業部'),
  ('seed-06', '人事部'),
  ('seed-07', '企画部'),
  ('seed-08', '広報部'), ('seed-08', '企画部'),
  ('seed-09', '総務部'),
  ('seed-10', '営業部'),
  ('seed-11', '人事部'), ('seed-11', '総務部'),
  ('seed-12', '企画部'),
  ('seed-13', '企画部'),
  ('seed-14', '広報部'),
  ('seed-15', '営業部'),
  ('seed-16', '総務部'),
  ('seed-17', '企画部'),
  ('seed-18', '人事部'),
  ('seed-19', '企画部'),
  ('seed-20', '広報部');

-- ---------------------------------------------------------------------------
-- イベント（日付は今日から何日後か。マイナスは過去）
-- ---------------------------------------------------------------------------

WITH
  e(id, title, category, description, location, start_day, start_time, end_time, deadline_day, deadline_time, capacity, fee, created_by) AS (VALUES
    ('seed-ev-01', '第4回 遊行塾 電子工作入門', 'activity', 'LEDを光らせる回路を作ります。初心者歓迎！', 'E棟 3階 工作室', -21, '13:00', '17:00', -24, '23:59', NULL, 500, 'seed-03'),
    ('seed-ev-02', '前期おつかれさま会', 'social', '前期の活動おつかれさまでした。みんなでご飯を食べましょう。', '本厚木駅周辺', -10, '18:30', '21:00', -14, '23:59', 20, 3000, 'seed-06'),
    ('seed-ev-03', '定例ミーティング', 'meeting', '各部署の進捗共有と今後の予定の確認。', '部室', 2, '18:00', '19:00', NULL, NULL, NULL, NULL, 'seed-01'),
    ('seed-ev-04', 'オープンキャンパス出展', 'outreach', 'ブースで作品展示と説明をします。午前・午後で交代制。', 'KAIT工房', 9, '09:30', '16:30', 5, '18:00', 8, NULL, 'seed-02'),
    ('seed-ev-05', '第5回 遊行塾 はんだ付けに挑戦', 'activity', 'ライントレーサーのはんだ付けをします。', 'E棟 3階 工作室', 15, '13:00', '17:00', 10, '23:59', 15, 500, 'seed-03'),
    ('seed-ev-06', 'BBQ大会', 'social', '出欠の締切は過ぎていますが、変更は主催者に連絡してください。', '相模川河川敷', 20, '11:00', '15:00', -1, '23:59', NULL, 1500, 'seed-08'),
    ('seed-ev-07', '地域の小学校でプログラミング教室', 'outreach', 'Scratchを使った授業のサポートです。', '厚木市立〇〇小学校', 30, '10:00', '12:00', 21, '23:59', 6, NULL, 'seed-07'),
    ('seed-ev-08', '部室の大掃除', 'other', '終わるまでやります。軍手は各自で。', '部室', 6, '15:00', NULL, NULL, NULL, NULL, NULL, 'seed-09')
  )
INSERT INTO events (id, title, category, description, location, starts_at, ends_at, rsvp_deadline, capacity, fee, created_by)
SELECT
  id, title, category, description, location,
  strftime('%Y-%m-%d', 'now', '+9 hours', start_day || ' days') || 'T' || start_time,
  CASE WHEN end_time IS NULL THEN NULL ELSE strftime('%Y-%m-%d', 'now', '+9 hours', start_day || ' days') || 'T' || end_time END,
  CASE WHEN deadline_day IS NULL THEN NULL ELSE strftime('%Y-%m-%d', 'now', '+9 hours', deadline_day || ' days') || 'T' || deadline_time END,
  capacity, fee, created_by
FROM e;

-- 出欠（attended / paid は 0/1）
INSERT INTO event_participants (event_id, user_id, status, comment, attended, paid) VALUES
  -- 過去: 遊行塾（出席・集金を記録済み）
  ('seed-ev-01', 'seed-03', 'going', '', 1, 1),
  ('seed-ev-01', 'seed-01', 'going', '', 1, 1),
  ('seed-ev-01', 'seed-05', 'going', '', 1, 1),
  ('seed-ev-01', 'seed-07', 'going', '', 1, 0),
  ('seed-ev-01', 'seed-13', 'going', '初参加です！', 1, 1),
  ('seed-ev-01', 'seed-15', 'going', '', 0, 0),
  ('seed-ev-01', 'seed-17', 'maybe', '授業次第です', 0, 0),
  ('seed-ev-01', 'seed-09', 'declined', 'バイトのため', 0, 0),
  -- 過去: おつかれさま会
  ('seed-ev-02', 'seed-06', 'going', '', 1, 1),
  ('seed-ev-02', 'seed-01', 'going', '', 1, 1),
  ('seed-ev-02', 'seed-02', 'going', '', 1, 1),
  ('seed-ev-02', 'seed-04', 'going', '', 1, 1),
  ('seed-ev-02', 'seed-08', 'going', '', 1, 1),
  ('seed-ev-02', 'seed-10', 'going', '', 1, 0),
  ('seed-ev-02', 'seed-11', 'going', '少し遅れます', 1, 1),
  ('seed-ev-02', 'seed-14', 'going', '', 0, 0),
  ('seed-ev-02', 'seed-18', 'going', '', 1, 1),
  ('seed-ev-02', 'seed-12', 'declined', '', 0, 0),
  -- 今週: 定例ミーティング
  ('seed-ev-03', 'seed-01', 'going', '', 0, 0),
  ('seed-ev-03', 'seed-02', 'going', '', 0, 0),
  ('seed-ev-03', 'seed-03', 'going', '', 0, 0),
  ('seed-ev-03', 'seed-06', 'going', '', 0, 0),
  ('seed-ev-03', 'seed-09', 'maybe', '', 0, 0),
  ('seed-ev-03', 'seed-11', 'declined', '実験が長引きそうです', 0, 0),
  -- 今後: オープンキャンパス（定員8人に対して参加7人）
  ('seed-ev-04', 'seed-02', 'going', '', 0, 0),
  ('seed-ev-04', 'seed-01', 'going', '午前だけ参加', 0, 0),
  ('seed-ev-04', 'seed-03', 'going', '', 0, 0),
  ('seed-ev-04', 'seed-04', 'going', '', 0, 0),
  ('seed-ev-04', 'seed-07', 'going', '', 0, 0),
  ('seed-ev-04', 'seed-08', 'going', '午後から行きます', 0, 0),
  ('seed-ev-04', 'seed-14', 'going', '', 0, 0),
  ('seed-ev-04', 'seed-16', 'maybe', '', 0, 0),
  ('seed-ev-04', 'seed-05', 'declined', '', 0, 0),
  -- 今後: 遊行塾
  ('seed-ev-05', 'seed-03', 'going', '', 0, 0),
  ('seed-ev-05', 'seed-05', 'going', '', 0, 0),
  ('seed-ev-05', 'seed-13', 'going', '', 0, 0),
  ('seed-ev-05', 'seed-15', 'going', '', 0, 0),
  ('seed-ev-05', 'seed-17', 'going', 'はんだごて持っていません', 0, 0),
  ('seed-ev-05', 'seed-19', 'maybe', '', 0, 0),
  ('seed-ev-05', 'seed-09', 'maybe', '', 0, 0),
  -- 今後: BBQ（出欠締切済み）
  ('seed-ev-06', 'seed-08', 'going', '', 0, 0),
  ('seed-ev-06', 'seed-01', 'going', '', 0, 0),
  ('seed-ev-06', 'seed-02', 'going', '', 0, 0),
  ('seed-ev-06', 'seed-04', 'going', '', 0, 0),
  ('seed-ev-06', 'seed-06', 'going', '', 0, 0),
  ('seed-ev-06', 'seed-10', 'going', '', 0, 0),
  ('seed-ev-06', 'seed-11', 'going', '車出せます', 0, 0),
  ('seed-ev-06', 'seed-12', 'going', '', 0, 0),
  ('seed-ev-06', 'seed-13', 'going', '', 0, 0),
  ('seed-ev-06', 'seed-14', 'going', '', 0, 0),
  ('seed-ev-06', 'seed-18', 'going', '', 0, 0),
  ('seed-ev-06', 'seed-20', 'going', '', 0, 0),
  ('seed-ev-06', 'seed-15', 'maybe', '', 0, 0),
  ('seed-ev-06', 'seed-16', 'declined', '帰省中です', 0, 0),
  ('seed-ev-06', 'seed-19', 'declined', '', 0, 0),
  -- 今後: プログラミング教室
  ('seed-ev-07', 'seed-07', 'going', '', 0, 0),
  ('seed-ev-07', 'seed-04', 'going', '', 0, 0),
  ('seed-ev-07', 'seed-13', 'maybe', '', 0, 0),
  ('seed-ev-07', 'seed-10', 'maybe', '', 0, 0),
  ('seed-ev-07', 'seed-20', 'declined', '', 0, 0),
  -- 今後: 大掃除
  ('seed-ev-08', 'seed-09', 'going', '', 0, 0),
  ('seed-ev-08', 'seed-06', 'going', '', 0, 0),
  ('seed-ev-08', 'seed-12', 'going', '', 0, 0),
  ('seed-ev-08', 'seed-16', 'going', '', 0, 0),
  ('seed-ev-08', 'seed-18', 'maybe', '', 0, 0);

-- 持ち物（shared は担当者あり／なし、準備完了／未完了を混ぜる）
INSERT INTO event_items (id, event_id, name, kind, quantity, note, assignee_id, prepared) VALUES
  ('seed-item-01', 'seed-ev-01', '筆記用具', 'personal', 1, '', NULL, 0),
  ('seed-item-02', 'seed-ev-01', 'LEDキット', 'shared', 10, '部費で購入済み', 'seed-03', 1),
  ('seed-item-03', 'seed-ev-04', '展示用の作品', 'shared', 3, 'ロボット・ドローン・ゲーム', 'seed-07', 0),
  ('seed-item-04', 'seed-ev-04', '延長コード', 'shared', 2, '', 'seed-01', 1),
  ('seed-item-05', 'seed-ev-04', 'ポスター', 'shared', 1, 'A1サイズ', NULL, 0),
  ('seed-item-06', 'seed-ev-04', '名札', 'personal', 1, '', NULL, 0),
  ('seed-item-07', 'seed-ev-05', 'はんだごて', 'personal', 1, '持っていない人は貸し出しあり', NULL, 0),
  ('seed-item-08', 'seed-ev-05', 'ライントレーサーキット', 'shared', 15, '', 'seed-03', 0),
  ('seed-item-09', 'seed-ev-05', '保護メガネ', 'shared', 15, '', NULL, 0),
  ('seed-item-10', 'seed-ev-06', 'BBQコンロ', 'shared', 2, '', 'seed-11', 1),
  ('seed-item-11', 'seed-ev-06', '炭', 'shared', 2, '', 'seed-08', 0),
  ('seed-item-12', 'seed-ev-06', 'クーラーボックス', 'shared', 1, '', NULL, 0),
  ('seed-item-13', 'seed-ev-06', '飲み物', 'personal', 1, '', NULL, 0),
  ('seed-item-14', 'seed-ev-07', 'ノートPC', 'personal', 1, 'Scratchが動くもの', NULL, 0),
  ('seed-item-15', 'seed-ev-08', '軍手', 'personal', 1, '', NULL, 0),
  ('seed-item-16', 'seed-ev-08', 'ゴミ袋', 'shared', 20, '45L', 'seed-09', 0);
