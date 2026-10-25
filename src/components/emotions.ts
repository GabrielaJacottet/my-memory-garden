import type { EmotionId } from '../garden/types'

export const EMOTIONS: { id: EmotionId; label: string; icon: string; color: string }[] = [
  { id: 'joy', label: 'Joy', icon: '😄', color: '#e6ba3d' },
  { id: 'love', label: 'Love', icon: '💖', color: '#c93974' },
  { id: 'calm', label: 'Calm', icon: '🍃', color: '#6a9e78' },
  { id: 'sad', label: 'Sad', icon: '💧', color: '#6da0c1' },
  { id: 'growth', label: 'Growth', icon: '🌱', color: '#83a957' },
  { id: 'wonder', label: 'Wonder', icon: '✨', color: '#9b7fc1' },
]
