import { SEASON_PALETTES, type SeasonId } from './seasons'

/** Soft, code-authored scenery; all coordinates scale with the viewport. */
export function createLandscape(width: number, height: number, season: SeasonId = 'spring'): HTMLCanvasElement {
  const palette = SEASON_PALETTES[season]
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const c = canvas.getContext('2d')!
  const sx = width / 1280
  const sy = height / 720
  c.scale(sx, sy)
  const sky = c.createLinearGradient(0, 0, 0, 620)
  sky.addColorStop(0, palette.sky[0])
  sky.addColorStop(0.52, palette.sky[1])
  sky.addColorStop(1, palette.sky[2])
  c.fillStyle = sky
  c.fillRect(0, 0, 1280, 720)

  c.save(); c.setTransform(1, 0, 0, 1, 0, 0)
  const sunX = width * .93
  const sunY = height * .15
  const radius = 47 * Math.min(sx, sy)
  const sunlight = c.createRadialGradient(sunX, sunY, radius * .17, sunX, sunY, radius * 2)
  sunlight.addColorStop(0, 'rgba(255,243,160,.78)')
  sunlight.addColorStop(0.55, 'rgba(255,243,160,.3)')
  sunlight.addColorStop(1, 'rgba(255,243,160,0)')
  c.fillStyle = sunlight
  c.fillRect(sunX - radius * 2, sunY - radius * 2, radius * 4, radius * 4)
  c.fillStyle = palette.sun
  c.beginPath(); c.arc(sunX, sunY, radius, 0, Math.PI * 2); c.fill(); c.restore()

  function cloud(x: number, y: number, scale: number) {
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.translate(x * sx, y * sy); c.scale(scale * sx, scale * sx)
    c.fillStyle = 'rgba(255,255,251,.88)'
    c.beginPath()
    c.moveTo(-70, 29)
    c.bezierCurveTo(-107, 29, -108, -3, -79, -13)
    c.bezierCurveTo(-82, -42, -55, -64, -30, -48)
    c.bezierCurveTo(-17, -82, 25, -83, 41, -49)
    c.bezierCurveTo(73, -61, 101, -30, 81, -8)
    c.bezierCurveTo(113, -1, 108, 30, 77, 31)
    c.bezierCurveTo(32, 38, -34, 37, -70, 29)
    c.fill(); c.restore()
  }
  cloud(333, 140, 0.82)
  cloud(816, 142, 1.08)
  cloud(1148, 173, 0.69)

  c.fillStyle = palette.hill
  c.beginPath(); c.moveTo(0, 521)
  c.bezierCurveTo(128, 493, 235, 436, 359, 451)
  c.bezierCurveTo(567, 466, 682, 531, 864, 509)
  c.bezierCurveTo(1049, 489, 1150, 421, 1280, 448)
  c.lineTo(1280, 720); c.lineTo(0, 720); c.fill()
  c.fillStyle = palette.nearHill
  c.beginPath(); c.moveTo(0, 565)
  c.bezierCurveTo(192, 527, 328, 532, 489, 548)
  c.bezierCurveTo(762, 579, 1037, 520, 1280, 533)
  c.lineTo(1280, 720); c.lineTo(0, 720); c.fill()

  const ground = c.createLinearGradient(0, 556, 0, 720)
  ground.addColorStop(0, palette.ground[0])
  ground.addColorStop(0.45, palette.ground[1])
  ground.addColorStop(1, palette.ground[2])
  c.fillStyle = ground
  c.beginPath(); c.moveTo(0, 573)
  c.bezierCurveTo(265, 555, 470, 564, 683, 568)
  c.bezierCurveTo(909, 570, 1109, 553, 1280, 565)
  c.lineTo(1280, 720); c.lineTo(0, 720); c.fill()

  c.strokeStyle = palette.grass; c.lineWidth = 2; c.lineCap = 'round'
  for (let index = 0; index < 35; index += 1) {
    const x = 22 + index * 37
    const y = 574 + Math.sin(index * 3.7) * 13
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y - 6); c.moveTo(x + 1, y); c.lineTo(x + 5, y - 8); c.stroke()
  }

  function bush(x: number, y: number, size: number) {
    const bushScale = Math.max(sx, .6)
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0)
    c.translate(x * sx, y * sy); c.scale(size * bushScale, size * bushScale)
    c.fillStyle = palette.bush
    c.beginPath(); c.moveTo(-79, 0)
    c.bezierCurveTo(-111, -8, -111, -48, -77, -52)
    c.bezierCurveTo(-69, -86, -32, -98, -9, -75)
    c.bezierCurveTo(15, -107, 63, -86, 67, -54)
    c.bezierCurveTo(106, -55, 119, -10, 79, 0)
    c.closePath(); c.fill()
    c.fillStyle = palette.highlight
    c.beginPath(); c.arc(-1, -45, 30, 0, Math.PI * 2); c.fill()
    c.restore()
  }
  bush(102, 697, .72); bush(358, 699, .57); bush(589, 698, .67)
  bush(832, 700, .73); bush(1139, 697, .79)

  function stone(x: number, y: number, width: number, height: number) {
    c.fillStyle = '#a5b4a3'; c.beginPath(); c.ellipse(x, y, width, height, -0.09, Math.PI, Math.PI * 2); c.lineTo(x + width, y + 3); c.quadraticCurveTo(x, y + 8, x - width, y + 3); c.fill()
    c.fillStyle = 'rgba(227,234,215,.36)'; c.beginPath(); c.ellipse(x - width * .2, y - height * .45, width * .45, height * .23, -.12, 0, Math.PI * 2); c.fill()
  }
  stone(184, 711, 29, 15); stone(431, 718, 19, 12); stone(1006, 716, 30, 17)
  return canvas
}
