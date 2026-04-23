import { useEffect, useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Minus, Users, Eye, Film, Zap, Crown, RefreshCw } from 'lucide-react'
import { BenchmarkResult, buildBenchmark } from '../utils/benchmark'
import { ChannelStats, StreamAnalytics } from '../types'
import { formatNumber } from '../utils/analytics'
import styles from './Benchmark.module.css'

interface Props {
  stats: ChannelStats
  analytics: StreamAnalytics
  token: string
}

export default function BenchmarkTab({ stats, analytics, token }: Props) {
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [stats.user.id])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await buildBenchmark(
        token,
        stats.user,
        stats.totalFollowers,
        stats.stream,
        stats.recentClips
      )
      setResult(r)
    } catch (e) {
      setError('Failed to load benchmark data.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <p>Fetching benchmark data from Twitch API…</p>
      <span>Comparing against top streamers</span>
    </div>
  )

  if (error || !result) return (
    <div className={styles.loading}>
      <p>{error || 'No data available.'}</p>
      <button className={styles.retryBtn} onClick={load}>
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  )

  const radarData = [
    { metric: 'Followers', you: Math.min(result.metrics.followers.percentile, 100), avg: 50 },
    { metric: 'Engagement', you: Math.min(result.metrics.engagement.percentile, 100), avg: 50 },
    { metric: 'Discovery', you: Math.min(result.metrics.discovery.percentile, 100), avg: 50 },
    { metric: 'Clips', you: Math.min(result.metrics.clipViews.percentile, 100), avg: 50 },
    { metric: 'Viewers', you: stats.isLive ? Math.min(Math.round((stats.stream!.viewer_count / 50000) * 100), 100) : 0, avg: 50 },
  ]

  const barData = result.channels.map(c => ({
    name: c.isYou ? '★ You' : c.user.display_name,
    followers: c.followers,
    isYou: c.isYou,
  }))

  return (
    <div className={styles.layout}>
      {/* Hero rank banner */}
      <div className={styles.rankBanner}>
        <div className={styles.rankLeft}>
          <div className={styles.rankBadge}>
            <Crown size={16} />
            <span>#{result.yourRank} of {result.totalChannels}</span>
          </div>
          <h2 className={styles.rankTitle}>
            You're in the <span className={styles.rankHighlight}>
              {result.percentile === 0 ? 'bottom 20%' :
               result.percentile < 30 ? 'bottom third' :
               result.percentile < 60 ? 'middle tier' :
               result.percentile < 80 ? 'top 40%' : 'top tier'}
            </span> of this benchmark group
          </h2>
          <p className={styles.rankSub}>
            Compared against {result.totalChannels - 1} top Twitch streamers across followers, engagement, discovery, and clip performance.
          </p>
        </div>
        <div className={styles.rankMetrics}>
          {Object.entries(result.metrics).map(([key, m]) => (
            <MetricPill key={key} label={key} metric={m} />
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {/* Radar chart */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Performance Radar</h3>
            <p className={styles.cardSub}>Your percentile vs benchmark group (higher = better)</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
              />
              <Radar name="Avg" dataKey="avg" stroke="var(--border)" fill="var(--bg-elevated)" fillOpacity={0.4} />
              <Radar name="You" dataKey="you" stroke="#9147ff" fill="#9147ff" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div className={styles.radarLegend}>
            <span className={styles.legendYou}><span />You</span>
            <span className={styles.legendAvg}><span />Benchmark avg</span>
          </div>
        </div>

        {/* Follower bar chart */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Follower Comparison</h3>
            <p className={styles.cardSub}>Real follower counts from the Twitch API</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => formatNumber(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                formatter={(v: number) => [formatNumber(v), 'Followers']}
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
              />
              <Bar dataKey="followers" radius={[0, 4, 4, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.isYou ? '#9147ff' : 'var(--bg-hover)'} stroke={entry.isYou ? '#9147ff' : 'var(--border)'} strokeWidth={1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Channel comparison table */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Channel-by-Channel Breakdown</h3>
          <p className={styles.cardSub}>Live data pulled from Twitch API</p>
        </div>
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Rank</span>
            <span>Channel</span>
            <span>Status</span>
            <span>Followers</span>
            <span>Live Viewers</span>
            <span>Engagement</span>
            <span>Discovery</span>
          </div>
          {result.channels.map((ch, i) => (
            <div key={ch.user.id} className={`${styles.tableRow} ${ch.isYou ? styles.tableRowYou : ''}`}>
              <span className={styles.tableRank}>
                {i === 0 ? <Crown size={13} style={{ color: '#f0c040' }} /> : `#${i + 1}`}
              </span>
              <div className={styles.tableChannel}>
                <img src={ch.user.profile_image_url} alt={ch.user.display_name} className={styles.tableAvatar} />
                <div>
                  <span className={styles.tableChannelName}>
                    {ch.user.display_name}
                    {ch.isYou && <span className={styles.youTag}>YOU</span>}
                  </span>
                  <span className={styles.tableChannelType}>{ch.user.broadcaster_type || 'affiliate'}</span>
                </div>
              </div>
              <span>
                {ch.stream
                  ? <span className={styles.liveTag}><span className={styles.liveDot} />LIVE</span>
                  : <span className={styles.offlineTag}>Offline</span>
                }
              </span>
              <span className={styles.tableNum}>{formatNumber(ch.followers)}</span>
              <span className={styles.tableNum}>{ch.stream ? formatNumber(ch.viewerCount) : '—'}</span>
              <ScoreBar value={ch.engagementScore} color="#9147ff" />
              <ScoreBar value={ch.discoveryScore} color="#00b0ff" />
            </div>
          ))}
        </div>
      </div>

      {/* Gap analysis */}
      <div className={styles.gapGrid}>
        <GapCard
          title="To reach median followers"
          icon={<Users size={16} />}
          yours={result.metrics.followers.yours}
          target={result.metrics.followers.median}
          unit="followers"
          color="#9147ff"
        />
        <GapCard
          title="Engagement gap to close"
          icon={<Zap size={16} />}
          yours={result.metrics.engagement.yours}
          target={result.metrics.engagement.median}
          unit="points"
          color="#00c853"
        />
        <GapCard
          title="Discovery gap to close"
          icon={<Eye size={16} />}
          yours={result.metrics.discovery.yours}
          target={result.metrics.discovery.median}
          unit="points"
          color="#00b0ff"
        />
        <GapCard
          title="Clip views gap"
          icon={<Film size={16} />}
          yours={result.metrics.clipViews.yours}
          target={result.metrics.clipViews.median}
          unit="views"
          color="#ffab00"
        />
      </div>
    </div>
  )
}

function MetricPill({ label, metric }: { label: string; metric: any }) {
  const Icon = metric.trend === 'above' ? TrendingUp : metric.trend === 'below' ? TrendingDown : Minus
  const color = metric.trend === 'above' ? '#00c853' : metric.trend === 'below' ? '#eb0400' : '#ffab00'
  return (
    <div className={styles.metricPill} style={{ '--pill-color': color } as React.CSSProperties}>
      <Icon size={12} style={{ color }} />
      <span className={styles.metricPillLabel}>{label}</span>
      <span className={styles.metricPillVal} style={{ color }}>{metric.percentile}th %ile</span>
    </div>
  )
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className={styles.scoreBar}>
      <div className={styles.scoreBarFill} style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      <span className={styles.scoreBarVal}>{value}</span>
    </div>
  )
}

function GapCard({ title, icon, yours, target, unit, color }: any) {
  const gap = target - yours
  const isAhead = gap <= 0
  const pct = target > 0 ? Math.min(Math.round((yours / target) * 100), 100) : 100
  return (
    <div className={styles.gapCard}>
      <div className={styles.gapIcon} style={{ background: `${color}18`, color }}>{icon}</div>
      <div className={styles.gapTitle}>{title}</div>
      <div className={styles.gapNumbers}>
        <span className={styles.gapYours} style={{ color }}>{formatNumber(yours)}</span>
        <span className={styles.gapSlash}>/</span>
        <span className={styles.gapTarget}>{formatNumber(target)}</span>
      </div>
      <div className={styles.gapBarOuter}>
        <div className={styles.gapBarInner} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.gapStatus}>
        {isAhead
          ? <span style={{ color: '#00c853' }}>✓ Ahead of median</span>
          : <span style={{ color }}>+{formatNumber(gap)} {unit} to median</span>
        }
      </div>
    </div>
  )
}
