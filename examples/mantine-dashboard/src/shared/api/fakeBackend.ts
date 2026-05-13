import type {
  Activity,
  DashboardSummary,
  Project,
  ProjectCreateInput,
  ProjectListQuery,
  ProjectListResult,
  ProjectStatus,
  RegisterInput,
  Session,
  SettingsInput,
  User,
} from './types'

const STORAGE_KEY = 'reatom-mantine-dashboard.fake-backend.v1'
const PAGE_SIZE = 6
const PASSWORD = 'password'

export const demoCredentials = {
  email: 'alex@example.com',
  password: PASSWORD,
}

type Db = {
  users: Array<User>
  projects: Array<Project>
  sessions: Record<string, string>
  activity: Array<Activity>
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const storage = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

const id = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const isoInDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString()
const now = () => new Date().toISOString()

const createSeedDb = (): Db => {
  const users: Array<User> = [
    {
      id: 'u_alex',
      name: 'Alex Morgan',
      email: demoCredentials.email,
      role: 'admin',
      title: 'Product lead',
      avatarColor: 'indigo',
    },
    {
      id: 'u_sam',
      name: 'Sam Rivera',
      email: 'sam@example.com',
      role: 'manager',
      title: 'Engineering manager',
      avatarColor: 'teal',
    },
    {
      id: 'u_nia',
      name: 'Nia Chen',
      email: 'nia@example.com',
      role: 'viewer',
      title: 'Data analyst',
      avatarColor: 'grape',
    },
  ]

  const projects: Array<Project> = [
    {
      id: 'p_1001',
      name: 'Revenue cockpit',
      description:
        'Executive dashboard for recurring revenue, churn, and expansion signals.',
      ownerId: 'u_alex',
      status: 'active',
      priority: 'high',
      budget: 128_000,
      progress: 72,
      dueDate: isoInDays(24),
      tags: ['analytics', 'finance'],
      updatedAt: isoInDays(-1),
    },
    {
      id: 'p_1002',
      name: 'Customer health scoring',
      description:
        'Predictive health scores with account-level recommendations.',
      ownerId: 'u_sam',
      status: 'blocked',
      priority: 'high',
      budget: 84_000,
      progress: 41,
      dueDate: isoInDays(12),
      tags: ['ml', 'accounts'],
      updatedAt: isoInDays(-2),
    },
    {
      id: 'p_1003',
      name: 'Partner portal refresh',
      description:
        'Self-service project handoff and reporting portal for agency partners.',
      ownerId: 'u_nia',
      status: 'planned',
      priority: 'medium',
      budget: 52_000,
      progress: 18,
      dueDate: isoInDays(38),
      tags: ['portal', 'partners'],
      updatedAt: isoInDays(-4),
    },
    {
      id: 'p_1004',
      name: 'Billing migration',
      description:
        'Move legacy invoice workflows into the new billing provider.',
      ownerId: 'u_alex',
      status: 'done',
      priority: 'medium',
      budget: 96_000,
      progress: 100,
      dueDate: isoInDays(-5),
      tags: ['billing', 'platform'],
      updatedAt: isoInDays(-5),
    },
    {
      id: 'p_1005',
      name: 'Mobile onboarding',
      description:
        'Guided setup checklist and activation nudges for new mobile users.',
      ownerId: 'u_sam',
      status: 'active',
      priority: 'low',
      budget: 47_000,
      progress: 58,
      dueDate: isoInDays(19),
      tags: ['mobile', 'growth'],
      updatedAt: isoInDays(-3),
    },
    {
      id: 'p_1006',
      name: 'Support quality console',
      description:
        'Queue-level analytics and coaching workflows for support leads.',
      ownerId: 'u_nia',
      status: 'active',
      priority: 'medium',
      budget: 63_000,
      progress: 66,
      dueDate: isoInDays(31),
      tags: ['support', 'quality'],
      updatedAt: isoInDays(-6),
    },
  ]

  return {
    users,
    projects,
    sessions: {},
    activity: [
      {
        id: id('a'),
        type: 'project',
        message: 'Seeded demo projects for the dashboard workspace',
        createdAt: now(),
      },
    ],
  }
}

const loadDb = (): Db => {
  const raw = storage()?.getItem(STORAGE_KEY)
  if (!raw) return createSeedDb()

  try {
    return JSON.parse(raw) as Db
  } catch {
    return createSeedDb()
  }
}

let db = loadDb()

const persist = () => storage()?.setItem(STORAGE_KEY, JSON.stringify(db))

const delay = (min = 350, max = 900) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, Math.round(min + Math.random() * (max - min)))
  })

const maybeFail = (rate: number, message: string) => {
  if (Math.random() < rate) throw new Error(message)
}

const publicUser = (user: User): User => clone(user)

const addActivity = (
  type: Activity['type'],
  message: string,
  userId?: string,
  projectId?: string,
) => {
  db.activity.unshift({
    id: id('a'),
    type,
    message,
    userId,
    projectId,
    createdAt: now(),
  })
  db.activity = db.activity.slice(0, 50)
}

const getUserByToken = (token: string): User => {
  const userId = db.sessions[token]
  const user = userId ? db.users.find((item) => item.id === userId) : undefined
  if (!user) throw new Error('Your demo session expired. Please sign in again.')
  return user
}

const findProject = (projectId: string) => {
  const project = db.projects.find((item) => item.id === projectId)
  if (!project) throw new Error('Project was not found')
  return project
}

const statusProgress: Record<ProjectStatus, number> = {
  planned: 12,
  active: 64,
  blocked: 38,
  done: 100,
}

