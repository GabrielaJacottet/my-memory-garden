import Phaser from 'phaser'
import { createSeasonParticle, SEASON_PALETTES, type SeasonId } from './seasons'
import { createPlantArt, ensureSeasonPlantArt, FLOWER_FRAMES, FLOWER_HEIGHT, FLOWER_WIDTH, GROWTH_DURATION } from './plant-art'
import { createFieldSprites, ensureFieldGround } from './field-art'
import type { GardenMemory, GardenCallbacks } from './types'

const FIELD_SIZE = 12000
const MIN_ZOOM = .35
const MAX_ZOOM = 2.2
const TIP_LENGTH = 70

interface Bloom {
  memory: GardenMemory
  sprite: Phaser.GameObjects.Sprite
  shadow: Phaser.GameObjects.Ellipse
  baseScale: number
}
interface Growth {
  bloom: Bloom
  seed: Phaser.GameObjects.Image
  sprout: Phaser.GameObjects.Image
  started: number
}
interface Drifter {
  image: Phaser.GameObjects.Image
  nx: number
  ny: number
  phase: number
  butterfly: boolean
}

/** The same garden in 3/4 view: a meadow seen from above that pans and zooms, with flowers standing on it. */
export class FieldScene extends Phaser.Scene {
  private readonly callbacks: GardenCallbacks
  private readonly blooms = new Map<string, Bloom>()
  private readonly growths = new Map<string, Growth>()
  private readonly drifters: Drifter[] = []
  private readonly shadows: { image: Phaser.GameObjects.Image; x: number; y: number }[] = []
  private readonly pointers = new Map<number, { x: number; y: number }>()
  private overlay!: Phaser.Cameras.Scene2D.Camera
  private ground!: Phaser.GameObjects.TileSprite
  private tip!: Phaser.GameObjects.Container
  private tipBox!: Phaser.GameObjects.Graphics
  private tipText!: Phaser.GameObjects.Text
  private hoveredId = ''
  private pinchSpan = 0
  private reach = 420
  private reducedMotion: boolean
  private ready = false
  private selectedId = ''
  private season: SeasonId = 'spring'

  constructor(callbacks: GardenCallbacks, reducedMotion: boolean) {
    super({ key: 'FieldScene' })
    this.callbacks = callbacks
    this.reducedMotion = reducedMotion
  }

