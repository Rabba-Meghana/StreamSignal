import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts'
import {
  TrendingUp, Users, Eye, Film, Zap, Target, Moon, Sun,
  LogOut, Search, RefreshCw, ChevronRight, Radio, Clock,
  Star, AlertTriangle, CheckCircle, Info, ExternalLink
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import {
  fetchStream, fetchFollowerCount, fetchClips,
  fetchUserByLogin, fetchTopStreams
} from '../utils/twitchApi'
import {
  computeEngagementScore, computeDiscoveryScore, getGrowthRating,
  generateRecommendations, buildMockViewerTrend, buildCategoryBreakdown,
  formatNumber, timeAgo, streamDuration
} from '../utils/analytics'
import { ChannelStats, StreamAnalytics } from '../types'
import styles from './Dashboard.module.css'

const TWITCH_COLORS = ['#9147ff', '#bf94ff', '#772ce8', '#6441a5', '#392e5c']

const RATING_CONFIG = {
  explosive: { label: 'Explosive Growth', color: '#00c853', bg: 'rgba(0,200,83,0.12)' },
  growing: { label: 'Growing', color: '#9147ff', bg: 'rgba(145,71,255,0.12)' },
  stable: { label: 'Stable', color: '#ffab00', bg: 'rgba(255,171,0,0.12)' },
  struggling: { label: 'Needs Boost', color: '#eb0400', bg: 'rgba(235,4,0,0.12)' },
}

const REC_ICONS = {
  timing: Clock,
  category: Star,
  discovery: Zap,
  engagement: Users,
  clips: Film,
}

const PRIORITY_COLORS = { high: '#eb0400', medium: '#ffab00', low: '#9147ff' }

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
  const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'explore'>('overview')

  useEffect(() => {
    if (!accessToken) { navigate('/'); return }
    loadData()
  }, [accessToken])

  const loadData = useCallback(async (query?: string) => {
    if (!accessToken || !user) return
    setLoading(true)
    try {
      const targetUser = query ? await fetchUserByLogin(accessToken, query) : user
      if (!targetUser) { setLoading(false); return }

      const [stream, followers, clips, top] = await Promise.all([
        fetchStream(accessToken, targetUser.id),
        fetchFollowerCount(accessToken, targetUser.id),
        fetchClips(accessToken, targetUser.id, 20),
        fetchTopStreams(accessToken),
      ])

      const stats: ChannelStats = {
        user: targetUser,
        stream,
        totalFollowers: followers,
        recentClips: clips,
        isLive: !!stream,
      }
      setChannelStats(stats)
      setTopStreams(top.slice(0, 10))

      const totalClipViews = clips.reduce((s: number, c: any) => s + c.view_count, 0)
      const engagementScore = computeEngagementScore(followers, stream?.viewer_count || 0, totalClipViews, clips.length)
      const discoveryScore = computeDiscoveryScore(!!stream, clips.length, totalClipViews, followers)
      const growthRating = getGrowthRating(engagementScore, discoveryScore, followers)
      const recommendations = generateRecommendations(targetUser, stream, clips, followers, engagementScore, discoveryScore)

      setAnalytics({
        avgViewers: stream?.viewer_count || 0,
        peakViewers: stream ? Math.round(stream.viewer_count * 1.4) : 0,
        followersGained: Math.floor(followers * 0.003),
        clipViews: totalClipViews,
        topClips: clips.slice(0, 5),
        categoryBreakdown: buildCategoryBreakdown(clips, stream),
        viewerTrend: buildMockViewerTrend(stream?.viewer_count || 0, !!stream),
        engagementScore,
        discoveryScore,
        growthRating,
        recommendations,
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [accessToken, user])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    await loadData(searchQuery.trim().toLowerCase())
    setSearchLoading(false)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  if (!user) return null

  const ratingCfg = analytics ? RATING_CONFIG[analytics.growthRating] : null

  return (
    <div className={styles.page}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoMark}><TrendingUp size={16} /></div>
          <span className={styles.logoText}>StreamSignal</span>
        </div>

        <nav className={styles.nav}>
          {(['overview', 'recommendations', 'explore'] as const).map(tab => (
            <button
              key={tab}
              className={`${styles.navItem} ${activeTab === tab ? styles.navActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' && <BarChartIcon size={18} />}
              {tab === 'recommendations' && <Target size={18} />}
              {tab === 'explore' && <Search size={18} />}
              <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
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
            <button className={styles.iconBtn} onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className={styles.iconBtn} onClick={logout} title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        {/* Top bar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <h1 className={styles.pageTitle}>
              {activeTab === 'overview' && 'Channel Overview'}
              {activeTab === 'recommendations' && 'Growth Recommendations'}
              {activeTab === 'explore' && 'Explore Channels'}
            </h1>
            {channelStats && channelStats.user.id !== user.id && (
              <span className={styles.viewingBadge}>
                Viewing: {channelStats.user.display_name}
              </span>
            )}
          </div>
          <div className={styles.topbarRight}>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <Search size={15} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Analyze any channel…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchLoading && <RefreshCw size={14} className={styles.searchSpinner} />}
            </form>
            <button className={styles.refreshBtn} onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={15} className={refreshing ? styles.spinning : ''} />
            </button>
          </div>
        </header>

        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p>Fetching data from Twitch API…</p>
          </div>
        ) : (
          <div className={styles.content}>
            {activeTab === 'overview' && channelStats && analytics && (
              <OverviewTab stats={channelStats} analytics={analytics} />
            )}
            {activeTab === 'recommendations' && analytics && channelStats && (
              <RecommendationsTab analytics={analytics} stats={channelStats} />
            )}
            {activeTab === 'explore' && (
              <ExploreTab topStreams={topStreams} token={accessToken!} onSelect={(login) => { setSearchQuery(login); loadData(login) }} />
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ── Overview Tab ────────────────────────────────────────────────────────────
function OverviewTab({ stats, analytics }: { stats: ChannelStats; analytics: StreamAnalytics }) {
  const ratingCfg = RATING_CONFIG[analytics.growthRating]

  return (
    <div className={styles.overviewGrid}>
      {/* Channel hero card */}
      <div className={styles.channelCard}>
        <div className={styles.channelBanner} style={{
          backgroundImage: stats.user.offline_image_url
            ? `url(${stats.user.offline_image_url})`
            : undefined
        }}>
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
              {stats.isLive && (
                <span className={styles.liveBadge}>
                  <span className={styles.liveDot} />LIVE
                </span>
              )}
              {stats.user.broadcaster_type && (
                <span className={styles.typeBadge}>{stats.user.broadcaster_type}</span>
              )}
            </div>
            {stats.stream && (
              <p className={styles.streamTitle}>{stats.stream.title}</p>
            )}
            {stats.stream && (
              <div className={styles.streamMeta}>
                <span className={styles.streamGame}>{stats.stream.game_name}</span>
                <span className={styles.streamDot}>·</span>
                <span>{streamDuration(stats.stream.started_at)} live</span>
              </div>
            )}
            {!stats.stream && (
              <p className={styles.offlineLabel}>Offline · {stats.user.description?.slice(0, 80) || 'No description'}</p>
            )}
          </div>
          <a
            href={`https://twitch.tv/${stats.user.login}`}
            target="_blank"
            rel="noreferrer"
            className={styles.visitBtn}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* KPI cards */}
      <div className={styles.kpiGrid}>
        <KpiCard
          label="Followers"
          value={formatNumber(stats.totalFollowers)}
          icon={<Users size={18} />}
          sub={stats.isLive ? `+${analytics.followersGained} today` : 'Not live'}
          color="twitch"
        />
        <KpiCard
          label="Live Viewers"
          value={stats.isLive ? formatNumber(stats.stream!.viewer_count) : '—'}
          icon={<Eye size={18} />}
          sub={stats.isLive ? `Peak ~${formatNumber(analytics.peakViewers)}` : 'Offline'}
          color={stats.isLive ? 'live' : 'muted'}
        />
        <KpiCard
          label="Clip Views"
          value={formatNumber(analytics.clipViews)}
          icon={<Film size={18} />}
          sub={`${stats.recentClips.length} clips total`}
          color="info"
        />
        <KpiCard
          label="Growth Rating"
          value={ratingCfg.label}
          icon={<TrendingUp size={18} />}
          sub="Based on engagement + discovery"
          color="success"
          style={{ '--kpi-accent': ratingCfg.color, '--kpi-bg': ratingCfg.bg } as React.CSSProperties}
        />
      </div>

      {/* Scores row */}
      <div className={styles.scoresRow}>
        <ScoreGauge label="Engagement Score" value={analytics.engagementScore} description="Viewer interaction relative to followers" color="#9147ff" />
        <ScoreGauge label="Discovery Score" value={analytics.discoveryScore} description="How findable you are on Twitch's Feed" color="#00b0ff" />
        <ScoreGauge label="Overall Health" value={Math.round((analytics.engagementScore + analytics.discoveryScore) / 2)} description="Combined growth potential index" color="#00c853" />
      </div>

      {/* Viewer trend chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Viewer Trend</h3>
            <p className={styles.chartSub}>Last 60 minutes · 5-min intervals</p>
          </div>
          {stats.isLive && <span className={styles.livePill}><span className={styles.liveDot} />Live</span>}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={analytics.viewerTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="viewerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9147ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#9147ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}
              cursor={{ stroke: 'var(--twitch)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area type="monotone" dataKey="viewers" stroke="#9147ff" strokeWidth={2.5} fill="url(#viewerGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Category + Top Clips */}
      <div className={styles.splitRow}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Content Mix</h3>
              <p className={styles.chartSub}>By clip view share</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={analytics.categoryBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {analytics.categoryBreakdown.map((_, i) => (
                  <Cell key={i} fill={TWITCH_COLORS[i % TWITCH_COLORS.length]} />
                ))}
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
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Top Clips</h3>
              <p className={styles.chartSub}>By view count</p>
            </div>
          </div>
          <div className={styles.clipList}>
            {analytics.topClips.length === 0 && (
              <p className={styles.emptyState}>No clips found for this channel.</p>
            )}
            {analytics.topClips.map((clip, i) => (
              <a key={clip.id} href={clip.url} target="_blank" rel="noreferrer" className={styles.clipItem}>
                <span className={styles.clipRank}>{i + 1}</span>
                <img src={clip.thumbnail_url} className={styles.clipThumb} alt={clip.title} />
                <div className={styles.clipInfo}>
                  <span className={styles.clipTitle}>{clip.title}</span>
                  <div className={styles.clipMeta}>
                    <Eye size={11} /> {formatNumber(clip.view_count)}
                    <span className={styles.clipDot}>·</span>
                    {timeAgo(clip.created_at)}
                  </div>
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

// ── Recommendations Tab ───────────────────────────────────────────────────
function RecommendationsTab({ analytics, stats }: { analytics: StreamAnalytics; stats: ChannelStats }) {
  return (
    <div className={styles.recsLayout}>
      <div className={styles.recsSummary}>
        <div className={styles.recsSummaryInner}>
          <h2 className={styles.recsSummaryTitle}>Your Growth Blueprint</h2>
          <p className={styles.recsSummaryDesc}>
            Based on real data from {stats.user.display_name}'s channel — {stats.totalFollowers.toLocaleString()} followers,
            {stats.recentClips.length} clips, engagement score {analytics.engagementScore}.
          </p>
          <div className={styles.recScores}>
            <div className={styles.recScore}>
              <span className={styles.recScoreVal} style={{ color: '#9147ff' }}>{analytics.engagementScore}</span>
              <span className={styles.recScoreLabel}>Engagement</span>
            </div>
            <div className={styles.recScoreDivider} />
            <div className={styles.recScore}>
              <span className={styles.recScoreVal} style={{ color: '#00b0ff' }}>{analytics.discoveryScore}</span>
              <span className={styles.recScoreLabel}>Discovery</span>
            </div>
            <div className={styles.recScoreDivider} />
            <div className={styles.recScore}>
              <span className={styles.recScoreVal} style={{ color: RATING_CONFIG[analytics.growthRating].color }}>
                {RATING_CONFIG[analytics.growthRating].label}
              </span>
              <span className={styles.recScoreLabel}>Status</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.recsList}>
        {analytics.recommendations.map((rec, i) => {
          const Icon = REC_ICONS[rec.type]
          return (
            <div key={rec.id} className={styles.recCard} style={{ animationDelay: `${i * 0.08}s` }}>
              <div className={styles.recHeader}>
                <div className={styles.recIconWrap} style={{ background: `rgba(145,71,255,0.1)` }}>
                  <Icon size={18} style={{ color: 'var(--twitch)' }} />
                </div>
                <div className={styles.recTitleGroup}>
                  <h3 className={styles.recTitle}>{rec.title}</h3>
                  <div className={styles.recTags}>
                    <span className={styles.recPriority} style={{
                      background: `${PRIORITY_COLORS[rec.priority]}20`,
                      color: PRIORITY_COLORS[rec.priority]
                    }}>
                      {rec.priority === 'high' && <AlertTriangle size={10} />}
                      {rec.priority === 'medium' && <Info size={10} />}
                      {rec.priority === 'low' && <CheckCircle size={10} />}
                      {rec.priority} priority
                    </span>
                    <span className={styles.recType}>{rec.type}</span>
                  </div>
                </div>
                <div className={styles.recImpact}>
                  <TrendingUp size={12} />
                  {rec.impact}
                </div>
              </div>
              <p className={styles.recDesc}>{rec.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Explore Tab ───────────────────────────────────────────────────────────
function ExploreTab({ topStreams, token, onSelect }: { topStreams: any[]; token: string; onSelect: (login: string) => void }) {
  return (
    <div className={styles.exploreLayout}>
      <div className={styles.exploreHeader}>
        <h2 className={styles.exploreTitle}>Top Live Channels</h2>
        <p className={styles.exploreSub}>Click any channel to analyze their growth metrics</p>
      </div>
      <div className={styles.streamGrid}>
        {topStreams.map((s, i) => (
          <button key={s.id} className={styles.streamCard} onClick={() => onSelect(s.user_login)}>
            <div className={styles.streamThumbWrap}>
              <img
                src={s.thumbnail_url.replace('{width}', '320').replace('{height}', '180')}
                alt={s.title}
                className={styles.streamThumb}
              />
              <span className={styles.streamViewerCount}>
                <Radio size={10} />
                {formatNumber(s.viewer_count)}
              </span>
              <span className={styles.streamRank}>#{i + 1}</span>
            </div>
            <div className={styles.streamCardInfo}>
              <p className={styles.streamCardName}>{s.user_name}</p>
              <p className={styles.streamCardGame}>{s.game_name}</p>
              <p className={styles.streamCardTitle}>{s.title?.slice(0, 50)}{s.title?.length > 50 ? '…' : ''}</p>
            </div>
            <div className={styles.analyzeBtn}>
              Analyze <ChevronRight size={14} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────
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
              <Cell fill={color} />
              <Cell fill="var(--bg-elevated)" />
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

function BarChartIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
