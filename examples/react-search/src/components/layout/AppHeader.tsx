import { Group, Title, ActionIcon, useMantineColorScheme, Burger } from '@mantine/core';
import { IconSun, IconMoon, IconBrandGithub } from '@tabler/icons-react';

interface AppHeaderProps {
  opened: boolean;
  toggle: () => void;
}

export function AppHeader({ opened, toggle }: AppHeaderProps) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group>
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        <Title order={3}>GitHub Issues Search</Title>
      </Group>
      
      <Group>
        <ActionIcon
          variant="default"
          onClick={() => toggleColorScheme()}
          title="Toggle color scheme"
        >
          {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
        </ActionIcon>
        
        <ActionIcon
          variant="default"
          component="a"
          href="https://github.com/reatom/reatom"
          target="_blank"
          title="GitHub repository"
        >
          <IconBrandGithub size={18} />
        </ActionIcon>
      </Group>
    </Group>
  );
}
