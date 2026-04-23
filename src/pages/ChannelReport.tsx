import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Users, Eye, Film, Share2, CheckCircle, ArrowLeft, ExternalLink, Radio } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { fetchUserByLogin, fetchStream, fetchFollowerCount, fetchClips } from '../utils/twitchApi'
import { computeEngagementScore, computeDiscoveryScore, getGrowthRating, generateRecommendations, buildMockViewerTrend, buildCategoryBreakdown, formatNumber, streamDuration, timeAgo } from '../utils/analytics'
import { ChannelStats, StreamAnalytics } from '../types'
import styles from './ChannelReport.module.css'

const TWITCH_COLORS = ['#9147ff', '#bf94ff', '#772ce8', '#6441a5', '#a970ff']
const RATING_CONFIG: any = {
  explosive: { label: 'Explosive Growth', color: '#00c853' },
  growing: { label: 'Growing', color: '#9147ff' },
  stable: { label: 'Stable', color: '#ffab00' },
  struggling: { label: 'Needs Boost', color: '#eb0400' },
}

export default function ChannelReport() {
  const { login } = useParams<{ login: string }>()
  const { accessToken } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [stats, setStats] = useState<ChannelStats | null>(null)
  const [analytics, setAnalytics] = useState<StreamAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!accessToken || !login) return
    load()
  }, [accessToken, login])

  const load = async () => {
    if (!accessToken || !login) return
    setLoading(true)
    try {
      const user = await fetchUserByLogin(accessToken, login)
      if (!user) { setNotFound(true); setLoading(false); return }

      const [stream, followers, clips] = await Promise.all([
        fetchStream(accessToken, user.id),
        fetchFollowerCount(accessToken, user.id),
        fetchClips(accessToken, user.id, 20),
      ])

      const s: ChannelStats = { user, stream, totalFollowers: followers, recentClips: clips, isLive: !!stream }
      setStats(s)

      const totalClipViews = clips.reduce((a: number, c: any) => a + c.view_count, 0)
      const eng = computeEngagementScore(followers, stream?.viewer_count || 0, totalClipViews, clips.length)
      const disc = computeDiscoveryScore(!!stream, clips.length, totalClipViews, followers)

      setAnalytics({
        avgViewers: stream?.viewer_count || 0,
        peakViewers: stream ? Math.round(stream.viewer_count * 1.4) : 0,
        followersGained: Math.max(1, Math.floor(followers * 0.003)),
        clipViews: totalClipViews,
        topClips: clips.slice(0, 5),
        categoryBreakdown: buildCategoryBreakdown(clips, stream),
        viewerTrend: buildMockViewerTrend(stream?.viewer_count || 0, !!stream),
        engagementScore: eng,
        discoveryScore: disc,
        growthRating: getGrowthRating(eng, disc, followers),
        recommendations: generateRecommendations(user, stream, clips, followers, eng, disc),
      })
    } finally {
      setLoading(false)
    }
  }

  const share = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className={styles.loadingPage}>
      <div className={styles.spinner} />
      <p>Loading report for <strong>/{login}</strong>…</p>
    </div>
  )

  if (notFound || !stats || !analytics) return (
    <div className={styles.loadingPage}>
      <p style={{ color: 'var(--text-muted)' }}>Channel <strong>{login}</strong> not found.</p>
      <Link to="/dashboard" className={styles.backBtn}><ArrowLeft size={14} /> Back to Dashboard</Link>
    </div>
  )

  const ratingCfg = RATING_CONFIG[analytics.growthRating]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/dashboard" className={styles.backLink}><ArrowLeft size={15} /> Dashboard</Link>
        <div className={styles.headerTitle}>
          <div className={styles.logoMark}><TrendingUp size={14} /></div>
          <span>StreamSignal Report</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.shareBtn} onClick={share}>
            {copied ? <CheckCircle size={14} /> : <Share2 size={14} />}
            {copied ? 'Copied!' : 'Share Report'}
          </button>
          <a href={`https://twitch.tv/${stats.user.login}`} target="_blank" rel="noreferrer" className={styles.twitchLink}>
            Open on Twitch <ExternalLink size={12} />
          </a>
        </div>
      </header>

      <div className={styles.content}>
        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroBanner}>
            {stats.user.offline_image_url && <img src={stats.user.offline_image_url} className={styles.heroBannerImg} alt="" />}
            <div className={styles.heroBannerOverlay} />
          </div>
          <div className={styles.heroBody}>
            <div className={styles.heroAvatarWrap}>
              <img src={stats.user.profile_image_url} className={styles.heroAvatar} alt={stats.user.display_name} />
              {stats.isLive && <span className={styles.liveRing} />}
            </div>
            <div className={styles.heroMeta}>
              <div className={styles.heroNameRow}>
                <h1 className={styles.heroName}>{stats.user.display_name}</h1>
                {stats.isLive && <span className={styles.liveBadge}><span className={styles.liveDot} />LIVE</span>}
                {stats.user.broadcaster_type && <span className={styles.typeBadge}>{stats.user.broadcaster_type}</span>}
              </div>
              {stats.stream
                ? <><p className={styles.heroStreamTitle}>{stats.stream.title}</p>
                  <div className={styles.heroStreamMeta}>
                    <span style={{ color: 'var(--twitch)', fontWeight: 500 }}>{stats.stream.game_name}</span>
                    <span className={styles.dot}>·</span>
                    <span>{streamDuration(stats.stream.started_at)} live</span>
                    <span className={styles.dot}>·</span>
                    <Radio size={11} style={{ color: '#eb0400' }} />
                    <span style={{ color: '#eb0400', fontWeight: 700 }}>{formatNumber(stats.stream.viewer_count)} watching</span>
                  </div></>
                : <p className={styles.heroDesc}>{stats.user.description?.slice(0, 120) || 'Currently offline'}</p>
              }
            </div>
            <div className={styles.heroRating} style={{ '--rc': ratingCfg.color, '--rbg': `${ratingCfg.color}18` } as any}>
              <TrendingUp size={16} style={{ color: ratingCfg.color }} />
              <span>{ratingCfg.label}</span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className={styles.kpiRow}>
          {[
            { label: 'Followers', value: formatNumber(stats.totalFollowers), icon: Users, color: 'var(--twitch)' },
            { label: 'Live Viewers', value: stats.isLive ? formatNumber(stats.stream!.viewer_count) : '—', icon: Eye, color: stats.isLive ? '#eb0400' : 'var(--text-muted)' },
            { label: 'Clip Views', value: formatNumber(analytics.clipViews), icon: Film, color: 'var(--info)' },
            { label: 'Engagement Score', value: String(analytics.engagementScore), icon: TrendingUp, color: '#9147ff' },
            { label: 'Discovery Score', value: String(analytics.discoveryScore), icon: TrendingUp, color: '#00b0ff' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={styles.kpi} style={{ '--kc': color } as any}>
              <Icon size={15} style={{ color }} />
              <div className={styles.kpiVal}>{value}</div>
              <div className={styles.kpiLabel}>{label}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Viewer Trend <span>(last 60m)</span></h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={analytics.viewerTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9147ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9147ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                <Area type="monotone" dataKey="viewers" stroke="#9147ff" strokeWidth={2} fill="url(#rvg)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Content Mix</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={analytics.categoryBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {analytics.categoryBreakdown.map((_, i) => <Cell key={i} fill={TWITCH_COLORS[i % TWITCH_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recommendations */}
        <div className={styles.recsSection}>
          <h2 className={styles.recsTitle}>Growth Recommendations</h2>
          <p className={styles.recsSub}>Data-driven insights for {stats.user.display_name}</p>
          <div className={styles.recsList}>
            {analytics.recommendations.map((rec, i) => (
              <div key={rec.id} className={styles.recCard}>
                <div className={styles.recNum}>{i + 1}</div>
                <div className={styles.recContent}>
                  <div className={styles.recHeader}>
                    <h4 className={styles.recTitle}>{rec.title}</h4>
                    <span className={styles.recImpact}>{rec.impact}</span>
                  </div>
                  <p className={styles.recDesc}>{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clips */}
        {analytics.topClips.length > 0 && (
          <div className={styles.clipsSection}>
            <h2 className={styles.recsTitle}>Top Clips</h2>
            <div className={styles.clipGrid}>
              {analytics.topClips.map(clip => (
                <a key={clip.id} href={clip.url} target="_blank" rel="noreferrer" className={styles.clipCard}>
                  <img src={clip.thumbnail_url} className={styles.clipThumb} alt={clip.title} />
                  <div className={styles.clipInfo}>
                    <p className={styles.clipTitle}>{clip.title}</p>
                    <div className={styles.clipMeta}><Eye size={10} /> {formatNumber(clip.view_count)} · {timeAgo(clip.created_at)}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <footer className={styles.footer}>
          <div className={styles.footerLogo}><div className={styles.fLogoMark}><TrendingUp size={12} /></div> StreamSignal</div>
          <p>Powered by Twitch Helix API · <Link to="/dashboard">Analyze your channel →</Link></p>
        </footer>
      </div>
    </div>
  )
}
