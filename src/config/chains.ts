// GenLayer StudioNet (chain ID 61999). StudioNet is gasless and temporary: addresses may not survive resets.
export const STUDIONET = {
  id: 61999,
  idHex: '0xF22F',
  name: 'GenLayer StudioNet',
  rpcUrl: 'https://studio.genlayer.com/api',
  explorerBase: 'https://explorer-studio.genlayer.com',
} as const

// Deployed to StudioNet (constructor tx finalized, per the explorer).
export const CONTRACT_ADDRESS: string = '0xDFC205f0AB2D2377A898D84A5360A2Baa661F885'

// Public fixtures used by the in-app test guide (repository + commit that contains evidence/fixtures/*).
export const FIXTURE_REPO: string = 'Siriron/servicepact'
export const FIXTURE_COMMIT: string = 'b9a8247b50f2e911b2779f183cf4de49af3396ea'
export const REPO_URL: string = 'https://github.com/Siriron/servicepact'
