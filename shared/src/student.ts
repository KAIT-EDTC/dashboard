import { fiscalYearOf } from './date'

/** 学籍番号 YYFFNNN の FF → 学部・学科 */
export const DEPARTMENT_MAP: Record<string, { faculty: string; department: string }> = {
  '11': { faculty: '工学部', department: '機械工学科' },
  '12': { faculty: '工学部', department: '電気電子情報工学科' },
  '13': { faculty: '工学部', department: '応用科学科' },
  '15': { faculty: '創造工学部', department: '自動車システム開発工学科' },
  '16': { faculty: '工学部', department: 'ロボット・メカトロニクス学科' },
  '21': { faculty: '情報学部', department: '情報工学科' },
  '22': { faculty: '情報学部', department: '情報ネットワーク・コミュニケーション学科' },
  '23': { faculty: '情報学部', department: '情報メディア学科' },
  '24': { faculty: '情報学部', department: '情報システム学科' },
  '25': { faculty: '情報学部', department: 'データサイエンス学科' },
  '31': { faculty: '創造工学部', department: '自動車システム開発工学科' },
  '33': { faculty: '創造工学部', department: 'ホームエレクトロニクス開発学科' },
  '35': { faculty: '創造工学部', department: '宇宙航空システム工学科' },
  '51': { faculty: '応用バイオ科学部', department: '応用バイオ科学科' },
  '61': { faculty: '健康医療科学部', department: '看護学科' },
}

export type StudentInfo = {
  studentId: string
  enrollmentYear: number
  faculty: string
  department: string
}

/**
 * Discordのサーバーニックネームを解析する。
 * 「2424013: 山田 太郎」「2424013：山田太郎」「2424013 山田 太郎」などを許容する。
 */
export function parseNickname(nickname: string): { studentId: string; name: string } | null {
  const match = nickname.trim().match(/^(\d{7})\s*[:：]?\s*(.+)$/)
  if (!match) return null
  return { studentId: match[1], name: match[2].trim() }
}

/** 「山田 太郎」「山田　太郎」を姓と名に分ける。区切りがなければ姓のみ */
export function splitName(name: string): { lastName: string; firstName: string } {
  const [lastName = '', ...rest] = name.trim().split(/[\s　]+/)
  return { lastName, firstName: rest.join('') }
}

/** 学籍番号 (YYFFNNN) から入学年度・学部・学科を得る */
export function parseStudentId(studentId: string): StudentInfo | null {
  if (!/^\d{7}$/.test(studentId)) return null
  const dept = DEPARTMENT_MAP[studentId.slice(2, 4)]
  if (!dept) return null
  return {
    studentId,
    enrollmentYear: 2000 + Number(studentId.slice(0, 2)),
    ...dept,
  }
}

/** 入学年度から現在の学年を求める（留年等は考慮しない） */
export function gradeOf(enrollmentYear: number, today: string | Date = new Date()): number {
  return Math.max(1, fiscalYearOf(today) - enrollmentYear + 1)
}
