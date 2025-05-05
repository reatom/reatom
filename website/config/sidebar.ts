import type starlight from '@astrojs/starlight'

type StarlightSidebarConfig = NonNullable<
  Parameters<typeof starlight>[0]['sidebar']
>
type StarlightSidebarEntry = StarlightSidebarConfig[number]
type StarlightManualSidebarGroup = Extract<
  StarlightSidebarEntry,
  { items: any[] }
>
type StarlightAutoSidebarGroup = Extract<
  StarlightSidebarEntry,
  { autogenerate: any }
>

export function group(
  label: string,
  group:
    | Omit<StarlightManualSidebarGroup, 'label'>
    | Omit<StarlightAutoSidebarGroup, 'label'>,
): StarlightManualSidebarGroup | StarlightAutoSidebarGroup {
  return {
    label,
    ...group,
  }
}
