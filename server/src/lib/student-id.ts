const DEPARTMENT_MAP: Record<string, { faculty: string; department: string }> = {
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
  grade: number
}

// todo
// 多分discordの方で変える
// 1111111: AA BB
// 1111111: AABB
// 1111111:AA BB
// 1111111:AABB
// 1111111 AABB
// 1111111 AA BB

/** Parse nickname format: "2424013: 山田太郎" or "2424013：山田太郎" */
export function parseNickname(nickname: string): { studentId: string; name: string } | null {
  const match = nickname.match(/^(\d{7})\s*[:：]\s*(.+)$/)
  if (!match) return null
  return { studentId: match[1], name: match[2].trim() }
}

/** Parse student ID: YYFFNNN */
export function parseStudentId(studentId: string): StudentInfo | null {
  if (!/^\d{7}$/.test(studentId)) return null

  const yearCode = studentId.substring(0, 2)
  const deptCode = studentId.substring(2, 4)

  const enrollmentYear = 2000 + parseInt(yearCode, 10)
  const deptInfo = DEPARTMENT_MAP[deptCode]

  if (!deptInfo) return null

  // Calculate grade: current fiscal year - enrollment year + 1
  // Japanese fiscal year starts in April
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const fiscalYear = currentMonth >= 4 ? currentYear : currentYear - 1
  const grade = fiscalYear - enrollmentYear + 1

  return {
    studentId,
    enrollmentYear,
    faculty: deptInfo.faculty,
    department: deptInfo.department,
    grade: Math.max(1, grade),
  }
}

export { DEPARTMENT_MAP }
