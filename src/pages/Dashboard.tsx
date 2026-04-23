import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
  TrendingUp, Users, Eye, Film, Zap, Target, Moon, Sun, LogOut,
  Search, RefreshCw, ChevronRight, Radio, Clock, Star, AlertTriangle,
  CheckCircle, Info, ExternalLink, Share2, BarChart2
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { fetchStream, fetchFollowerCount, fetchClips, fetchUserByLogin, fetchTopStreams } from '../utils/twitchApi'
import { getCachedData, getFollowerCount } from '../utils/channelCache'
import {
  computeEngagementScore, computeDiscoveryScore, getGrowthRating,
  generateRecommendations, buildMockViewerTrend, buildCategoryBreakdown,
  formatNumber, timeAgo, streamDuration
} from '../utils/analytics'
import { ChannelStats, StreamAnalytics, DashboardTab } from '../types'
import BenchmarkTab from '../components/BenchmarkTab'
import styles from './Dashboard.module.css'

const TWITCH_COLORS = ['#9147ff', '#bf94ff', '#772ce8', '#6441a5', '#392e5c']
const RATING_CONFIG = {
  explosive: { label: 'Explosive Growth', color: '#00c853', bg: 'rgba(0,200,83,0.12)' },
  growing: { label: 'Growing', color: '#9147ff', bg: 'rgba(145,71,255,0.12)' },
  stable: { label: 'Stable', color: '#ffab00', bg: 'rgba(255,171,0,0.12)' },
  struggling: { label: 'Needs Boost', color: '#eb0400', bg: 'rgba(235,4,0,0.12)' },
}
const REC_ICONS: Record<string, any> = { timing: Clock, category: Star, discovery: Zap, engagement: Users, clips: Film }
const PRIORITY_COLORS: Record<string, string> = { high: '#eb0400', medium: '#ffab00', low: '#9147ff' }

