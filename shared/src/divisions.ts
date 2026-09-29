/** サークル内の部署。兼部があるためユーザーは複数所属できる */
export const DIVISIONS = ['営業部', '総務部', '広報部', '企画部', '人事部'] as const
export type Division = (typeof DIVISIONS)[number]
