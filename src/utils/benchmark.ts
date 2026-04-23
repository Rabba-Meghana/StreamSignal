import { TwitchUser, TwitchStream, TwitchClip } from '../types'
import { fetchUsersByLogins, fetchStreamsByUserIds, fetchFollowerCount, fetchClips, BENCHMARK_LOGINS } from './twitchApi'
import { getFollowerCount } from './channelCache'

export interface BenchmarkChannel {
  user: TwitchUser
  stream: TwitchStream | null
  followers: number
  clips: TwitchClip[]
  viewerCount: number
  clipViews: number
  engagementScore: number
  discoveryScore: number
  clipCount: number
  isYou?: boolean
}

export interface BenchmarkResult {
  channels: BenchmarkChannel[]
  yourRank: number
  totalChannels: number
  percentile: number
  metrics: {
    followers: MetricComparison
    engagement: MetricComparison
    discovery: MetricComparison
    clipViews: MetricComparison
  }
}

export interface MetricComparison {
  yours: number
  median: number
  top: number
  percentile: number
  trend: 'above' | 'at' | 'below'
}

const computeScore = (followers: number, viewers: number, clipViews: number, clipCount: number) => {
  const engagement = followers > 0
    ? Math.min(Math.round((viewers / Math.max(followers, 1)) * 100 + (clipViews / Math.max(followers, 1)) * 5 + clipCount * 3), 100)
    : 0
  const discovery = Math.min(Math.round((clipCount / 10) * 30 + (clipViews / Math.max(followers * 2, 1)) * 50), 100)
  return { engagement, discovery }
}

const percentileOf = (value: number, arr: number[]): number => {
  if (!arr.length) return 0
  const below = arr.filter(v => v < value).length
  return Math.round((below / arr.length) * 100)
}

export const buildBenchmark = async (
  token: string,
  yourUser: TwitchUser,
  yourFollowers: number,
  yourStream: TwitchStream | null,
  yourClips: TwitchClip[]
): Promise<BenchmarkResult> => {
  // Fetch benchmark channels
  const benchUsers = await fetchUsersByLogins(token, BENCHMARK_LOGINS)
  const benchIds = benchUsers.map(u => u.id)
  const benchStreams = await fetchStreamsByUserIds(token, benchIds)

  const benchChannels: BenchmarkChannel[] = await Promise.all(
    benchUsers.map(async (user) => {
      const stream = benchStreams.find(s => s.user_id === user.id) || null
      const [apiFollowers, clips] = await Promise.all([
        fetchFollowerCount(token, user.id, user.login),
        fetchClips(token, user.id, 10),
      ])
      const followers = getFollowerCount(user.login, apiFollowers)
      const viewerCount = stream?.viewer_count || 0
      const clipViews = clips.reduce((s, c) => s + c.view_count, 0)
      const { engagement, discovery } = computeScore(followers, viewerCount, clipViews, clips.length)
      return {
        user,
        stream,
        followers,
        clips,
        viewerCount,
        clipViews,
        engagementScore: engagement,
        discoveryScore: discovery,
        clipCount: clips.length,
      }
    })
  )

  // Build your channel entry
  const yourClipViews = yourClips.reduce((s, c) => s + c.view_count, 0)
  const { engagement: yourEngage, discovery: yourDisc } = computeScore(
    yourFollowers, yourStream?.viewer_count || 0, yourClipViews, yourClips.length
  )
  const youChannel: BenchmarkChannel = {
    user: yourUser,
    stream: yourStream,
    followers: yourFollowers,
    clips: yourClips,
    viewerCount: yourStream?.viewer_count || 0,
    clipViews: yourClipViews,
    engagementScore: yourEngage,
    discoveryScore: yourDisc,
    clipCount: yourClips.length,
    isYou: true,
  }

  const allChannels = [...benchChannels, youChannel]
    .sort((a, b) => b.followers - a.followers)

  const yourRank = allChannels.findIndex(c => c.isYou) + 1
  const followerArr = benchChannels.map(c => c.followers)
  const engageArr = benchChannels.map(c => c.engagementScore)
  const discArr = benchChannels.map(c => c.discoveryScore)
  const clipViewArr = benchChannels.map(c => c.clipViews)

  const medianOf = (arr: number[]) => {
    if (!arr.length) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
  }

  return {
    channels: allChannels,
    yourRank,
    totalChannels: allChannels.length,
    percentile: percentileOf(yourFollowers, followerArr),
    metrics: {
      followers: {
        yours: yourFollowers,
        median: medianOf(followerArr),
        top: Math.max(...followerArr),
        percentile: percentileOf(yourFollowers, followerArr),
        trend: yourFollowers >= medianOf(followerArr) ? 'above' : 'below',
      },
      engagement: {
        yours: yourEngage,
        median: medianOf(engageArr),
        top: Math.max(...engageArr),
        percentile: percentileOf(yourEngage, engageArr),
        trend: yourEngage >= medianOf(engageArr) ? 'above' : 'below',
      },
      discovery: {
        yours: yourDisc,
        median: medianOf(discArr),
        top: Math.max(...discArr),
        percentile: percentileOf(yourDisc, discArr),
        trend: yourDisc >= medianOf(discArr) ? 'above' : 'below',
      },
      clipViews: {
        yours: yourClipViews,
        median: medianOf(clipViewArr),
        top: Math.max(...clipViewArr),
        percentile: percentileOf(yourClipViews, clipViewArr),
        trend: yourClipViews >= medianOf(clipViewArr) ? 'above' : 'below',
      },
    },
  }
}
