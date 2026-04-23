// Real approximate data for well-known channels — used as fallback when API 
// follower endpoint is restricted. Viewer counts always come from live API.
export interface CachedChannelData {
  followers: number
  avgViewers: number
  peakViewers: number
  clipViews: number
  clipCount: number
  tags: string[]
  schedule: string
  primaryGame: string
}

const CHANNEL_CACHE: Record<string, CachedChannelData> = {
  hasanabi: {
    followers: 3_100_000, avgViewers: 22000, peakViewers: 80000,
    clipViews: 45_000_000, clipCount: 5000, tags: ['Politics', 'Just Chatting', 'Gaming'],
    schedule: 'Daily 12–8PM PT', primaryGame: 'Just Chatting',
  },
  pokimane: {
    followers: 9_400_000, avgViewers: 8000, peakViewers: 60000,
    clipViews: 120_000_000, clipCount: 8000, tags: ['Gaming', 'Just Chatting', 'IRL'],
    schedule: 'Mon–Fri', primaryGame: 'Variety',
  },
  shroud: {
    followers: 11_300_000, avgViewers: 15000, peakViewers: 200000,
    clipViews: 200_000_000, clipCount: 12000, tags: ['FPS', 'Tactical', 'Gaming'],
    schedule: 'Irregular', primaryGame: 'FPS Games',
  },
  lirik: {
    followers: 3_000_000, avgViewers: 10000, peakViewers: 70000,
    clipViews: 80_000_000, clipCount: 9000, tags: ['Variety', 'Gaming'],
    schedule: 'Daily', primaryGame: 'Variety',
  },
  cohhcarnage: {
    followers: 1_700_000, avgViewers: 4000, peakViewers: 20000,
    clipViews: 30_000_000, clipCount: 4000, tags: ['RPG', 'Strategy', 'Gaming'],
    schedule: 'Daily 9AM PT', primaryGame: 'RPG / Strategy',
  },
  xqc: {
    followers: 12_000_000, avgViewers: 60000, peakViewers: 400000,
    clipViews: 500_000_000, clipCount: 20000, tags: ['React', 'Just Chatting', 'Gaming'],
    schedule: 'Daily', primaryGame: 'Just Chatting',
  },
  ninja: {
    followers: 19_000_000, avgViewers: 5000, peakViewers: 635000,
    clipViews: 400_000_000, clipCount: 15000, tags: ['Fortnite', 'Gaming'],
    schedule: 'Weekdays', primaryGame: 'Fortnite',
  },
  timthetatman: {
    followers: 7_500_000, avgViewers: 8000, peakViewers: 100000,
    clipViews: 150_000_000, clipCount: 7000, tags: ['FPS', 'Gaming', 'Variety'],
    schedule: 'Daily', primaryGame: 'Call of Duty',
  },
  summit1g: {
    followers: 6_200_000, avgViewers: 12000, peakViewers: 100000,
    clipViews: 180_000_000, clipCount: 11000, tags: ['CS2', 'FPS', 'Variety'],
    schedule: 'Daily', primaryGame: 'CS2 / Variety',
  },
  illiojuan: {
    followers: 2_800_000, avgViewers: 25000, peakViewers: 90000,
    clipViews: 60_000_000, clipCount: 6000, tags: ['Just Chatting', 'Spanish'],
    schedule: 'Daily', primaryGame: 'Just Chatting',
  },
}

export const getCachedData = (login: string): CachedChannelData | null => {
  return CHANNEL_CACHE[login.toLowerCase()] || null
}

export const getFollowerCount = (login: string, apiCount: number): number => {
  if (apiCount > 0) return apiCount
  return CHANNEL_CACHE[login.toLowerCase()]?.followers || 0
}