export const fakeBackend = {
  async login(values: { email: string; password: string }): Promise<Session> {
    await delay()

    const user = db.users.find((item) => item.email === values.email)
    if (!user || values.password !== PASSWORD) {
      throw new Error('Use a seeded email with password "password"')
    }

    const token = id('session')
    db.sessions[token] = user.id
    addActivity('auth', `${user.name} signed in`, user.id)
    persist()

    return { token, user: publicUser(user) }
  },

  async register(values: RegisterInput): Promise<Session> {
    await delay(600, 1_100)

    if (db.users.some((item) => item.email === values.email)) {
      throw new Error('A demo user with this email already exists')
    }

    const user: User = {
      id: id('u'),
      name: values.name,
      email: values.email,
      role: values.role,
      title: values.role === 'viewer' ? 'Stakeholder' : 'Project owner',
      avatarColor:
        values.role === 'admin'
          ? 'indigo'
          : values.role === 'manager'
            ? 'teal'
            : 'gray',
    }

    db.users.push(user)
    const token = id('session')
    db.sessions[token] = user.id
    addActivity(
      'auth',
      `${user.name} created a demo workspace account`,
      user.id,
    )
    persist()

    return { token, user: publicUser(user) }
  },

  async getCurrentUser(token: string): Promise<User> {
    await delay(200, 450)
    return publicUser(getUserByToken(token))
  },

  async logout(token: string): Promise<void> {
    await delay(200, 450)
    const userId = db.sessions[token]
    delete db.sessions[token]
    if (userId)
      addActivity('auth', 'A user signed out of the dashboard', userId)
    persist()
  },

  async getDashboard(token: string): Promise<DashboardSummary> {
    getUserByToken(token)
    await delay()

    const activeProjects = db.projects.filter(
      (item) => item.status === 'active',
    )
    const completedProjects = db.projects.filter(
      (item) => item.status === 'done',
    )
    const blockedProjects = db.projects.filter(
      (item) => item.status === 'blocked',
    )
    const budgetInFlight = db.projects
      .filter((item) => item.status !== 'done')
      .reduce((sum, item) => sum + item.budget, 0)
    const averageProgress = Math.round(
      db.projects.reduce((sum, item) => sum + item.progress, 0) /
        db.projects.length,
    )

    return {
      stats: {
        activeProjects: activeProjects.length,
        blockedProjects: blockedProjects.length,
        completedProjects: completedProjects.length,
        budgetInFlight,
        averageProgress,
      },
      projects: clone(
        [...db.projects]
          .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
          .slice(0, 5),
      ),
      activity: clone(db.activity.slice(0, 8)),
      team: db.users.map(publicUser),
    }
  },

  async listProjects(
    token: string,
    query: ProjectListQuery,
  ): Promise<ProjectListResult> {
    getUserByToken(token)
    await delay(450, 950)

    const normalizedQuery = query.q.trim().toLowerCase()
    const filtered = db.projects.filter((project) => {
      const matchesQuery = normalizedQuery
        ? `${project.name} ${project.description} ${project.tags.join(' ')}`
            .toLowerCase()
            .includes(normalizedQuery)
        : true
      const matchesStatus =
        query.status === 'all' || project.status === query.status
      return matchesQuery && matchesStatus
    })

    const total = filtered.length
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const page = Math.min(Math.max(1, query.page), pages)
    const offset = (page - 1) * PAGE_SIZE

    return {
      items: clone(filtered.slice(offset, offset + PAGE_SIZE)),
      total,
      page,
      pages,
    }
  },

  async getProject(token: string, projectId: string): Promise<Project> {
    getUserByToken(token)
    await delay()
    return clone(findProject(projectId))
  },

  async createProject(
    token: string,
    input: ProjectCreateInput,
  ): Promise<Project> {
    const user = getUserByToken(token)
    await delay(700, 1_200)
    maybeFail(0.06, 'The fake backend rejected this project. Try again.')

    const project: Project = {
      id: id('p'),
      name: input.name,
      description: input.description,
      ownerId: user.id,
      status: 'planned',
      priority: input.priority,
      budget: input.budget,
      progress: statusProgress.planned,
      dueDate: isoInDays(30),
      tags: input.tags,
      updatedAt: now(),
    }

    db.projects.unshift(project)
    addActivity(
      'project',
      `${user.name} created ${project.name}`,
      user.id,
      project.id,
    )
    persist()

    return clone(project)
  },

  async updateProjectStatus(
    token: string,
    projectId: string,
    status: ProjectStatus,
  ): Promise<Project> {
    const user = getUserByToken(token)
    await delay(500, 1_000)
    maybeFail(
      0.12,
      'A simulated network error rolled back the optimistic update',
    )

    const project = findProject(projectId)
    project.status = status
    project.progress =
      status === 'active'
        ? Math.max(project.progress, 55)
        : statusProgress[status]
    project.updatedAt = now()
    addActivity(
      'project',
      `${user.name} moved ${project.name} to ${status}`,
      user.id,
      project.id,
    )
    persist()

    return clone(project)
  },

  async saveSettings(
    token: string,
    values: SettingsInput,
  ): Promise<SettingsInput> {
    const user = getUserByToken(token)
    await delay(450, 900)
    addActivity('settings', `${user.name} saved dashboard preferences`, user.id)
    persist()
    return clone(values)
  },

  async updateProfile(
    token: string,
    values: Pick<SettingsInput, 'name' | 'title'>,
  ): Promise<User> {
    const user = getUserByToken(token)
    await delay(350, 800)
    user.name = values.name
    user.title = values.title
    addActivity('settings', `${user.name} updated their profile`, user.id)
    persist()
    return publicUser(user)
  },

  async trackPageView(path: string, userId?: string): Promise<void> {
    await delay(80, 180)
    if (path === '/') return
    addActivity('navigation', `Visited ${path}`, userId)
    persist()
  },
}
