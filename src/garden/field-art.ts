import type Phaser from 'phaser'
import type { EmotionId, GardenMemory } from './types'
import { PLANT_PALETTES } from './plant-art'
import { SEASON_PALETTES, type SeasonId } from './seasons'

export const FIELD_TEXTURE = 160
export const FIELD_HIT_RADIUS = 46
const TILE = 512
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const FIELD_SPACING = 56
// The 3/4 camera foreshortens depth, so rows sit closer together than columns.
const FIELD_SQUASH = .6

const PETALS: Record<EmotionId, { main: string; light: string; heart: string }> = {
  joy: { main: '#ffdc6e', light: '#fff1b8', heart: '#e49a35' },
  love: { main: '#ec8fa6', light: '#f8c3cf', heart: '#b05a70' },
  calm: { main: '#f8f6ea', light: '#ffffff', heart: '#eac96f' },
  sad: { main: '#8fb2d6', light: '#bcd1e9', heart: '#6f8fb4' },
  growth: { main: '#a996d4', light: '#cdbfeb', heart: '#7d6bab' },
  wonder: { main: '#d39ad6', light: '#efc8f0', heart: '#8e5b95' },
}

const SEASON_TONE: Record<SeasonId, [string, number]> = {
  spring: ['#ffffff', 0],
  summer: ['#fff0a0', .08],
  autumn: ['#c98a5a', .3],
  winter: ['#eef3f8', .45],
}

/** Golden-angle spiral: the first memory sits at the heart, later ones ring outward without crowding. */
export function fieldSlot(index: number): { x: number; y: number } {
  const radius = FIELD_SPACING * Math.sqrt(index)
  const angle = index * GOLDEN_ANGLE
  return { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius * FIELD_SQUASH) }
}