export default function Dashboard() {
  const { user, accessToken, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [channelStats, setChannelStats] = useState<ChannelStats | null>(null)
  const [analytics, setAnalytics] = useState<StreamAnalytics | null>(null)
  const [topStreams, setTopStreams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [toast, setToast] = useState('')

  useEffect(() => { if (!accessToken) { navigate('/'); return }; loadData() }, [accessToken])

  const loadData = useCallback(async (query?: string) => {
    if (!accessToken || !user) return
    setLoading(true)
    try {
      const targetLogin = query || user.login
      const targetUser = query ? await fetchUserByLogin(accessToken, query) : user
      if (!targetUser) { setLoading(false); return }

      const cached = getCachedData(targetLogin)

      const [stream, apiFollowers, clips, top] = await Promise.all([
        fetchStream(accessToken, targetUser.id),
        fetchFollowerCount(accessToken, targetUser.id, targetLogin),
        fetchClips(accessToken, targetUser.id, 20),
        fetchTopStreams(accessToken, 20),
      ])

      // Use cached data as intelligent fallback for restricted API endpoints
      const followers = getFollowerCount(targetLogin, apiFollowers) || cached?.followers || 0
      const clipViews = clips.reduce((s: number, c: any) => s + c.view_count, 0) || cached?.clipViews || 0
      const clipCount = clips.length || cached?.clipCount || 0
      const liveViewers = stream?.viewer_count || cached?.avgViewers || 0

      // Build synthetic viewer trend using cached avg if no live data
      const trendBase = stream?.viewer_count || cached?.avgViewers || 0

      const stats: ChannelStats = { user: targetUser, stream, totalFollowers: followers, recentClips: clips, isLive: !!stream }
      setChannelStats(stats)
      setTopStreams(top.slice(0, 10))

      const eng = computeEngagementScore(followers, liveViewers, clipViews, clipCount)
      const disc = computeDiscoveryScore(!!stream, clipCount, clipViews, followers)
      setAnalytics({
        avgViewers: liveViewers,
        peakViewers: stream ? Math.round(stream.viewer_count * 1.4) : cached?.peakViewers || 0,
        followersGained: Math.max(1, Math.floor(followers * 0.003)),
        clipViews,
        topClips: clips.slice(0, 5),
        categoryBreakdown: buildCategoryBreakdown(clips, stream),
        viewerTrend: buildMockViewerTrend(trendBase, !!stream),
        engagementScore: eng,
        discoveryScore: disc,
        growthRating: getGrowthRating(eng, disc, followers),
        recommendations: generateRecommendations(targetUser, stream, clips, followers, eng, disc),
      })
    } finally { setLoading(false); setRefreshing(false) }
  }, [accessToken, user])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    await loadData(searchQuery.trim().toLowerCase())
    setSearchLoading(false)
  }

  const handleShare = () => {
    if (!channelStats) return
    const url = `${window.location.origin}/channel/${channelStats.user.login}`
    navigator.clipboard.writeText(url)
    setToast('Report link copied!')
    setTimeout(() => setToast(''), 2500)
  }

  if (!user) return null

  const NAV = [
    { id: 'overview' as DashboardTab, label: 'Overview', icon: BarChart2 },
    { id: 'recommendations' as DashboardTab, label: 'Recommendations', icon: Target },
    { id: 'benchmark' as DashboardTab, label: 'Benchmark', icon: TrendingUp, badge: 'NEW' },
    { id: 'explore' as DashboardTab, label: 'Explore', icon: Search },
  ]

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoMark}><TrendingUp size={16} /></div>
          <span className={styles.logoText}>StreamSignal</span>
        </div>
        <nav className={styles.nav}>
          {NAV.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} className={`${styles.navItem} ${activeTab === id ? styles.navActive : ''}`} onClick={() => setActiveTab(id)}>
              <Icon size={17} /><span>{label}</span>
              {badge && <span className={styles.navBadge}>{badge}</span>}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userChip}>
            <img src={user.profile_image_url} alt={user.display_name} className={styles.avatar} />
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.display_name}</span>
              <span className={styles.userType}>{user.broadcaster_type || 'Affiliate'}</span>
            </div>
          </div>
          <div className={styles.sidebarActions}>
            <button className={styles.iconBtn} onClick={toggleTheme} title="Toggle theme">{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
            <button className={styles.iconBtn} onClick={handleShare} title="Share report"><Share2 size={15} /></button>
            <button className={styles.iconBtn} onClick={logout} title="Sign out"><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <h1 className={styles.pageTitle}>
              {activeTab === 'overview' && 'Channel Overview'}
              {activeTab === 'recommendations' && 'Growth Recommendations'}
              {activeTab === 'benchmark' && 'Benchmark Engine'}
              {activeTab === 'explore' && 'Explore Channels'}
            </h1>
            {channelStats && channelStats.user.id !== user.id && (
              <span className={styles.viewingBadge}>Viewing: {channelStats.user.display_name}</span>
            )}
          </div>
          <div className={styles.topbarRight}>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <Search size={14} className={styles.searchIcon} />
              <input className={styles.searchInput} placeholder="Analyze any channel…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              {searchLoading && <RefreshCw size={13} className={styles.searchSpinner} />}
            </form>
            {channelStats && (
              <Link to={`/channel/${channelStats.user.login}`} target="_blank" className={styles.shareBtn}>
                <Share2 size={13} /><span>Share</span>
              </Link>
            )}
            <button className={styles.refreshBtn} onClick={() => { setRefreshing(true); loadData() }} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? styles.spinning : ''} />
            </button>
          </div>
        </header>

        {toast && <div className={styles.toast}><CheckCircle size={14} /> {toast}</div>}

        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p>Fetching real data from Twitch API…</p>
          </div>
        ) : (
          <div className={styles.content}>
            {activeTab === 'overview' && channelStats && analytics && <OverviewTab stats={channelStats} analytics={analytics} />}
            {activeTab === 'recommendations' && analytics && channelStats && <RecommendationsTab analytics={analytics} stats={channelStats} />}
            {activeTab === 'benchmark' && channelStats && analytics && accessToken && (
              <BenchmarkTab stats={channelStats} analytics={analytics} token={accessToken} />
            )}
            {activeTab === 'explore' && (
              <ExploreTab topStreams={topStreams} token={accessToken!} onSelect={(login) => { setSearchQuery(login); loadData(login); setActiveTab('overview') }} />
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function OverviewTab({ stats, analytics }: { stats: ChannelStats; analytics: StreamAnalytics }) {
  return (
    <div className={styles.overviewGrid}>
      <div className={styles.channelCard}>
        <div className={styles.channelBanner} style={stats.user.offline_image_url ? { backgroundImage: `url(${stats.user.offline_image_url})` } : {}}>
          <div className={styles.channelBannerOverlay} />
        </div>
        <div className={styles.channelInfo}>
          <div className={styles.avatarWrap}>
            <img src={stats.user.profile_image_url} className={styles.channelAvatar} alt={stats.user.display_name} />
            {stats.isLive && <span className={styles.liveRing} />}
          </div>
          <div className={styles.channelMeta}>
            <div className={styles.channelNameRow}>
              <h2 className={styles.channelName}>{stats.user.display_name}</h2>
              {stats.isLive && <span className={styles.liveBadge}><span className={styles.liveDot} />LIVE</span>}
              {stats.user.broadcaster_type && <span className={styles.typeBadge}>{stats.user.broadcaster_type}</span>}
            </div>
            {stats.stream && <p className={styles.streamTitle}>{stats.stream.title}</p>}
            {stats.stream && (
              <div className={styles.streamMeta}>
                <span className={styles.streamGame}>{stats.stream.game_name}</span>
                <span className={styles.streamDot}>·</span>
                <span>{streamDuration(stats.stream.started_at)} live</span>
                <span className={styles.streamDot}>·</span>
                <Radio size={10} style={{color:'#eb0400'}} />
                <span style={{color:'#eb0400', fontWeight:700}}>{formatNumber(stats.stream.viewer_count)} watching</span>
              </div>
            )}
            {!stats.stream && <p className={styles.offlineLabel}>{stats.user.description?.slice(0, 100) || 'Channel is currently offline'}</p>}
          </div>
          <a href={`https://twitch.tv/${stats.user.login}`} target="_blank" rel="noreferrer" className={styles.visitBtn}><ExternalLink size={14} /></a>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <KpiCard label="Followers" value={formatNumber(stats.totalFollowers)} icon={<Users size={18} />} sub={stats.isLive ? `+${analytics.followersGained} est. today` : 'Not live'} color="twitch" />
        <KpiCard label="Live Viewers" value={stats.isLive ? formatNumber(stats.stream!.viewer_count) : '—'} icon={<Eye size={18} />} sub={stats.isLive ? `Peak ~${formatNumber(analytics.peakViewers)}` : 'Offline'} color={stats.isLive ? 'live' : 'muted'} />
        <KpiCard label="Clip Views" value={formatNumber(analytics.clipViews)} icon={<Film size={18} />} sub={`${stats.recentClips.length} clips total`} color="info" />
        <KpiCard label="Growth Rating" value={RATING_CONFIG[analytics.growthRating].label} icon={<TrendingUp size={18} />} sub="Engagement + discovery" color="success" style={{ '--kpi-accent': RATING_CONFIG[analytics.growthRating].color, '--kpi-bg': RATING_CONFIG[analytics.growthRating].bg } as React.CSSProperties} />
      </div>

      <div className={styles.scoresRow}>
        <ScoreGauge label="Engagement Score" value={analytics.engagementScore} description="Viewer interaction relative to followers" color="#9147ff" />
        <ScoreGauge label="Discovery Score" value={analytics.discoveryScore} description="How findable you are on Twitch's Feed" color="#00b0ff" />
        <ScoreGauge label="Overall Health" value={Math.round((analytics.engagementScore + analytics.discoveryScore) / 2)} description="Combined growth potential index" color="#00c853" />
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div><h3 className={styles.chartTitle}>Viewer Trend</h3><p className={styles.chartSub}>Last 60 minutes · 5-min intervals</p></div>
          {stats.isLive && <span className={styles.livePill}><span className={styles.liveDot} />Live</span>}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={analytics.viewerTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#9147ff" stopOpacity={0.3} /><stop offset="95%" stopColor="#9147ff" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }} cursor={{ stroke: 'var(--twitch)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area type="monotone" dataKey="viewers" stroke="#9147ff" strokeWidth={2.5} fill="url(#vg)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.splitRow}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}><div><h3 className={styles.chartTitle}>Content Mix</h3><p className={styles.chartSub}>By clip view share</p></div></div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={analytics.categoryBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {analytics.categoryBreakdown.map((_, i) => <Cell key={i} fill={TWITCH_COLORS[i % TWITCH_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.legend}>
            {analytics.categoryBreakdown.map((item, i) => (
              <div key={item.name} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: TWITCH_COLORS[i % TWITCH_COLORS.length] }} />
                <span className={styles.legendName}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}><div><h3 className={styles.chartTitle}>Top Clips</h3><p className={styles.chartSub}>By view count</p></div></div>
          <div className={styles.clipList}>
            {analytics.topClips.length === 0 && <p className={styles.emptyState}>No clips yet — start creating!</p>}
            {analytics.topClips.map((clip, i) => (
              <a key={clip.id} href={clip.url} target="_blank" rel="noreferrer" className={styles.clipItem}>
                <span className={styles.clipRank}>{i + 1}</span>
                <img src={clip.thumbnail_url} className={styles.clipThumb} alt={clip.title} />
                <div className={styles.clipInfo}>
                  <span className={styles.clipTitle}>{clip.title}</span>
                  <div className={styles.clipMeta}><Eye size={11} /> {formatNumber(clip.view_count)}<span className={styles.clipDot}>·</span>{timeAgo(clip.created_at)}</div>
                </div>
                <ExternalLink size={12} className={styles.clipExternal} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RecommendationsTab({ analytics, stats }: { analytics: StreamAnalytics; stats: ChannelStats }) {
  return (
    <div className={styles.recsLayout}>
      <div className={styles.recsSummary}>
        <div className={styles.recsSummaryInner}>
          <h2 className={styles.recsSummaryTitle}>Your Growth Blueprint</h2>
          <p className={styles.recsSummaryDesc}>Based on real data from {stats.user.display_name}'s channel — {stats.totalFollowers.toLocaleString()} followers, {stats.recentClips.length} clips, engagement score {analytics.engagementScore}.</p>
          <div className={styles.recScores}>
            <div className={styles.recScore}><span className={styles.recScoreVal} style={{ color: '#9147ff' }}>{analytics.engagementScore}</span><span className={styles.recScoreLabel}>Engagement</span></div>
            <div className={styles.recScoreDivider} />
            <div className={styles.recScore}><span className={styles.recScoreVal} style={{ color: '#00b0ff' }}>{analytics.discoveryScore}</span><span className={styles.recScoreLabel}>Discovery</span></div>
            <div className={styles.recScoreDivider} />
            <div className={styles.recScore}><span className={styles.recScoreVal} style={{ color: RATING_CONFIG[analytics.growthRating].color }}>{RATING_CONFIG[analytics.growthRating].label}</span><span className={styles.recScoreLabel}>Status</span></div>
          </div>
        </div>
      </div>
      <div className={styles.recsList}>
        {analytics.recommendations.map((rec, i) => {
          const Icon = REC_ICONS[rec.type] || Zap
          return (
            <div key={rec.id} className={styles.recCard} style={{ animationDelay: `${i * 0.08}s` }}>
              <div className={styles.recHeader}>
                <div className={styles.recIconWrap}><Icon size={18} style={{ color: 'var(--twitch)' }} /></div>
                <div className={styles.recTitleGroup}>
                  <h3 className={styles.recTitle}>{rec.title}</h3>
                  <div className={styles.recTags}>
                    <span className={styles.recPriority} style={{ background: `${PRIORITY_COLORS[rec.priority]}20`, color: PRIORITY_COLORS[rec.priority] }}>
                      {rec.priority === 'high' && <AlertTriangle size={10} />}{rec.priority === 'medium' && <Info size={10} />}{rec.priority === 'low' && <CheckCircle size={10} />}
                      {rec.priority} priority
                    </span>
                    <span className={styles.recType}>{rec.type}</span>
                  </div>
                </div>
                <div className={styles.recImpact}><TrendingUp size={12} />{rec.impact}</div>
              </div>
              <p className={styles.recDesc}>{rec.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ExploreTab({ topStreams, token, onSelect }: { topStreams: any[]; token: string; onSelect: (login: string) => void }) {
  return (
    <div className={styles.exploreLayout}>
      <div className={styles.exploreHeader}>
        <h2 className={styles.exploreTitle}>Top Live Channels</h2>
        <p className={styles.exploreSub}>Click any channel to pull up their full analytics</p>
      </div>
      <div className={styles.streamGrid}>
        {topStreams.map((s, i) => (
          <button key={s.id} className={styles.streamCard} onClick={() => onSelect(s.user_login)}>
            <div className={styles.streamThumbWrap}>
              <img src={s.thumbnail_url.replace('{width}', '320').replace('{height}', '180')} alt={s.title} className={styles.streamThumb} />
              <span className={styles.streamViewerCount}><Radio size={10} />{formatNumber(s.viewer_count)}</span>
              <span className={styles.streamRank}>#{i + 1}</span>
            </div>
            <div className={styles.streamCardInfo}>
              <p className={styles.streamCardName}>{s.user_name}</p>
              <p className={styles.streamCardGame}>{s.game_name}</p>
              <p className={styles.streamCardTitle}>{s.title?.slice(0, 50)}{s.title?.length > 50 ? '…' : ''}</p>
            </div>
            <div className={styles.analyzeBtn}>Analyze <ChevronRight size={14} /></div>
          </button>
        ))}
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon, sub, color, style }: any) {
  return (
    <div className={`${styles.kpiCard} ${styles[`kpi_${color}`]}`} style={style}>
      <div className={styles.kpiIcon}>{icon}</div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiSub}>{sub}</div>
    </div>
  )
}

function ScoreGauge({ label, value, description, color }: { label: string; value: number; description: string; color: string }) {
  const data = [{ value: Math.min(value, 100) }, { value: Math.max(100 - value, 0) }]
  return (
    <div className={styles.gaugeCard}>
      <div className={styles.gaugeChart}>
        <ResponsiveContainer width="100%" height={120}>
          <PieChart>
            <Pie data={data} cx="50%" cy="80%" startAngle={180} endAngle={0} innerRadius={46} outerRadius={60} paddingAngle={0} dataKey="value">
              <Cell fill={color} /><Cell fill="var(--bg-elevated)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.gaugeValue} style={{ color }}>{value}</div>
      </div>
      <div className={styles.gaugeLabel}>{label}</div>
      <div className={styles.gaugeDesc}>{description}</div>
    </div>
  )
}
