-- 開発用のダミーデータ（IDが seed- で始まるもの）を消す。自分のデータには触らない
-- 出欠・持ち物はイベントの削除で、部署・出欠はユーザーの削除で一緒に消える（持ち物の担当者は外れる）
DELETE FROM events WHERE id LIKE 'seed-%';
DELETE FROM users WHERE id LIKE 'seed-%';
