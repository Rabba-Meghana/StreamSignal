import axios from 'axios'
import { TwitchUser, TwitchStream, TwitchClip, TwitchFollower } from '../types'

const CLIENT_ID = '597lloly8zvjnjxg3rq32u5eveyt9d'
const REDIRECT_URI = 'http://localhost:3000'
const SCOPES = ['user:read:email', 'user:read:follows', 'channel:read:subscriptions', 'moderator:read:followers']

export const getAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    scope: SCOPES.join(' '),
    force_verify: 'false',
  })
  return `https://id.twitch.tv/oauth2/authorize?${params}`
}

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
  const res = await api(token).get(`/users?login=${login}`)
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

export const fetchTopStreamsByGame = async (token: string, gameId: string): Promise<TwitchStream[]> => {
  try {
    const res = await api(token).get(`/streams?game_id=${gameId}&first=20`)
    return res.data.data || []
  } catch {
    return []
  }
}

export const fetchGames = async (token: string, query: string) => {
  try {
    const res = await api(token).get(`/search/categories?query=${encodeURIComponent(query)}&first=5`)
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

export const fetchTopStreams = async (token: string): Promise<TwitchStream[]> => {
  try {
    const res = await api(token).get('/streams?first=20')
    return res.data.data || []
  } catch {
    return []
  }
}

export const searchChannels = async (token: string, query: string) => {
  try {
    const res = await api(token).get(`/search/channels?query=${encodeURIComponent(query)}&first=10&live_only=false`)
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
