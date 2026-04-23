import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import styles from './Landing.module.css'
import { TrendingUp, Zap, BarChart2, Target, Moon, Sun } from 'lucide-react'

const FEATURES = [
  { icon: BarChart2, title: 'Live Analytics', desc: 'Real-time viewer trends, engagement scores, and stream health — all from the Twitch API.' },
  { icon: Target, title: 'Growth Intelligence', desc: 'Personalized recommendations based on your actual data: timing, categories, clip strategy.' },
  { icon: Zap, title: 'Discovery Score', desc: 'See exactly how discoverable you are on Twitch\'s Feed and what\'s holding you back.' },
  { icon: TrendingUp, title: 'Benchmark Engine', desc: 'Compare your channel against streamers at your tier to find your competitive edge.' },
]

export default function Landing() {
  const { login, accessToken, isLoading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    if (accessToken) navigate('/dashboard')
  }, [accessToken, navigate])

  return (
    <div className={styles.page}>
      <div className={styles.bg}>
        <div className={styles.bgOrb1} />
        <div className={styles.bgOrb2} />
        <div className={styles.bgGrid} />
      </div>

      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>
            <TrendingUp size={18} />
          </div>
          <span className={styles.logoText}>StreamSignal</span>
        </div>
        <button className={styles.themeBtn} onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Built for Twitch Community Growth
          </div>

          <h1 className={styles.headline}>
            Stop guessing.<br />
            <span className={styles.headlineAccent}>Start growing.</span>
          </h1>

          <p className={styles.subheadline}>
            StreamSignal connects to the real Twitch API to give you the analytics,
            discovery scores, and actionable intelligence you need to break out of
            the zero-viewer trap.
          </p>

          <div className={styles.cta}>
            <button
              className={styles.ctaBtn}
              onClick={login}
              disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" className={styles.twitchIcon} fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
              </svg>
              {isLoading ? 'Connecting…' : 'Connect with Twitch'}
            </button>
            <p className={styles.ctaNote}>Free • No credit card • Read-only access</p>
          </div>
        </div>

        <div className={styles.features}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Icon size={20} />
              </div>
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureDesc}>{desc}</p>
            </div>
          ))}
        </div>

        <div className={styles.statsBar}>
          {[['240M+', 'Monthly Active Users'], ['7.4M', 'Monthly Streamers'], ['2.55M', 'Avg Concurrent Viewers'], ['38M', 'New Follows via Discovery Feed']].map(([val, label]) => (
            <div key={label} className={styles.stat}>
              <span className={styles.statVal}>{val}</span>
              <span className={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
