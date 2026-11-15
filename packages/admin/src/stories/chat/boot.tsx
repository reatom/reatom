import { mount } from '@reatom/jsx'

import { ADMIN_FRAME } from '../../root'
import { registerStoryCleanup } from '../../testing/storybook-runtime'
import { connectLiveAdmin } from '../harness/live'

const storyKey = 'sk-or-v1-admin-story'

export function renderChatStory(
  prepare: () => void | Promise<void>,
): HTMLDivElement {
  const storyRoot = document.createElement('div')
  storyRoot.dataset.testid = 'chat-story-root'
  storyRoot.style.width = '100%'
  storyRoot.style.height = '100vh'

  const ready = (async () => {
    const mock = await import('chat-app/testing/openrouter-mock')
    mock.installOpenRouterMock()
    mock.resetOpenRouterMock()
    registerStoryCleanup(() => {
      mock.resetOpenRouterMock()
      mock.uninstallOpenRouterMock()
    })
    const env = await import('chat-app/testing/env')
    await env.resetBrowserState()
    const keys = await import('chat-app/testing/fixtures/keys')
    const models = await import('chat-app/testing/fixtures/models')
    mock.mockKey(keys.limitedKey)
    mock.mockModels(models.catalogModels)
    const keyStore = await import('chat-app/auth/keyStore')
    keyStore.writeStoredKey(storyKey, false)
    await prepare()
    const { host, appRoot, connection } = connectLiveAdmin()
    // These journeys assert legacy tree expansion and in-progress rows.
    ADMIN_FRAME.run(() => connection.admin.causalEnabled.setFalse())
    appRoot.style.height = '100%'
    appRoot.style.overflow = 'auto'
    storyRoot.append(appRoot, host)
    let unmountApp = () => {}
    registerStoryCleanup(() => {
      try {
        unmountApp()
      } catch {
        appRoot.replaceChildren()
      }
    })
    const bootModule = await import('chat-app/app/boot')
    await bootModule.boot()
    const { App } = await import('chat-app/App')
    unmountApp = mount(appRoot, <App />).unmount
  })()

  void ready
    .then(() => {
      storyRoot.dataset.ready = '1'
    })
    .catch((error: unknown) => {
      storyRoot.dataset.ready = 'error'
      storyRoot.dataset.error =
        error instanceof Error ? error.message : 'boot failed'
    })
  return storyRoot
}
