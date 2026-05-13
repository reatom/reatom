import { reatomForm } from '@reatom/core'
import { z } from 'zod/v4'

import { demoCredentials } from '../../shared/api/fakeBackend'
import type { RegisterInput, Session, UserRole } from '../../shared/api/types'
import { userRoles } from '../../shared/api/types'

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(4, 'Password is required'),
})

export type LoginValues = z.infer<typeof loginSchema>

export const reatomLoginForm = (
  onSubmit: (values: LoginValues) => Promise<Session>,
) =>
  reatomForm(
    {
      email: demoCredentials.email,
      password: demoCredentials.password,
    },
    {
      name: 'auth.loginForm',
      validateOnBlur: true,
      schema: loginSchema,
      onSubmit,
    },
  )

export type LoginForm = ReturnType<typeof reatomLoginForm>

export const registerSchema = z.object({
  name: z.string().min(2, 'Use at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  role: z.enum(userRoles),
  password: z.string().min(6, 'Use at least 6 characters'),
})

export type RegisterValues = z.infer<typeof registerSchema>

export const reatomRegisterForm = (
  onSubmit: (values: RegisterInput) => Promise<Session>,
) =>
  reatomForm(
    {
      name: '',
      email: '',
      role: 'manager' as UserRole,
      password: '',
    },
    {
      name: 'auth.registerForm',
      validateOnBlur: true,
      schema: registerSchema,
      onSubmit,
    },
  )

export type RegisterForm = ReturnType<typeof reatomRegisterForm>
