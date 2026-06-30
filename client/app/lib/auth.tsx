import { createContext, useContext } from 'react'

export type AuthUser = {
  id: string
  discordUsername: string
  discordAvatar: string | null
  lastName: string
  firstName: string
  lastNameKana: string
  firstNameKana: string
  studentId: string
  enrollmentYear: number
  faculty: string
  department: string
  division: string
  createdAt: string
  updatedAt: string
}

type AuthContextType = {
  user: AuthUser
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthGuard')
  }
  return context
}
