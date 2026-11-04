export type SyncedPlaylistTrack = {
  title: string
  artist: string
  videoId?: string | null
  previewUrl?: string | null
  imageUrl?: string | null
  durationMs?: number | null
  explanation?: string | null
}

export type SyncedPlayerProps = {
  tracks: SyncedPlaylistTrack[]
  activeIndex: number
  onActiveIndexChange: (index: number) => void
  className?: string
}
