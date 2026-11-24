import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadAppVersion(version: string | undefined) {
  vi.stubEnv('VITE_APP_VERSION', version)
  vi.resetModules()
  return import('./appVersion')
}

describe('appVersion', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('defaults to dev when VITE_APP_VERSION is not set', async () => {
    const { APP_VERSION, APP_VERSION_LABEL } = await loadAppVersion(undefined)

    expect(APP_VERSION).toBe('dev')
    expect(APP_VERSION_LABEL).toBe('dev')
  })

  it('does not repeat the v of a release tag', async () => {
    const { APP_VERSION_LABEL } = await loadAppVersion('v4.0.0')

    expect(APP_VERSION_LABEL).toBe('v4.0.0')
  })

  it('prefixes the injected version with v', async () => {
    const { APP_VERSION, APP_VERSION_LABEL } = await loadAppVersion('4.0.0-alpha1')

    expect(APP_VERSION).toBe('4.0.0-alpha1')
    expect(APP_VERSION_LABEL).toBe('v4.0.0-alpha1')
  })
})
