export interface TwitchUser {
  id: string
  login: string
  display_name: string
  type: string
  broadcaster_type: string
  description: string
  profile_image_url: string
  offline_image_url: string
  view_count: number
  created_at: string
}

export interface TwitchStream {
  id: string
  user_id: string
  user_login: string
  user_name: string
  game_id: string
  game_name: string
  type: string
  title: string
  viewer_count: number
  started_at: string
  language: string
  thumbnail_url: string
  tag_ids: string[]
  tags: string[]
  is_mature: boolean
}

export interface TwitchClip {
  id: string
  url: string
  embed_url: string
  broadcaster_id: string
  broadcaster_name: string
  creator_id: string
  creator_name: string
  video_id: string
  game_id: string
  language: string
  title: string
  view_count: number
  created_at: string
  thumbnail_url: string
  duration: number
  vod_offset: number | null
}

export interface TwitchFollower {
  user_id: string
  user_name: string
  user_login: string
  followed_at: string
}

export interface ChannelStats {
  user: TwitchUser
  stream: TwitchStream | null
  totalFollowers: number
  recentClips: TwitchClip[]
  isLive: boolean
}

export interface StreamAnalytics {
  avgViewers: number
  peakViewers: number
  followersGained: number
  clipViews: number
  topClips: TwitchClip[]
  categoryBreakdown: { name: string; value: number }[]
  viewerTrend: { time: string; viewers: number }[]
  engagementScore: number
  discoveryScore: number
  growthRating: 'explosive' | 'growing' | 'stable' | 'struggling'
  recommendations: Recommendation[]
}

export interface Recommendation {
  id: string
  type: 'timing' | 'category' | 'discovery' | 'engagement' | 'clips'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
}

export interface AuthState {
  accessToken: string | null
  user: TwitchUser | null
  isLoading: boolean
  error: string | null
}

export type DashboardTab = 'overview' | 'recommendations' | 'benchmark' | 'explore'
