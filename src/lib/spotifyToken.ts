const TOKEN_KEY = 'spotifyToken'
const EXPIRES_AT_KEY = 'spotifyTokenExpiresAt'
/** Refresh slightly before Spotify's expiry to avoid mid-request 401s. */
const REFRESH_BUFFER_MS = 60_000

let inflightFetch: Promise<string | null> | null = null

function readCachedToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY)
  const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY))
  if (!token || !expiresAt) return null
  if (Date.now() >= expiresAt - REFRESH_BUFFER_MS) return null
  return token
}

async function fetchAndStoreToken(): Promise<string | null> {
  const response = await fetch('/api/spotify-token')
  const data = await response.json()
  if (!response.ok || !data.access_token) {
    return null
  }

  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600
  localStorage.setItem(TOKEN_KEY, data.access_token)
  localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + expiresIn * 1000))
  return data.access_token
}

/** Returns a valid client-credentials token, refreshing when expired or missing. */
export async function getSpotifyAccessToken(): Promise<string | null> {
  const cached = readCachedToken()
  if (cached) return cached

  if (!inflightFetch) {
    inflightFetch = fetchAndStoreToken().finally(() => {
      inflightFetch = null
    })
  }
  return inflightFetch
}

/** Warm the token cache on app load. */
export function prefetchSpotifyAccessToken(): void {
  void getSpotifyAccessToken()
}