/** Deterministic randomness, so a memory keeps the same shape in every season. */
export function seededRandom(seed: string): () => number {
  let state = 2166136261
  for (let index = 0; index < seed.length; index += 1) state = Math.imul(state ^ seed.charCodeAt(index), 16777619)
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function mix(color: string, target: string, amount: number): string {
  const a = parseInt(color.slice(1), 16)
  const b = parseInt(target.slice(1), 16)
  const channel = (shift: number) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount)
  return '#' + ((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')
}

function pointedLeaf(c: CanvasRenderingContext2D, angle: number, length: number, width: number, tint: string) {
  c.save(); c.rotate(angle); c.fillStyle = tint
  c.beginPath(); c.moveTo(0, 0)
  c.quadraticCurveTo(length * .5, -width, length, 0)
  c.quadraticCurveTo(length * .5, width, 0, 0); c.fill()
  c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1
  c.beginPath(); c.moveTo(6, 0); c.lineTo(length * .85, 0); c.stroke()
  c.restore()
}

export function fieldFlowerKey(memory: GardenMemory, season: SeasonId): string {
  return `field-${memory.id}-${season}`
}

/** Every memory gets its own flower, seen from above, generated from its id. */
export function ensureFieldFlower(scene: Phaser.Scene, memory: GardenMemory, season: SeasonId): string {
  const key = fieldFlowerKey(memory, season)
  if (scene.textures.exists(key)) return key
  const canvas = document.createElement('canvas'); canvas.width = FIELD_TEXTURE; canvas.height = FIELD_TEXTURE
  const c = canvas.getContext('2d')!
  const rand = seededRandom(memory.id)
  const plant = PLANT_PALETTES[season]
  const [toneColor, toneAmount] = SEASON_TONE[season]
  const tone = (color: string) => mix(color, toneColor, toneAmount)
  const colors = PETALS[memory.emotion]
  const main = tone(colors.main)
  const light = tone(colors.light)
  const heart = tone(colors.heart)
  c.translate(FIELD_TEXTURE / 2, FIELD_TEXTURE / 2)

  const shadow = c.createRadialGradient(5, 8, 6, 5, 8, 66)
  shadow.addColorStop(0, 'rgba(38,58,30,.3)')
  shadow.addColorStop(1, 'rgba(38,58,30,0)')
  c.fillStyle = shadow; c.fillRect(-80, -80, 160, 160)

  const lavender = memory.emotion === 'sad' || memory.emotion === 'growth'
  const leafCount = 4 + Math.floor(rand() * 3)
  const leafTurn = rand() * Math.PI * 2
  for (let index = 0; index < leafCount; index += 1) {
    const angle = leafTurn + index / leafCount * Math.PI * 2 + (rand() - .5) * .4
    pointedLeaf(c, angle, 50 + rand() * 14, lavender ? 4 + rand() * 2 : 9 + rand() * 3, plant.leaves[index % 2])
  }

  const turn = rand() * Math.PI * 2
  if (memory.emotion === 'joy' || memory.emotion === 'calm') {
    const count = 11 + Math.floor(rand() * 6)
    const length = 27 + rand() * 5
    for (let layer = 0; layer < 2; layer += 1) {
      for (let index = 0; index < count; index += 1) {
        c.save(); c.rotate(turn + (index + layer * .5) / count * Math.PI * 2)
        c.fillStyle = layer === 0 ? mix(main, '#8a7a50', .16) : main
        c.beginPath(); c.ellipse(0, -(9 + length / 2), 6.5, length / 2, 0, 0, Math.PI * 2); c.fill()
        if (layer === 1) { c.fillStyle = light; c.beginPath(); c.ellipse(-1.5, -(11 + length / 2), 2.5, length * .36, 0, 0, Math.PI * 2); c.fill() }
        c.restore()
      }
    }
    c.fillStyle = heart; c.beginPath(); c.arc(0, 0, 12, 0, Math.PI * 2); c.fill()
    c.fillStyle = mix(heart, '#6b4a1f', .35)
    for (let index = 1; index < 42; index += 1) {
      const radius = 1.65 * Math.sqrt(index)
      c.beginPath(); c.arc(Math.cos(index * GOLDEN_ANGLE) * radius, Math.sin(index * GOLDEN_ANGLE) * radius, 1.05, 0, Math.PI * 2); c.fill()
    }
  } else if (memory.emotion === 'love' || memory.emotion === 'wonder') {
    const size = 25 + rand() * 4
    for (let layer = 0; layer < 2; layer += 1) {
      const reach = size * (layer === 0 ? 1.2 : .92)
      for (let index = 0; index < 3; index += 1) {
        c.save(); c.rotate(turn + index * Math.PI * 2 / 3 + layer * Math.PI / 3)
        const petal = c.createLinearGradient(0, 0, 0, -reach)
        petal.addColorStop(0, layer === 0 ? mix(main, heart, .35) : main)
        petal.addColorStop(1, layer === 0 ? main : light)
        c.fillStyle = petal
        c.beginPath(); c.moveTo(0, 0)
        c.bezierCurveTo(-reach * .78, -reach * .25, -reach * .66, -reach * .96, 0, -reach)
        c.bezierCurveTo(reach * .66, -reach * .96, reach * .78, -reach * .25, 0, 0); c.fill()
        c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1.2
        c.beginPath(); c.moveTo(0, -5); c.lineTo(0, -reach * .82); c.stroke()
        c.restore()
      }
    }
    c.fillStyle = heart; c.beginPath(); c.arc(0, 0, 6.5, 0, Math.PI * 2); c.fill()
    c.fillStyle = mix(heart, '#2f2420', .45)
    for (let index = 0; index < 6; index += 1) {
      const angle = turn + index / 6 * Math.PI * 2
      c.beginPath(); c.arc(Math.cos(angle) * 5, Math.sin(angle) * 5, 1.9, 0, Math.PI * 2); c.fill()
    }
  } else {
    const stalks = 5 + Math.floor(rand() * 3)
    for (let index = 0; index < stalks; index += 1) {
      const length = 42 + rand() * 14
      const bend = (rand() - .5) * 12
      c.save(); c.rotate(turn + index / stalks * Math.PI * 2 + (rand() - .5) * .3)
      c.strokeStyle = plant.stem; c.lineWidth = 2.4; c.lineCap = 'round'
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(length * .5, bend, length, 0); c.stroke()
      for (let floret = 0; floret < 7; floret += 1) {
        const t = .4 + floret * .09
        const side = floret % 2 === 0 ? -1 : 1
        c.fillStyle = floret % 2 === 0 ? main : light
        c.beginPath(); c.ellipse(length * t, bend * t * (1 - t) * 2 + side * 3.4, 4.4, 3.1, side * .5, 0, Math.PI * 2); c.fill()
      }
      c.restore()
    }
    c.fillStyle = plant.stem; c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fill()
  }

  if (season === 'winter') {
    c.fillStyle = 'rgba(250,253,255,.92)'
    for (let index = 0; index < 3; index += 1) {
      const angle = rand() * Math.PI * 2
      const radius = rand() * 20
      c.beginPath(); c.ellipse(Math.cos(angle) * radius, Math.sin(angle) * radius, 7 + rand() * 5, 4 + rand() * 3, angle, 0, Math.PI * 2); c.fill()
    }
  }
  scene.textures.addCanvas(key, canvas)
  return key
}

/** A seamless meadow tile; the same layout dresses itself differently each season. */
export function ensureFieldGround(scene: Phaser.Scene, season: SeasonId): string {
  const key = `field-ground-${season}`
  if (scene.textures.exists(key)) return key
  const canvas = document.createElement('canvas'); canvas.width = TILE; canvas.height = TILE
  const c = canvas.getContext('2d')!
  const rand = seededRandom('meadow')
  const palette = SEASON_PALETTES[season]
  const tiled = (x: number, y: number, reach: number, paint: (x: number, y: number) => void) => {
    for (const ox of [-TILE, 0, TILE]) for (const oy of [-TILE, 0, TILE]) {
      if (x + ox > -reach && x + ox < TILE + reach && y + oy > -reach && y + oy < TILE + reach) paint(x + ox, y + oy)
    }
  }
  c.fillStyle = palette.ground[1]; c.fillRect(0, 0, TILE, TILE)

  for (let index = 0; index < 70; index += 1) {
    const x = rand() * TILE, y = rand() * TILE, radius = 30 + rand() * 70
    const color = rand() < .5 ? palette.ground[0] : palette.ground[2]
    tiled(x, y, radius, (px, py) => {
      const patch = c.createRadialGradient(px, py, 0, px, py, radius)
      patch.addColorStop(0, color + '55'); patch.addColorStop(1, color + '00')
      c.fillStyle = patch; c.fillRect(px - radius, py - radius, radius * 2, radius * 2)
    })
  }

  c.lineWidth = 1.3; c.lineCap = 'round'; c.globalAlpha = .55
  const blades = [palette.grass, palette.bush, palette.highlight]
  for (let index = 0; index < 1400; index += 1) {
    const x = rand() * TILE, y = rand() * TILE
    const angle = -Math.PI / 2 + (rand() - .5) * .9
    const length = 4 + rand() * 6
    c.strokeStyle = blades[Math.floor(rand() * 3)]
    tiled(x, y, 12, (px, py) => { c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(angle) * length, py + Math.sin(angle) * length); c.stroke() })
  }
  c.globalAlpha = 1

  for (let index = 0; index < 30; index += 1) {
    const x = rand() * TILE, y = rand() * TILE, turn = rand() * Math.PI * 2
    c.fillStyle = rand() < .5 ? palette.highlight : palette.bush
    tiled(x, y, 10, (px, py) => {
      for (let leaf = 0; leaf < 3; leaf += 1) {
        const angle = turn + leaf * Math.PI * 2 / 3
        c.beginPath(); c.arc(px + Math.cos(angle) * 3.4, py + Math.sin(angle) * 3.4, 3.4, 0, Math.PI * 2); c.fill()
      }
    })
  }

  for (let index = 0; index < 14; index += 1) {
    const x = rand() * TILE, y = rand() * TILE, width = 5 + rand() * 7, height = 3 + rand() * 4
    tiled(x, y, 14, (px, py) => {
      c.fillStyle = '#a5b4a3'; c.beginPath(); c.ellipse(px, py, width, height, 0, 0, Math.PI * 2); c.fill()
      c.fillStyle = 'rgba(235,240,225,.45)'; c.beginPath(); c.ellipse(px - width * .25, py - height * .3, width * .4, height * .3, 0, 0, Math.PI * 2); c.fill()
    })
  }

  if (season === 'winter') {
    for (let index = 0; index < 40; index += 1) {
      const x = rand() * TILE, y = rand() * TILE, radius = 10 + rand() * 32
      tiled(x, y, radius, (px, py) => {
        const snow = c.createRadialGradient(px, py, 0, px, py, radius)
        snow.addColorStop(0, 'rgba(252,254,255,.75)'); snow.addColorStop(.7, 'rgba(252,254,255,.45)'); snow.addColorStop(1, 'rgba(252,254,255,0)')
        c.fillStyle = snow; c.fillRect(px - radius, py - radius, radius * 2, radius * 2)
      })
    }
  } else {
    const blossoms = season === 'autumn' ? ['#d98c4a', '#c9653f', '#e8b25a'] : ['#ffffff', '#fff2a8', '#f6c6d6', '#d9cdf2']
    for (let index = 0; index < (season === 'autumn' ? 70 : 55); index += 1) {
      const x = rand() * TILE, y = rand() * TILE, turn = rand() * Math.PI * 2
      const color = blossoms[Math.floor(rand() * blossoms.length)]
      tiled(x, y, 8, (px, py) => {
        c.fillStyle = color
        if (season === 'autumn') { c.beginPath(); c.ellipse(px, py, 4.5, 2.4, turn, 0, Math.PI * 2); c.fill(); return }
        for (let petal = 0; petal < 5; petal += 1) {
          const angle = turn + petal * Math.PI * 2 / 5
          c.beginPath(); c.arc(px + Math.cos(angle) * 2.3, py + Math.sin(angle) * 2.3, 1.8, 0, Math.PI * 2); c.fill()
        }
        c.fillStyle = '#f0c75a'; c.beginPath(); c.arc(px, py, 1.2, 0, Math.PI * 2); c.fill()
      })
    }
  }
  scene.textures.addCanvas(key, canvas)
  return key
}

export function createFieldSprites(scene: Phaser.Scene): void {
  const texture = (key: string, size: number, paint: (c: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size
    paint(canvas.getContext('2d')!); scene.textures.addCanvas(key, canvas)
  }
  texture('field-seed', 24, (c) => {
    c.fillStyle = 'rgba(70,52,30,.25)'; c.beginPath(); c.ellipse(13, 14, 8, 5, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#bda77b'; c.beginPath(); c.ellipse(12, 12, 5, 7, .5, 0, Math.PI * 2); c.fill()
  })
  texture('field-sprout', 64, (c) => {
    c.translate(32, 32)
    pointedLeaf(c, -.4, 26, 8, '#78ad77')
    pointedLeaf(c, Math.PI - .4, 24, 8, '#8cbc83')
    c.fillStyle = '#649969'; c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill()
  })
  texture('cloud-shadow', 256, (c) => {
    for (const [x, y, radius] of [[128, 128, 90], [80, 140, 60], [175, 115, 66], [125, 92, 58]]) {
      const blob = c.createRadialGradient(x, y, 0, x, y, radius)
      blob.addColorStop(0, 'rgba(30,50,40,.5)'); blob.addColorStop(1, 'rgba(30,50,40,0)')
      c.fillStyle = blob; c.fillRect(0, 0, 256, 256)
    }
  })
}
