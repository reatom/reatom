import { AppShell as MantineAppShell, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { AppHeader } from './AppHeader';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { FilterPanel } from '../search/FilterPanel';

interface AppShellProps {
  children: React.ReactNode;
}

export function MainAppShell({ children }: AppShellProps) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <MantineAppShell.Header>
        <AppHeader opened={opened} toggle={toggle} />
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">
        <Title order={4} mb="md">Filters</Title>
        <FilterPanel />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}