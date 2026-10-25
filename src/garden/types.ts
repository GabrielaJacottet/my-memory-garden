export type GardenView = 'side' | 'top'

export type EmotionId ='joy' | 'love' | 'calm' | 'sad' | 'growth' | 'wonder'

export interface GardenMemory {
  id: string
  description: string
  emotion: EmotionId
  importance: number
  createdAt: string
  position: { x: number; y: number }
  /** Shared one memory at a time: visitors only ever see the public ones. */
  isPublic: boolean
}

export interface PlantMemoryInput {
  description: string
  emotion: EmotionId
  importance: number
  isPublic: boolean
}

export interface GardenCallbacks {
  onReady(): void
  onSelect(memory: GardenMemory): void
  onGrowthChange(growing: boolean): void
  onError(message: string): void
}
