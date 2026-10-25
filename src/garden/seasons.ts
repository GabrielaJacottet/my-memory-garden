export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter'

export const SEASONS: { id: SeasonId; label: string; icon: string }[] = [
  { id: 'spring', label: 'Spring', icon: '🌿' },
  { id: 'summer', label: 'Summer', icon: '☀️' },
  { id: 'autumn', label: 'Autumn', icon: '🍂' },
  { id: 'winter', label: 'Winter', icon: '❄️' },
]

export const SEASON_PALETTES = {
  spring: { sky: ['#abd8e4', '#cee8d9', '#eaf5bc'], sun: '#fff1a0', hill: '#4f8935', nearHill: '#6cad45', ground: ['#b3d88e', '#a4ca7c', '#7d9f65'], grass: '#8fb56f', bush: '#599d45', highlight: '#76b45f', particle: 0xf6bed0 },
  summer: { sky: ['#91d5ed', '#c4e9da', '#f1efb0'], sun: '#ffe37a', hill: '#4c8d38', nearHill: '#79b84e', ground: ['#c5df87', '#b3d16e', '#8aa65b'], grass: '#91b05c', bush: '#61a346', highlight: '#8ac768', particle: 0xffe9a3 },
  autumn: { sky: ['#c9cbe0', '#ecd5c5', '#fae4b6'], sun: '#ffdc9b', hill: '#ad7549', nearHill: '#c99a57', ground: ['#e3bd7c', '#d2a466', '#a78356'], grass: '#b38b50', bush: '#bd784b', highlight: '#e0a25d', particle: 0xe6a05b },
  winter: { sky: ['#b9cfdf', '#dae5e8', '#eff3e7'], sun: '#fff7d2', hill: '#91a99a', nearHill: '#b0c4ae', ground: ['#e2ede2', '#d4e2d4', '#adc2b1'], grass: '#b3c7b6', bush: '#8eafa1', highlight: '#c4d8ca', particle: 0xffffff },
}

export function createSeasonParticle(snow: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 18
  canvas.height = 18
  const context = canvas.getContext('2d')!
  context.fillStyle = '#fff'
  context.strokeStyle = '#fff'
  if (snow) {
    context.lineWidth = 1.5
    context.lineCap = 'round'
    for (let index = 0; index < 3; index += 1) {
      const angle = index * Math.PI / 3
      context.beginPath()
      context.moveTo(9 - Math.cos(angle) * 6, 9 - Math.sin(angle) * 6)
      context.lineTo(9 + Math.cos(angle) * 6, 9 + Math.sin(angle) * 6)
      context.stroke()
    }
  } else {
    context.beginPath()
    context.ellipse(9, 9, 4, 7, .4, 0, Math.PI * 2)
    context.fill()
  }
  return canvas
}