  create(): void {
    createFieldSprites(this)
    createPlantArt(this)
    ensureSeasonPlantArt(this, this.season)
    this.textures.addCanvas('season-leaf', createSeasonParticle(false))
    this.textures.addCanvas('season-snow', createSeasonParticle(true))
    // Particles live on an unzoomed overlay camera; the meadow lives on the main one.
    this.overlay = this.cameras.add(0, 0, this.scale.width, this.scale.height)
    this.ground = this.inWorld(this.add.tileSprite(0, 0, FIELD_SIZE, FIELD_SIZE, ensureFieldGround(this, this.season)).setDepth(0))
    for (let index = 0; index < 3; index += 1) {
      const image = this.inWorld(this.add.image(0, 0, 'cloud-shadow').setDepth(10).setScale(3 + index).setAlpha(.32))
      this.shadows.push({ image, x: index * 900, y: index * 520 })
    }
    for (let index = 0; index < 40; index += 1) {
      const butterfly = index >= 37
      const image = this.onOverlay(this.add.image(0, 0, butterfly ? 'butterfly' : 'season-leaf').setAlpha(butterfly ? .85 : .6))
      image.setScale(butterfly ? .55 : .55 + index % 3 * .12)
      const nx = butterfly ? .18 + (index - 37) * .3 : .02 + (index * .137) % .96
      const ny = butterfly ? .3 + (index % 3) * .18 : .06 + (index * .173) % .9
      image.setPosition(nx * this.scale.width, ny * this.scale.height)
      this.drifters.push({ image, nx, ny, phase: index * 1.7, butterfly })
    }
    this.applySeasonParticles()
    this.tipBox = this.add.graphics()
    this.tipText = this.add.text(0, -15, '', {
      fontFamily: 'Quicksand, sans-serif', fontSize: '14px', color: '#3f4c3c', align: 'center', wordWrap: { width: 210 },
    }).setOrigin(.5, 1)
    this.tip = this.onOverlay(this.add.container(0, 0, [this.tipBox, this.tipText]).setDepth(20).setVisible(false))
    this.cameras.main.setZoom(this.scale.width < 600 ? .85 : 1).centerOn(0, 0)

    this.input.on('pointerdown', this.pointerDown, this)
    this.input.on('pointermove', this.pointerMove, this)
    this.input.on('pointerup', this.pointerUp, this)
    this.input.on('pointerupoutside', this.pointerUp, this)
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
      if (!this.dialogOpen()) this.zoomAt(Math.exp(-dy * .0015), pointer.x, pointer.y)
    })
    this.scale.on('resize', this.publishPlants, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.publishPlants, this))
    this.ready = true
    this.publish()
    this.callbacks.onReady()
  }

  update(time: number): void {
    if (!this.ready) return
    const t = time / 1000
    const w = this.scale.width
    const h = this.scale.height
    if (!this.reducedMotion) {
      for (const drift of this.drifters) {
        const x = drift.nx * w + Math.sin(t * (drift.butterfly ? .25 : .13) + drift.phase) * (drift.butterfly ? 55 : 30)
        const y = drift.butterfly
          ? drift.ny * h + Math.sin(t * .65 + drift.phase) * 19
          : (drift.ny * h + t * 8 + drift.phase * 11) % (h * .98)
        drift.image.setPosition(x, y)
        if (drift.butterfly) drift.image.scaleX = .55 * (.55 + Math.abs(Math.sin(t * 5 + drift.phase)) * .45)
        else drift.image.rotation = Math.sin(t * .5 + drift.phase) * .45
      }
    }
    const camera = this.cameras.main
    const span = Math.max(camera.width, camera.height) / camera.zoom + 1200
    const midX = camera.scrollX + camera.width / 2
    const midY = camera.scrollY + camera.height / 2
    const drift = this.reducedMotion ? 0 : t
    const wrap = (value: number, center: number) => center - span / 2 + Phaser.Math.Wrap(value - (center - span / 2), 0, span)
    for (const shadow of this.shadows) shadow.image.setPosition(wrap(shadow.x + drift * 14, midX), wrap(shadow.y + drift * 6, midY))

    for (const [id, growth] of this.growths) {
      const elapsed = time - growth.started
      const { sprite, shadow, baseScale } = growth.bloom
      if (elapsed < 650) {
        growth.seed.setVisible(true)
        this.game.canvas.dataset.growthStage = 'seed'
      } else if (elapsed < 1400) {
        growth.seed.setVisible(false)
        growth.sprout.setVisible(true).setScale(baseScale * (.7 + Math.min(1, (elapsed - 650) / 500) * .45))
        this.game.canvas.dataset.growthStage = 'sprout'
      } else {
        growth.sprout.setAlpha(Math.max(0, 1 - (elapsed - 1400) / 500))
        const progress = Phaser.Math.Clamp((elapsed - 1400) / 1350, 0, 1)
        const ease = 1 - Math.pow(1 - progress, 3)
        sprite.setVisible(true).setScale(baseScale * (.15 + ease * .85)).setAlpha(Math.min(1, progress * 4))
        shadow.setScale(.15 + ease * .85)
        this.game.canvas.dataset.growthStage = 'growing'
      }
      if (elapsed >= GROWTH_DURATION) this.finishGrowth(id)
    }
    this.updateTip()
    this.publishPlants()
  }

  /** `instant` skips the growth animation, for memories that were already in bloom. */
  plant(memory: GardenMemory, instant = false): void {
    if (!this.ready || this.blooms.has(memory.id)) return
    const { x, y } = memory.position
    const importance = Phaser.Math.Clamp(memory.importance, 1, 5)
    const baseScale = (.85 + importance * .05) * .4
    // Feet on the ground: flowers lower on screen are nearer, so they draw on top.
    const depth = 2 + (y + FIELD_SIZE / 2) / FIELD_SIZE
    const sprite = this.inWorld(this.add.sprite(x, y, `flower-${memory.emotion}-${this.season}`, 0))
      .setOrigin(.5, 1).setDepth(depth).setScale(baseScale)
    const shadow = this.inWorld(this.add.ellipse(x, y, FLOWER_WIDTH * baseScale * .55, FLOWER_WIDTH * baseScale * .2, 0x2c3a24, .22))
      .setDepth(1.5)
    sprite.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(20, 30, FLOWER_WIDTH - 40, FLOWER_HEIGHT - 30),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    })
    let pressedPointerId: number | null = null
    let pressedAt = 0
    sprite.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.wasTouch) this.hoveredId = memory.id
    })
    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.dialogOpen()) return
      pressedPointerId = pointer.id
      pressedAt = this.time.now
    })
    sprite.on('pointerout', () => {
      pressedPointerId = null
      if (this.hoveredId === memory.id) this.hoveredId = ''
    })
    sprite.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const beganOnFlower = pressedPointerId === pointer.id
      pressedPointerId = null
      if (!beganOnFlower || this.time.now - pressedAt > 1500 || pointer.getDistance() > 10 || this.growths.has(memory.id)) return
      this.selectedId = memory.id
      this.publish()
      this.callbacks.onSelect(memory)
    })
    const bloom: Bloom = { memory, sprite, shadow, baseScale }
    this.blooms.set(memory.id, bloom)
    this.reach = Math.max(this.reach, Math.hypot(x, y) + 260)
    const camera = this.cameras.main
    const focusY = y - FLOWER_HEIGHT * baseScale / 2
    if (!this.reducedMotion) sprite.play({ key: `wind-${memory.emotion}-${this.season}`, startFrame: (this.blooms.size * 3) % FLOWER_FRAMES })
    if (this.reducedMotion || instant) {
      if (!instant) camera.centerOn(x, focusY)
      this.publish()
      this.callbacks.onGrowthChange(false)
      return
    }
    camera.pan(x, focusY, 700, 'Sine.easeInOut')
    sprite.setVisible(false)
    shadow.setScale(.15)
    const seed = this.inWorld(this.add.image(x, y, 'seed').setOrigin(.5, 1).setDepth(depth))
    const sprout = this.inWorld(this.add.image(x, y, 'sprout').setOrigin(.5, 1).setDepth(depth).setVisible(false))
    this.growths.set(memory.id, { bloom, seed, sprout, started: this.time.now })
    this.game.canvas.dataset.growthStage = 'seed'
    this.publish()
    this.callbacks.onGrowthChange(true)
  }

  remove(id: string): void {
    const growth = this.growths.get(id)
    growth?.seed.destroy()
    growth?.sprout.destroy()
    this.growths.delete(id)
    const bloom = this.blooms.get(id)
    bloom?.sprite.destroy()
    bloom?.shadow.destroy()
    this.blooms.delete(id)
    if (this.selectedId === id) this.selectedId = ''
    if (this.hoveredId === id) this.hoveredId = ''
    this.publish()
    this.callbacks.onGrowthChange(this.growths.size > 0)
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value
    if (!this.ready) return
    if (value) for (const id of [...this.growths.keys()]) this.finishGrowth(id)
    for (const { memory, sprite } of this.blooms.values()) {
      if (value) sprite.stop().setFrame(0)
      else sprite.play(`wind-${memory.emotion}-${this.season}`)
    }
    this.publish()
  }

  setSeason(season: SeasonId): void {
    this.season = season
    if (!this.ready) return
    ensureSeasonPlantArt(this, season)
    for (const { memory, sprite } of this.blooms.values()) {
      const frame = Number(sprite.frame.name)
      sprite.stop().setTexture(`flower-${memory.emotion}-${season}`, this.reducedMotion ? 0 : frame)
      if (!this.reducedMotion) sprite.play({ key: `wind-${memory.emotion}-${season}`, startFrame: frame })
    }
    this.ground.setTexture(ensureFieldGround(this, season))
    for (const { image } of this.shadows) image.setAlpha(season === 'winter' ? .18 : .32)
    this.applySeasonParticles()
    this.publish()
  }

  private inWorld<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.overlay.ignore(object)
    return object
  }

  private onOverlay<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.cameras.main.ignore(object)
    return object
  }

  private dialogOpen(): boolean {
    return !!document.querySelector('dialog[open]')
  }

  private pointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.dialogOpen()) return
    this.cameras.main.panEffect.reset()
    this.pointers.set(pointer.id, { x: pointer.x, y: pointer.y })
    this.pinchSpan = this.currentPinchSpan()
  }

  private pointerMove(pointer: Phaser.Input.Pointer): void {
    const last = this.pointers.get(pointer.id)
    if (!last || !pointer.isDown) return
    const camera = this.cameras.main
    const dx = pointer.x - last.x
    const dy = pointer.y - last.y
    last.x = pointer.x
    last.y = pointer.y
    if (this.pointers.size >= 2) {
      const span = this.currentPinchSpan()
      const [a, b] = [...this.pointers.values()]
      if (this.pinchSpan > 0 && span > 0) this.zoomAt(span / this.pinchSpan, (a.x + b.x) / 2, (a.y + b.y) / 2)
      this.pinchSpan = span
      return
    }
    camera.scrollX -= dx / camera.zoom
    camera.scrollY -= dy / camera.zoom
    this.clampCamera()
  }

  private pointerUp(pointer: Phaser.Input.Pointer): void {
    this.pointers.delete(pointer.id)
    this.pinchSpan = this.currentPinchSpan()
  }

  private currentPinchSpan(): number {
    if (this.pointers.size < 2) return 0
    const [a, b] = [...this.pointers.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  /** Zooms while keeping the meadow point under the pointer still. */
  private zoomAt(factor: number, screenX: number, screenY: number): void {
    const camera = this.cameras.main
    const zoom = Phaser.Math.Clamp(camera.zoom * factor, MIN_ZOOM, MAX_ZOOM)
    const halfW = camera.width / 2
    const halfH = camera.height / 2
    const worldX = camera.scrollX + halfW + (screenX - halfW) / camera.zoom
    const worldY = camera.scrollY + halfH + (screenY - halfH) / camera.zoom
    camera.setZoom(zoom)
    camera.scrollX = worldX - halfW - (screenX - halfW) / zoom
    camera.scrollY = worldY - halfH - (screenY - halfH) / zoom
    this.clampCamera()
  }

  private clampCamera(): void {
    const camera = this.cameras.main
    const midX = camera.scrollX + camera.width / 2
    const midY = camera.scrollY + camera.height / 2
    const distance = Math.hypot(midX, midY)
    if (distance <= this.reach) return
    const keep = this.reach / distance
    camera.scrollX = midX * keep - camera.width / 2
    camera.scrollY = midY * keep - camera.height / 2
  }

  private applySeasonParticles(): void {
    for (const { image, butterfly } of this.drifters) {
      if (butterfly) image.setVisible(this.season !== 'winter')
      else image.setTexture(this.season === 'winter' ? 'season-snow' : 'season-leaf')
        .setTint(SEASON_PALETTES[this.season].particle)
    }
  }

  private finishGrowth(id: string): void {
    const growth = this.growths.get(id)
    if (!growth) return
    growth.seed.destroy(); growth.sprout.destroy()
    growth.bloom.sprite.setVisible(true).setAlpha(1).setScale(growth.bloom.baseScale)
    growth.bloom.shadow.setScale(1)
    this.growths.delete(id)
    this.publish()
    this.callbacks.onGrowthChange(this.growths.size > 0)
  }

  private publish(): void {
    const canvas = this.game.canvas
    canvas.dataset.ready = String(this.ready)
    canvas.dataset.view = 'top'
    canvas.dataset.season = this.season
    canvas.dataset.plantCount = String(this.blooms.size)
    canvas.dataset.growing = String(this.growths.size > 0)
    canvas.dataset.reducedMotion = String(this.reducedMotion)
    canvas.dataset.selectedPlant = this.selectedId
    if (!this.growths.size) canvas.dataset.growthStage = 'mature'
    this.publishPlants()
  }

  private toScreen(x: number, y: number): { x: number; y: number } {
    const camera = this.cameras.main
    return {
      x: (x - camera.scrollX - camera.width / 2) * camera.zoom + camera.width / 2,
      y: (y - camera.scrollY - camera.height / 2) * camera.zoom + camera.height / 2,
    }
  }

  /** A speech balloon with the start of the memory, above the flower under the mouse. */
  private updateTip(): void {
    const bloom = this.blooms.get(this.hoveredId)
    if (!bloom || this.growths.has(this.hoveredId) || this.pointers.size || this.dialogOpen()) {
      this.tip.setVisible(false)
      return
    }
    const text = bloom.memory.description
    const preview = text.length > TIP_LENGTH ? text.slice(0, TIP_LENGTH).trimEnd() + '…' : text
    if (this.tipText.text !== preview) {
      this.tipText.setText(preview)
      const width = this.tipText.width + 22
      const height = this.tipText.height + 14
      this.tipBox.clear().fillStyle(0xfffaf0, .96).lineStyle(1.5, 0xc9b98f, .8)
        .fillRoundedRect(-width / 2, -height - 8, width, height, 10).strokeRoundedRect(-width / 2, -height - 8, width, height, 10)
        .fillTriangle(-7, -9, 7, -9, 0, 0)
    }
    const top = this.toScreen(bloom.sprite.x, bloom.sprite.y - bloom.sprite.displayHeight * .92)
    const half = this.tipText.width / 2 + 19
    this.tip.setVisible(true).setPosition(Phaser.Math.Clamp(top.x, half, Math.max(half, this.scale.width - half)), Math.max(top.y, this.tipText.height + 30))
  }

  private publishPlants(): void {
    const camera = this.cameras.main
    const canvas = this.game.canvas
    canvas.dataset.zoom = camera.zoom.toFixed(3)
    canvas.dataset.hoveredPlant = this.tip?.visible ? this.hoveredId : ''
    canvas.dataset.plants = JSON.stringify([...this.blooms.values()].map(({ memory, sprite }) => ({
      id: memory.id, emotion: memory.emotion,
      ...this.toScreen(sprite.x, sprite.y - sprite.displayHeight * .55),
      width: sprite.displayWidth * camera.zoom, height: sprite.displayHeight * camera.zoom,
      frame: sprite.frame.name, season: this.season, texture: sprite.texture.key,
    })))
    canvas.dataset.fps = this.game.loop.actualFps.toFixed(1)
  }
}
