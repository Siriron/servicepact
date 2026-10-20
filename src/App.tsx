import { Chip, Notice } from '@/components/Bits'
import { CONTRACT_ADDRESS, STUDIONET } from '@/config/chains'
import { navigate, usePath } from '@/lib/router'
import { short } from '@/lib/format'
import { useWallet } from '@/lib/wallet'
import { DocsPage } from '@/pages/DocsPage'
import { EngagementPage } from '@/pages/EngagementPage'
import { GuidePage } from '@/pages/GuidePage'
import { HomePage } from '@/pages/HomePage'
import { NewPage } from '@/pages/NewPage'

const NAV = [['/', 'Home'], ['/new', 'New'], ['/guide', 'Test guide'], ['/docs', 'Docs']] as const

export default function App() {
  const path = usePath()
  const { account, connect, error } = useWallet()

  let page
  const m = path.match(/^\/engagement\/(.+)$/)
  if (path === '/') page = <HomePage />
  else if (path === '/new') page = <NewPage account={account} />
  else if (path === '/guide') page = <GuidePage account={account} />
  else if (path === '/docs') page = <DocsPage />
  else if (m) page = <EngagementPage key={m[1]} id={decodeURIComponent(m[1])} account={account} />
  else page = (
    <div className="glass card" style={{ textAlign: 'center' }}>
      <h1 style={{ marginTop: 0 }}>Page not found</h1>
      <button className="btn btn-primary" onClick={() => navigate('/')}>Back to start</button>
    </div>
  )

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 16px 48px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '16px 0' }}>
        <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--ink)' }}>
          <img src="/favicon.svg" width={28} height={28} alt="" />
          <strong style={{ fontFamily: 'Space Grotesk', fontSize: 20 }}>ServicePact</strong>
        </a>
        <nav aria-label="Main" style={{ display: 'flex', gap: 14, fontSize: 14 }}>
          {NAV.map(([to, label]) => (
            <a key={to} href={to} onClick={(e) => { e.preventDefault(); navigate(to) }} style={{ color: path === to ? 'var(--accent)' : 'var(--muted)', fontWeight: path === to ? 700 : 500, textDecoration: 'none' }}>{label}</a>
          ))}
        </nav>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Chip v={STUDIONET.name} />
          {account ? <span className="mono" style={{ fontSize: 13 }}>{short(account)}</span> : <button className="btn btn-primary" onClick={() => void connect()}>Connect wallet</button>}
        </div>
      </header>
      {error && <Notice kind="error">{error}</Notice>}
      {!CONTRACT_ADDRESS && <Notice kind="info">Contract not deployed yet.</Notice>}
      <main>{page}</main>
      <footer style={{ marginTop: 32, fontSize: 12, color: 'var(--subtle)' }}>StudioNet is a temporary test network. Payouts are provisional until finalized.</footer>
    </div>
  )
}
