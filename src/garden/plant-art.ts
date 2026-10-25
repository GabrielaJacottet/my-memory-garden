import type Phaser from 'phaser'
import type { EmotionId } from './types'
import type { SeasonId } from './seasons'

export const FLOWER_WIDTH = 176
export const FLOWER_HEIGHT = 300
export const FLOWER_FRAMES = 12
export const GROWTH_DURATION = 3000
export const EMOTIONS: EmotionId[] = ['joy', 'love', 'calm', 'sad', 'growth', 'wonder']

function leaf(c: CanvasRenderingContext2D, x: number, y: number, direction: number, tint: string) {
  c.fillStyle = tint; c.beginPath(); c.moveTo(x, y)
  c.bezierCurveTo(x + direction * 31, y - 3, x + direction * 53, y - 40, x + direction * 44, y - 48)
  c.bezierCurveTo(x + direction * 17, y - 43, x + direction * 5, y - 19, x, y)
  c.fill()
}

export const PLANT_PALETTES = {
  spring: { stem: '#51875c', leaves: ['#69a16c', '#7caf76'], tulips: ['#e7a0b1', '#c9a5ca'], lightTulips: ['#f1b7c2', '#dfbfdc'], daisy: ['#fff7da', '#f5f7ef'], center: '#eac96f', centerLight: '#f3db8c', spikes: ['#9eb5cf', '#b0c4dd', '#afa2c8', '#c4b4da'] },
  summer: { stem: '#43884c', leaves: ['#57a352', '#82bc5c'], tulips: ['#ef7b9b', '#b986d2'], lightTulips: ['#ffa9b9', '#dbafe8'], daisy: ['#fff6b9', '#fffbdc'], center: '#edae42', centerLight: '#ffd576', spikes: ['#739fd1', '#9cc1eb', '#9474c1', '#b197da'] },
  autumn: { stem: '#897343', leaves: ['#b68448', '#d2a15b'], tulips: ['#d28b78', '#b58a9e'], lightTulips: ['#edb797', '#d4b1bd'], daisy: ['#efcf9b', '#f2dfbb'], center: '#bd854d', centerLight: '#dcae6c', spikes: ['#b3a2a0', '#cdbcb1', '#b58f7a', '#d2b198'] },
  winter: { stem: '#789d95', leaves: ['#a2bdb3', '#c3d6c9'], tulips: ['#cab6cf', '#b3b4d0'], lightTulips: ['#ebe0ec', '#dce1ef'], daisy: ['#edf2f7', '#f7fcff'], center: '#bbccca', centerLight: '#dce9e6', spikes: ['#afc3d5', '#dae6ed', '#bfc3d7', '#e1e5f1'] },
}

function flower(c: CanvasRenderingContext2D, emotion: EmotionId, sway: number, season: SeasonId) {
  const palette = PLANT_PALETTES[season]
  const x = 88 + sway
  c.strokeStyle = palette.stem; c.lineWidth = 5; c.lineCap = 'round'
  const tulip = emotion === 'love' || emotion === 'wonder'
  c.beginPath(); c.moveTo(88, 297); c.bezierCurveTo(86, 242, 87 + sway * .3, 148, x, tulip ? 48 : 101); c.stroke()
  leaf(c, 88 + sway * .2, 238, -1, palette.leaves[0])
  leaf(c, 88 + sway * .35, 218, 1, palette.leaves[1])
  if (emotion === 'love' || emotion === 'wonder') {
    c.save(); c.translate(x, 30); c.scale(.45, .5); c.translate(-x, -80)
    c.fillStyle = palette.tulips[emotion === 'love' ? 0 : 1]
    c.beginPath(); c.moveTo(x - 25, 105)
    c.bezierCurveTo(x - 42, 92, x - 39, 53, x - 23, 44)
    c.bezierCurveTo(x - 10, 35, x - 5, 48, x, 54)
    c.bezierCurveTo(x + 7, 35, x + 28, 34, x + 33, 55)
    c.bezierCurveTo(x + 47, 88, x + 27, 119, x, 119)
    c.bezierCurveTo(x - 12, 119, x - 19, 113, x - 25, 105); c.fill()
    c.fillStyle = palette.lightTulips[emotion === 'love' ? 0 : 1]
    c.beginPath(); c.moveTo(x - 18, 49); c.bezierCurveTo(x - 12, 70, x + 1, 75, x + 10, 105)
    c.bezierCurveTo(x - 21, 99, x - 29, 65, x - 18, 49); c.fill()
    c.restore()
  } else if (emotion === 'joy' || emotion === 'calm') {
    for (let index = 0; index < 10; index += 1) {
      c.save(); c.translate(x, 88); c.rotate(index / 10 * Math.PI * 2)
      c.fillStyle = palette.daisy[emotion === 'joy' ? 0 : 1]
      c.beginPath(); c.ellipse(0, -24, 10, 23, 0, 0, Math.PI * 2); c.fill(); c.restore()
    }
    c.fillStyle = palette.center; c.beginPath(); c.arc(x, 88, 18, 0, Math.PI * 2); c.fill()
    c.fillStyle = palette.centerLight; c.beginPath(); c.arc(x - 4, 84, 10, 0, Math.PI * 2); c.fill()
  } else {
    for (let stalk = -1; stalk <= 1; stalk += 1) {
      const px = x + stalk * 21
      c.strokeStyle = palette.stem; c.lineWidth = 3
      c.beginPath(); c.moveTo(88, 244); c.quadraticCurveTo(px + 3, 144, px, 59 + Math.abs(stalk) * 18); c.stroke()
      for (let index = 0; index < 6; index += 1) {
        const py = 65 + index * 13 + Math.abs(stalk) * 17
        const side = index % 2 === 0 ? -1 : 1
        c.fillStyle = palette.spikes[(emotion === 'sad' ? 0 : 2) + index % 2]
        c.beginPath(); c.ellipse(px + side * 7, py, 10, 13, side * .35, 0, Math.PI * 2); c.fill()
      }
    }
  }
  if (season === 'winter') {
    c.strokeStyle = '#f4fbff'; c.lineWidth = 7; c.lineCap = 'round'
    c.beginPath(); c.moveTo(62 + sway * .2, 216); c.quadraticCurveTo(65 + sway * .2, 206, 72 + sway * .2, 204); c.stroke()
    c.beginPath(); c.moveTo(104 + sway * .35, 199); c.quadraticCurveTo(111 + sway * .35, 185, 124 + sway * .35, 178); c.stroke()
    c.lineWidth = tulip ? 6 : 8
    c.beginPath()
    if (tulip) { c.moveTo(x - 12, 18); c.quadraticCurveTo(x - 7, 14, x - 2, 19) }
    else { c.moveTo(x - 13, emotion === 'joy' || emotion === 'calm' ? 51 : 57); c.quadraticCurveTo(x, emotion === 'joy' || emotion === 'calm' ? 44 : 50, x + 13, emotion === 'joy' || emotion === 'calm' ? 51 : 57) }
    c.stroke()
  }
}

