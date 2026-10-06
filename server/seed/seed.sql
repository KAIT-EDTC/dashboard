-- 開発用のダミーデータ（ローカルD1専用）。`npm run db:seed` で clear.sql のあとに流す
-- 学年・イベントの日付は実行した日を基準に計算するので、いつ流しても「1〜4年生」「過去と今後のイベント」がそろう
-- ※ wrangler はセミコロンで文を区切るので、文字列やコメントの中にセミコロンを書かないこと

-- ---------------------------------------------------------------------------
-- メンバー（20人）
-- ---------------------------------------------------------------------------

WITH
  -- 今日の年度（4月始まり・日本時間）。shared の gradeOf と同じ考え方
  fy(year) AS (SELECT CAST(strftime('%Y', 'now', '+9 hours', '-3 months') AS INTEGER)),
  -- shared/src/student.ts の DEPARTMENT_MAP の一部（ロボット・メカトロニクス学科は32）
  dept(code, faculty, department) AS (VALUES
    ('11', '工学部', '機械工学科'),
    ('12', '工学部', '電気電子情報工学科'),
    ('15', '創造工学部', '自動車システム開発工学科'),
    ('32', '創造工学部', 'ロボット・メカトロニクス学科'),
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
    (3,  '高橋',   '翔',   'タカハシ', 'ショウ', 'seed_takahashi', 3, '32', 'admin',  '',       '遊行塾の企画をしています', '', '["ロボット","Arduino"]', '{}'),
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
    (15, '松本',   '陸',   'マツモト', 'リク',   'seed_matsumoto', 1, '32', 'member', '',       '', '', '["ロボコン"]', '{}'),
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
    ('seed-ev-08', '部室の大掃除', 'other', '終わるまでやります。軍手は各自で。', '部室', 6, '15:00', NULL, NULL, NULL, NULL, NULL, 'seed-09'),
    ('seed-ev-09', '第3回 遊行塾 Arduino入門', 'activity', 'Arduinoでブザーを鳴らします。', 'E棟 3階 工作室', -35, '13:00', '16:30', -38, '23:59', NULL, 500, 'seed-07')
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
  ('seed-ev-08', 'seed-18', 'maybe', '', 0, 0),
  -- 過去: 遊行塾（9人。全員の活動報告書とまとめ報告書が承認済み）
  ('seed-ev-09', 'seed-07', 'going', '', 1, 1),
  ('seed-ev-09', 'seed-03', 'going', '', 1, 1),
  ('seed-ev-09', 'seed-12', 'going', '', 1, 1),
  ('seed-ev-09', 'seed-13', 'going', '', 1, 1),
  ('seed-ev-09', 'seed-17', 'going', '', 1, 1),
  ('seed-ev-09', 'seed-15', 'going', '', 1, 1),
  ('seed-ev-09', 'seed-19', 'going', '', 1, 1),
  ('seed-ev-09', 'seed-05', 'going', '', 1, 1),
  ('seed-ev-09', 'seed-01', 'going', '', 1, 1);

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

-- ---------------------------------------------------------------------------
-- 役職（活動報告書の承認者）と、遊行塾の講師
-- ---------------------------------------------------------------------------

UPDATE users SET officer = 'representative' WHERE id = 'seed-01';
UPDATE users SET officer = 'general_manager' WHERE id = 'seed-02';
UPDATE users SET head_of = '["企画部"]' WHERE id = 'seed-03';
UPDATE users SET head_of = '["広報部"]' WHERE id = 'seed-04';
UPDATE users SET head_of = '["営業部"]' WHERE id = 'seed-05';
UPDATE users SET head_of = '["人事部"]' WHERE id = 'seed-06';
UPDATE users SET head_of = '["総務部"]' WHERE id = 'seed-09';

UPDATE event_participants SET role = 'lecturer' WHERE user_id = 'seed-03' AND event_id IN ('seed-ev-01', 'seed-ev-05');
UPDATE event_participants SET role = 'lecturer' WHERE user_id = 'seed-07' AND event_id = 'seed-ev-09';
-- 第3回 遊行塾のまとめ報告書は、講師ではなく山田さんを担当に指名
UPDATE events SET summary_writer_id = 'seed-12' WHERE id = 'seed-ev-09';
-- 遊行塾・プログラミング教室以外は講師を置かない。前期おつかれさま会は主催の渡辺さんがまとめ担当
UPDATE events SET has_lecturer = 0 WHERE id IN ('seed-ev-02', 'seed-ev-03', 'seed-ev-04', 'seed-ev-06', 'seed-ev-08');
UPDATE events SET summary_writer_id = 'seed-06' WHERE id = 'seed-ev-02';

-- ---------------------------------------------------------------------------
-- 活動報告書（過去の3イベント）
-- 承認済み・承認待ち・修正依頼（書き直し案あり／コメントだけ）・下書き・未提出がそろうようにする
-- 部員は所属部署の部署長、役職者は選んだ承認者（approver_id）が承認する
-- ---------------------------------------------------------------------------

WITH
  r(id, event_id, author_id, division, content, reflection, rating, notes, status, submitted_day, approval_steps, approver_id, approved_day) AS (VALUES
    -- 第4回 遊行塾
    ('seed-rp-01', 'seed-ev-01', 'seed-07', '企画部', '各班を回って、はんだ付けと配線の補助をした。',
      'LEDが点かない班が多かったが、原因の多くは極性の向きだった。最初に向きの見分け方を全体に説明しておけばよかった。次回は説明用のスライドに足しておく。', 4,
      '抵抗（330Ω）の残りが少なくなっています。', 'approved', -20, '["division_head"]', NULL, -19),
    ('seed-rp-02', 'seed-ev-01', 'seed-13', '企画部', '受付と、終わった班の片付けを担当した。',
      '初めての参加だったので、先輩の動きを見ながら手伝った。受付は特に問題なかった。いろいろ勉強になった。', 3,
      '', 'rejected', -19, '["division_head"]', NULL, NULL),
    ('seed-rp-03', 'seed-ev-01', 'seed-15', '営業部', '写真撮影と、参加者アンケートの回収をした。',
      'アンケートは全員分回収できた。作業中の写真が少なかったので、次回は撮る係を決めておきたい。', 4,
      '', 'submitted', -18, '["division_head"]', NULL, NULL),
    ('seed-rp-04', 'seed-ev-01', 'seed-03', '企画部', '講師として全体の進行と、回路の説明をした。',
      '時間内に全員がLEDを光らせることができた。説明のあとに質問の時間を取ったことで、つまずく人が減った。後半は時間が余ったので、発展課題を用意しておきたい。', 5,
      'LEDキットの予備を次回までに10個補充します。', 'approved', -20, '["designated"]', 'seed-01', -18),
    ('seed-rp-05', 'seed-ev-01', 'seed-05', '営業部', '会場の準備と、参加費の集金をした。',
      '集金は1人分が未回収のまま。会場は予定より早く準備できた。', 3,
      '', 'submitted', -17, '["designated"]', 'seed-02', NULL),
    -- 前期おつかれさま会
    ('seed-rp-06', 'seed-ev-02', 'seed-14', '広報部', '会の様子を写真に撮り、SNS用にまとめた。',
      '全員が写った集合写真を撮れた。店内が暗かったので、次はフラッシュの設定を確認しておく。', 5,
      '', 'approved', -9, '["division_head"]', NULL, -8),
    ('seed-rp-07', 'seed-ev-02', 'seed-08', '広報部', '店の予約と、当日の出欠の確認をした。',
      '予約人数の変更が直前に2回あった。出欠の締切を早めにしたほうがよい。', 4,
      '', 'submitted', -8, '["division_head"]', NULL, NULL),
    ('seed-rp-08', 'seed-ev-02', 'seed-10', '営業部', '会計を担当した。',
      '', NULL,
      '', 'draft', NULL, '[]', NULL, NULL),
    ('seed-rp-09', 'seed-ev-02', 'seed-11', '人事部', '新入生への声かけを担当した。',
      '新入生と話せた。楽しかった。', 4,
      '', 'rejected', -8, '["division_head"]', NULL, NULL),
    -- 第3回 遊行塾（全員承認済み。まとめ報告書の担当の山田さんは書いていない）
    ('seed-rp-11', 'seed-ev-09', 'seed-07', '企画部', '講師としてArduinoの基本と、ブザーを鳴らすプログラムを説明した。',
      '前半の説明が長くなり、実習の時間が足りなかった。次回は説明を半分にして、手を動かす時間を増やす。', 4,
      '', 'approved', -33, '["division_head"]', NULL, -32),
    ('seed-rp-12', 'seed-ev-09', 'seed-03', '企画部', '各班を回って配線の確認をした。',
      '配線ミスが多かったので、ブレッドボードの使い方を先に説明したほうがよい。', 4,
      '', 'approved', -33, '["designated"]', 'seed-01', -32),
    ('seed-rp-14', 'seed-ev-09', 'seed-13', '企画部', 'つまずいている班の補助をした。',
      '音が鳴らない原因を一緒に探せた。自分でも説明できるよう復習したい。', 4,
      '', 'approved', -33, '["division_head"]', NULL, -32),
    ('seed-rp-15', 'seed-ev-09', 'seed-17', '企画部', '部品の配布と回収をした。',
      '部品の数を事前に数えておいたので、回収がスムーズだった。', 5,
      '', 'approved', -33, '["division_head"]', NULL, -32),
    ('seed-rp-16', 'seed-ev-09', 'seed-15', '営業部', '写真撮影をした。',
      '作業中の写真を多く撮れた。SNSに使える写真を広報部に渡した。', 4,
      '', 'approved', -33, '["division_head"]', NULL, -32),
    ('seed-rp-17', 'seed-ev-09', 'seed-19', '企画部', '会場の設営と片付けをした。',
      '机の配置を班ごとに分けたことで、講師が回りやすかった。', 4,
      '', 'approved', -33, '["division_head"]', NULL, -32),
    ('seed-rp-18', 'seed-ev-09', 'seed-05', '営業部', '参加費の集金をした。',
      '全員分を回収できた。釣り銭を多めに用意しておいてよかった。', 5,
      '', 'approved', -33, '["designated"]', 'seed-02', -32),
    ('seed-rp-19', 'seed-ev-09', 'seed-01', '企画部', '全体の見守りと、最後のまとめの挨拶をした。',
      '初心者が多かったが、全員が音を鳴らせた。次は応用編を企画したい。', 5,
      '', 'approved', -33, '["designated"]', 'seed-02', -32)
  )
INSERT INTO activity_reports (id, event_id, author_id, division, content, reflection, rating, notes, status, submitted_at, approval_steps, approver_id, approved_at)
SELECT
  id, event_id, author_id, division, content, reflection, rating, notes, status,
  CASE WHEN submitted_day IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%fZ', 'now', submitted_day || ' days') END,
  approval_steps, approver_id,
  CASE WHEN approved_day IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%fZ', 'now', approved_day || ' days') END
FROM r;

-- ---------------------------------------------------------------------------
-- まとめ報告書（イベントに1つ。担当は指名された人か講師）
-- 第3回 遊行塾: 担当者以外の活動報告書が承認済みで、まとめ報告書も承認済み（参加者9人で様式の欄からはみ出す）
-- 第4回 遊行塾: 講師が下書き中（活動報告書が出そろっていないので提出できない）
-- ---------------------------------------------------------------------------

INSERT INTO activity_reports (id, event_id, author_id, kind, division, content, hosting, analyses, overview, impressions, rating, notes, status, submitted_at, approval_steps, approved_at) VALUES
  ('seed-rp-20', 'seed-ev-09', 'seed-12', 'summary', '企画部',
    'Arduinoの基本とブザーを鳴らすプログラムの説明' || char(10) || '班ごとの実習と講師・補助による個別のサポート' || char(10) || '参加者アンケートの実施',
    'host', '[{"userId": "seed-07", "text": "前半の説明が長くなり、実習の時間が足りなかった。次回は説明を半分にして、手を動かす時間を増やす。"}, {"userId": "seed-03", "text": "配線ミスが多かったので、ブレッドボードの使い方を先に説明したほうがよい。"}, {"userId": "seed-12", "text": "資料の部数が足りず、途中で印刷し直した。次回は多めに用意する。"}, {"userId": "seed-13", "text": "音が鳴らない原因を一緒に探せた。自分でも説明できるよう復習したい。"}, {"userId": "seed-17", "text": "部品の数を事前に数えておいたので、回収がスムーズだった。"}, {"userId": "seed-15", "text": "作業中の写真を多く撮れた。SNSに使える写真を広報部に渡した。"}, {"userId": "seed-19", "text": "机の配置を班ごとに分けたことで、講師が回りやすかった。"}, {"userId": "seed-05", "text": "全員分を回収できた。釣り銭を多めに用意しておいてよかった。"}, {"userId": "seed-01", "text": "初心者が多かったが、全員が音を鳴らせた。次は応用編を企画したい。"}]',
    '初心者が多い回だったが、参加者全員がブザーを鳴らすところまで進められた。前半の説明が長く実習の時間が足りなかったため、説明を短くし手を動かす時間を増やすことが次回の課題である。資料の部数不足もあり、準備の段階で数を確認する必要がある。',
    '補助の人数が足りていたため、つまずいた班にすぐ対応できた。一方で配線ミスが多く、ブレッドボードの使い方を最初に説明していれば防げたと考える。机の配置を班ごとに分けたことは講師の移動を楽にし、全体の進行にも良い影響があった。次回は応用編として、センサーを使った課題を用意したい。',
    4, '資料は多めに印刷しておくこと。', 'approved',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-31 days'), '["division_head"]', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')),
  ('seed-rp-10', 'seed-ev-01', 'seed-03', 'summary', '企画部',
    'LEDを光らせる回路の説明' || char(10) || '班ごとの実習', 'host', '[{"userId": "seed-03", "text": "時間内に全員がLEDを光らせることができた。後半は時間が余ったので、発展課題を用意しておきたい。"}, {"userId": "seed-01", "text": ""}, {"userId": "seed-05", "text": "会場は予定より早く準備できた。集金は1人分が未回収。"}, {"userId": "seed-07", "text": "LEDが点かない原因の多くは極性の向きだった。次回は最初に見分け方を説明する。"}, {"userId": "seed-13", "text": ""}, {"userId": "seed-15", "text": "アンケートは全員分回収できた。作業中の写真をもっと撮りたい。"}]',
    '', '', NULL, '', 'draft', NULL, '[]', NULL);

