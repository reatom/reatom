import {
  AppShell as MantineAppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Button,
  Divider,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { reatomBoolean, wrap } from '@reatom/core'
import { reatomComponent } from '@reatom/react'
import type { ReactNode } from 'react'

import { currentUserAtom, logoutAction } from '../features/auth/authModel'
import { favoriteProjectsCountAtom } from '../features/projects/projectModel'
import {
  densityAtom,
  sidebarCollapsedAtom,
} from '../features/settings/settingsModel'

type NavItem = {
  label: string
  description: string
  active: boolean
  go: () => unknown
}

export type PrivateAppShellProps = {
  children: ReactNode
  navItems: Array<NavItem>
  onLogout: () => unknown
}

const mobileNavbarOpenedAtom = reatomBoolean(false, 'app.mobileNavbarOpened')

export const PrivateAppShell = reatomComponent(
  ({ children, navItems, onLogout }: PrivateAppShellProps) => {
    const user = currentUserAtom()
    const mobileOpened = mobileNavbarOpenedAtom()
    const desktopCollapsed = sidebarCollapsedAtom()
    const density = densityAtom()
    const favoriteCount = favoriteProjectsCountAtom()
    const logoutStatus = logoutAction.status()
    const padding = density === 'compact' ? 'sm' : 'md'

    return (
      <MantineAppShell
        header={{ height: 64 }}
        navbar={{
          width: 300,
          breakpoint: 'sm',
          collapsed: { mobile: !mobileOpened, desktop: desktopCollapsed },
        }}
        padding={padding}
      >
        <MantineAppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group gap="sm">
              <Burger
                opened={mobileOpened}
                onClick={wrap(() => mobileNavbarOpenedAtom.toggle())}
                hiddenFrom="sm"
                size="sm"
              />
              <Button
                variant="subtle"
                visibleFrom="sm"
                onClick={wrap(() => sidebarCollapsedAtom.toggle())}
              >
                {desktopCollapsed ? 'Show nav' : 'Hide nav'}
              </Button>
              <div>
                <Title order={3}>Reatom Dashboard</Title>
                <Text size="xs" c="dimmed">
                  standalone example
                </Text>
              </div>
            </Group>

            <Group gap="sm">
              <Badge variant="light" color="yellow">
                {favoriteCount} favorites
              </Badge>
              {user && (
                <Group gap="xs">
                  <Avatar color={user.avatarColor} radius="xl" size="sm">
                    {user.name.slice(0, 1)}
                  </Avatar>
                  <Box visibleFrom="sm">
                    <Text size="sm" fw={700} lh={1.1}>
                      {user.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {user.role}
                    </Text>
                  </Box>
                </Group>
              )}
            </Group>
          </Group>
        </MantineAppShell.Header>

        <MantineAppShell.Navbar p="md">
          <MantineAppShell.Section grow component={ScrollArea}>
            <Stack gap="xs">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  label={item.label}
                  description={item.description}
                  active={item.active}
                  onClick={wrap(() => {
                    mobileNavbarOpenedAtom.setFalse()
                    item.go()
                  })}
                />
              ))}
            </Stack>
          </MantineAppShell.Section>

          <MantineAppShell.Section>
            <Divider my="md" />
            <Button
              variant="light"
              color="red"
              fullWidth
              loading={logoutStatus.isPending}
              onClick={onLogout}
            >
              Sign out
            </Button>
          </MantineAppShell.Section>
        </MantineAppShell.Navbar>

        <MantineAppShell.Main>{children}</MantineAppShell.Main>
      </MantineAppShell>
    )
  },
  'PrivateAppShell',
)