export function ensureSeasonPlantArt(scene: Phaser.Scene, season: SeasonId): void {
  for (const emotion of EMOTIONS) {
    const key = `flower-${emotion}-${season}`
    if (scene.textures.exists(key)) continue
    const canvas = document.createElement('canvas'); canvas.width = FLOWER_WIDTH * FLOWER_FRAMES; canvas.height = FLOWER_HEIGHT
    const c = canvas.getContext('2d')!
    for (let frame = 0; frame < FLOWER_FRAMES; frame += 1) {
      c.save(); c.translate(frame * FLOWER_WIDTH, 0)
      flower(c, emotion, Math.sin(frame / FLOWER_FRAMES * Math.PI * 2) * 4, season); c.restore()
    }
    const texture = scene.textures.addCanvas(key, canvas)!
    for (let frame = 0; frame < FLOWER_FRAMES; frame += 1) texture.add(frame, 0, frame * FLOWER_WIDTH, 0, FLOWER_WIDTH, FLOWER_HEIGHT)
    scene.anims.create({ key: `wind-${emotion}-${season}`, frames: Array.from({ length: FLOWER_FRAMES }, (_, frame) => ({ key, frame })), frameRate: 5, repeat: -1 })
  }
}

export function createPlantArt(scene: Phaser.Scene): void {
  ensureSeasonPlantArt(scene, 'spring')
  const texture = (key: string, width: number, height: number, paint: (c: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    paint(canvas.getContext('2d')!); scene.textures.addCanvas(key, canvas)
  }
  texture('seed', 20, 20, (c) => { c.fillStyle = '#bda77b'; c.beginPath(); c.ellipse(10, 11, 5, 8, .5, 0, Math.PI * 2); c.fill() })
  texture('sprout', 70, 80, (c) => {
    c.strokeStyle = '#649969'; c.lineWidth = 4; c.beginPath(); c.moveTo(35, 78); c.quadraticCurveTo(34, 55, 35, 35); c.stroke()
    c.save(); c.translate(-1, 0); leaf(c, 35, 53, -1, '#78ad77'); leaf(c, 35, 48, 1, '#8cbc83'); c.restore()
  })
  texture('petal', 16, 21, (c) => { c.fillStyle = '#f6bed0'; c.beginPath(); c.ellipse(8, 11, 5, 8, .4, 0, Math.PI * 2); c.fill() })
  createButterfly(scene)
}

export function createButterfly(scene: Phaser.Scene): void {
  if (scene.textures.exists('butterfly')) return
  const canvas = document.createElement('canvas'); canvas.width = 50; canvas.height = 36
  const c = canvas.getContext('2d')!
  c.fillStyle = '#ef97b6'
  c.beginPath(); c.ellipse(16, 13, 12, 9, .5, 0, Math.PI * 2); c.ellipse(34, 13, 12, 9, -.5, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#e98ba9'; c.beginPath(); c.ellipse(18, 25, 8, 7, -.5, 0, Math.PI * 2); c.ellipse(32, 25, 8, 7, .5, 0, Math.PI * 2); c.fill()
  c.strokeStyle = '#7a8770'; c.lineWidth = 2; c.beginPath(); c.moveTo(25, 10); c.lineTo(25, 29); c.stroke()
  scene.textures.addCanvas('butterfly', canvas)
}
