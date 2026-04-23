import axios from 'axios'
import { TwitchUser, TwitchStream, TwitchClip } from '../types'

export const CLIENT_ID = '597lloly8zvjnjxg3rq32u5eveyt9d'
const REDIRECT_URI = 'http://localhost:3000'

export const parseTokenFromHash = (): string | null => {
  const hash = window.location.hash.substring(1)
  const params = new URLSearchParams(hash)
  return params.get('access_token')
}

const api = (token: string) =>
  axios.create({
    baseURL: 'https://api.twitch.tv/helix',
    headers: {
      Authorization: `Bearer ${token}`,
      'Client-Id': CLIENT_ID,
    },
  })

export const fetchCurrentUser = async (token: string): Promise<TwitchUser> => {
  const res = await api(token).get('/users')
  return res.data.data[0]
}

export const fetchUserByLogin = async (token: string, login: string): Promise<TwitchUser | null> => {
  const res = await api(token).get(`/users?login=${encodeURIComponent(login)}`)
  return res.data.data[0] || null
}

export const fetchUserById = async (token: string, id: string): Promise<TwitchUser | null> => {
  const res = await api(token).get(`/users?id=${id}`)
  return res.data.data[0] || null
}

export const fetchStream = async (token: string, userId: string): Promise<TwitchStream | null> => {
  const res = await api(token).get(`/streams?user_id=${userId}`)
  return res.data.data[0] || null
}

export const fetchFollowerCount = async (token: string, broadcasterId: string): Promise<number> => {
  try {
    const res = await api(token).get(`/channels/followers?broadcaster_id=${broadcasterId}&first=1`)
    return res.data.total || 0
  } catch {
    return 0
  }
}

export const fetchClips = async (token: string, broadcasterId: string, first = 20): Promise<TwitchClip[]> => {
  try {
    const res = await api(token).get(`/clips?broadcaster_id=${broadcasterId}&first=${first}`)
    return res.data.data || []
  } catch {
    return []
  }
}

export const fetchTopStreams = async (token: string, first = 20): Promise<TwitchStream[]> => {
  try {
    const res = await api(token).get(`/streams?first=${first}`)
    return res.data.data || []
  } catch {
    return []
  }
}

export const fetchTopStreamsByGame = async (token: string, gameId: string): Promise<TwitchStream[]> => {
  try {
    const res = await api(token).get(`/streams?game_id=${gameId}&first=100`)
    return res.data.data || []
  } catch {
    return []
  }
}

export const fetchChannelInfo = async (token: string, broadcasterId: string) => {
  try {
    const res = await api(token).get(`/channels?broadcaster_id=${broadcasterId}`)
    return res.data.data[0] || null
  } catch {
    return null
  }
}

export const searchChannels = async (token: string, query: string) => {
  try {
    const res = await api(token).get(
      `/search/channels?query=${encodeURIComponent(query)}&first=10&live_only=false`
    )
    return res.data.data || []
  } catch {
    return []
  }
}

export const validateToken = async (token: string): Promise<boolean> => {
  try {
    const res = await axios.get('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${token}` },
    })
    return !!res.data.client_id
  } catch {
    return false
  }
}

export const fetchUsersByLogins = async (token: string, logins: string[]): Promise<TwitchUser[]> => {
  if (!logins.length) return []
  const query = logins.map(l => `login=${encodeURIComponent(l)}`).join('&')
  try {
    const res = await api(token).get(`/users?${query}`)
    return res.data.data || []
  } catch {
    return []
  }
}

export const fetchStreamsByUserIds = async (token: string, userIds: string[]): Promise<TwitchStream[]> => {
  if (!userIds.length) return []
  const query = userIds.map(id => `user_id=${id}`).join('&')
  try {
    const res = await api(token).get(`/streams?${query}`)
    return res.data.data || []
  } catch {
    return []
  }
}

// Fetch peer streamers in the same game for benchmark
export const fetchPeerStreamers = async (
  token: string,
  gameId: string
): Promise<{ user: TwitchUser; stream: TwitchStream; followers: number }[]> => {
  try {
    const streams = await fetchTopStreamsByGame(token, gameId)
    if (!streams.length) return []
    const sample = streams.slice(0, 6)
    const userIds = sample.map(s => s.user_id)
    const query = userIds.map(id => `id=${id}`).join('&')
    const usersRes = await api(token).get(`/users?${query}`)
    const users: TwitchUser[] = usersRes.data.data || []
    const peers: { user: TwitchUser; stream: TwitchStream; followers: number }[] = []
    await Promise.all(
      sample.map(async (stream) => {
        const user = users.find(u => u.id === stream.user_id)
        if (!user) return
        const followers = await fetchFollowerCount(token, user.id)
        peers.push({ user, stream, followers })
      })
    )
    return peers.sort((a, b) => b.stream.viewer_count - a.stream.viewer_count)
  } catch {
    return []
  }
}

// Get well-known Twitch channels for comparison benchmarking
export const BENCHMARK_LOGINS = ['hasanabi', 'pokimane', 'shroud', 'cohhcarnage', 'lirik']