UPDATE events SET summary_writer_id = 'seed-03' WHERE id = 'seed-ev-01';

-- 確認の履歴（修正依頼のあとに再提出して承認、の流れも入れる）
WITH
  v(id, report_id, reviewer_id, step, decision, comment, day) AS (VALUES
  ('seed-rv-01', 'seed-rp-01', 'seed-03', 'division_head', 'reject', '原因と次回どうするかまで書いてもらえると助かります。', -20),
  ('seed-rv-02', 'seed-rp-01', 'seed-03', 'division_head', 'approve', 'ありがとうございます。', -19),
  ('seed-rv-03', 'seed-rp-04', 'seed-01', 'designated', 'approve', '', -18),
  ('seed-rv-04', 'seed-rp-02', 'seed-03', 'division_head', 'reject', '', -18),
  ('seed-rv-05', 'seed-rp-06', 'seed-04', 'division_head', 'approve', '', -8),
  ('seed-rv-06', 'seed-rp-09', 'seed-06', 'division_head', 'reject', '振り返りをもう少し具体的にお願いします。', -7),
  ('seed-rv-07', 'seed-rp-20', 'seed-03', 'division_head', 'approve', 'まとめありがとうございます。', -30)
  )
INSERT INTO activity_report_reviews (id, report_id, reviewer_id, step, decision, comment, created_at)
SELECT id, report_id, reviewer_id, step, decision, comment, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', day || ' days')
FROM v;

-- 本文の範囲への修正依頼。位置は本文から計算する（書き直し案があるものと、コメントだけのもの）
WITH
  c(id, review_id, report_id, field, quote, body, suggestion) AS (VALUES
  ('seed-cm-01', 'seed-rv-04', 'seed-rp-02', 'reflection', 'いろいろ勉強になった。', '何を学んだか、具体的に書いてください。', '先輩がつまずいている人に声をかけるタイミングが参考になった。'),
  ('seed-cm-02', 'seed-rv-04', 'seed-rp-02', 'reflection', '受付は特に問題なかった。', '次回に向けて気づいたことがあれば書いてください。', NULL),
  ('seed-cm-03', 'seed-rv-06', 'seed-rp-09', 'reflection', '楽しかった。', '', '新入生が先輩と話しやすいよう、席替えの時間を作れたのがよかった。')
  )
INSERT INTO activity_report_comments (id, review_id, field, start, "end", quote, body, suggestion)
SELECT c.id, c.review_id, c.field, instr(p.reflection, c.quote) - 1, instr(p.reflection, c.quote) - 1 + length(c.quote), c.quote, c.body, c.suggestion
FROM c
JOIN activity_reports p ON p.id = c.report_id;
