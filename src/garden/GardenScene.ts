import Phaser from 'phaser'
import { createLandscape } from './landscape'
import { createSeasonParticle, SEASON_PALETTES, type SeasonId } from './seasons'
import { createPlantArt, ensureSeasonPlantArt, FLOWER_WIDTH, FLOWER_HEIGHT, FLOWER_FRAMES, GROWTH_DURATION } from './plant-art'
import type { GardenMemory, GardenCallbacks } from './types'

interface Flower {
  memory: GardenMemory
  sprite: Phaser.GameObjects.Sprite
  baseScale: number
}
interface Growth {
  flower: Flower
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

export class GardenScene extends Phaser.Scene {
  private readonly callbacks: GardenCallbacks
  private readonly flowers = new Map<string, Flower>()
  private readonly growths = new Map<string, Growth>()
  private readonly drifters: Drifter[] = []
  private background: Phaser.GameObjects.Image | null = null
  private reducedMotion: boolean
  private ready = false
  private selectedId = ''
  private landscapeVersion = 0
  private season: SeasonId = 'spring'

  constructor(callbacks: GardenCallbacks, reducedMotion: boolean) {
    super({ key: 'GardenScene' })
    this.callbacks = callbacks
    this.reducedMotion = reducedMotion
  }

  create(): void {
    createPlantArt(this)
    this.textures.addCanvas('season-leaf', createSeasonParticle(false))
    this.textures.addCanvas('season-snow', createSeasonParticle(true))
    this.redrawLandscape()
    for (let index = 0; index < 60; index += 1) {
      const butterfly = index >= 57
      const image = this.add.image(0, 0, butterfly ? 'butterfly' : 'season-leaf')
        .setDepth(3).setAlpha(butterfly ? .85 : .6)
      image.setScale(butterfly ? .55 : .55 + index % 3 * .12)
      const nx = butterfly ? .18 + (index - 57) * .3 : .02 + (index * .137) % .96
      const ny = butterfly ? .43 + (index % 3) * .1 : .06 + (index * .173) % .9
      image.setPosition(nx * this.scale.width, ny * this.scale.height)
      this.drifters.push({ image, nx, ny, phase: index * 1.7, butterfly })
    }
    this.applySeasonParticles()
    this.scale.on('resize', this.resizeScene, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.resizeScene, this))
    this.ready = true
    this.publish()
    this.callbacks.onReady()
  }

  update(time: number): void {
    if (!this.ready) return
    const w = this.scale.width
    const h = this.scale.height
    if (!this.reducedMotion) {
      for (const drift of this.drifters) {
        const t = time / 1000
        const x = drift.nx * w + Math.sin(t * (drift.butterfly ? .25 : .13) + drift.phase) * (drift.butterfly ? 55 : 30)
        const y = drift.butterfly
          ? drift.ny * h + Math.sin(t * .65 + drift.phase) * 19
          : (drift.ny * h + t * 8 + drift.phase * 11) % (h * .98)
        drift.image.setPosition(x, y)
        if (drift.butterfly) drift.image.scaleX = .55 * (.55 + Math.abs(Math.sin(t * 5 + drift.phase)) * .45)
        else drift.image.rotation = Math.sin(t * .5 + drift.phase) * .45
      }
    }
    for (const [id, growth] of this.growths) {
      const elapsed = time - growth.started
      const { sprite, baseScale } = growth.flower
      const x = growth.flower.memory.position.x * w
      const y = growth.flower.memory.position.y * h
      growth.seed.setPosition(x, y)
      growth.sprout.setPosition(x, y)
      if (elapsed < 650) {
        growth.seed.setVisible(true)
        this.game.canvas.dataset.growthStage = 'seed'
      } else if (elapsed < 1400) {
        growth.seed.setVisible(false)
        growth.sprout.setVisible(true).setScale(.45 + Math.min(1, (elapsed - 650) / 500) * .3)
        this.game.canvas.dataset.growthStage = 'sprout'
      } else {
        growth.sprout.setAlpha(Math.max(0, 1 - (elapsed - 1400) / 500))
        const progress = Phaser.Math.Clamp((elapsed - 1400) / 1350, 0, 1)
        const ease = 1 - Math.pow(1 - progress, 3)
        sprite.setVisible(true).setScale(baseScale * (.15 + ease * .85)).setAlpha(Math.min(1, progress * 4))
        this.game.canvas.dataset.growthStage = 'growing'
      }
      if (elapsed >= GROWTH_DURATION) this.finishGrowth(id)
    }
    this.publishPlants()
  }

  /** `instant` skips the growth animation, for memories that were already in bloom. */
  plant(memory: GardenMemory, instant = false): void {
    if (!this.ready || this.flowers.has(memory.id)) return
    const sprite = this.add.sprite(0, 0, `flower-${memory.emotion}-${this.season}`, 0).setOrigin(.5, 1).setDepth(2)
    // A stable broad shape remains easy to touch through the gaps between petals.
    sprite.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(20, 30, FLOWER_WIDTH - 40, FLOWER_HEIGHT - 30),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    })
    let pressedPointerId: number | null = null
    let pressedAt = 0
    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (document.querySelector('dialog[open]')) return
      pressedPointerId = pointer.id
      pressedAt = this.time.now
    })
    sprite.on('pointerout', () => { pressedPointerId = null })
    sprite.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const beganOnSprite = pressedPointerId === pointer.id
      pressedPointerId = null
      if (!beganOnSprite || this.time.now - pressedAt > 1500 || pointer.getDistance() > 10 || this.growths.has(memory.id)) return
      this.selectedId = memory.id
      this.publish()
      this.callbacks.onSelect(memory)
    })
    const flower: Flower = { memory, sprite, baseScale: 1 }
    this.flowers.set(memory.id, flower)
    this.positionFlower(flower)
    if (!this.reducedMotion) sprite.play({ key: `wind-${memory.emotion}-${this.season}`, startFrame: (this.flowers.size * 3) % FLOWER_FRAMES })
    if (this.reducedMotion || instant) {
      this.publish()
      this.callbacks.onGrowthChange(false)
      return
    }
    sprite.setVisible(false)
    const seed = this.add.image(sprite.x, sprite.y, 'seed').setOrigin(.5, 1).setDepth(2)
    const sprout = this.add.image(sprite.x, sprite.y, 'sprout').setOrigin(.5, 1).setDepth(2).setVisible(false)
    this.growths.set(memory.id, { flower, seed, sprout, started: this.time.now })
    this.game.canvas.dataset.growthStage = 'seed'
    this.publish()
    this.callbacks.onGrowthChange(true)
  }

  remove(id: string): void {
    const growth = this.growths.get(id)
    growth?.seed.destroy()
    growth?.sprout.destroy()
    this.growths.delete(id)
    this.flowers.get(id)?.sprite.destroy()
    this.flowers.delete(id)
    if (this.selectedId === id) this.selectedId = ''
    this.publish()
    this.callbacks.onGrowthChange(this.growths.size > 0)
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value
    if (!this.ready) return
    if (value) for (const id of [...this.growths.keys()]) this.finishGrowth(id)
    for (const { memory, sprite } of this.flowers.values()) {
      if (value) sprite.stop().setFrame(0)
      else sprite.play(`wind-${memory.emotion}-${this.season}`)
    }
    this.publish()
  }

  setSeason(season: SeasonId): void {
    this.season = season
    if (!this.ready) return
    ensureSeasonPlantArt(this, season)
    for (const { memory, sprite } of this.flowers.values()) {
      const frame = Number(sprite.frame.name)
      sprite.stop().setTexture(`flower-${memory.emotion}-${season}`, this.reducedMotion ? 0 : frame)
      if (!this.reducedMotion) sprite.play({ key: `wind-${memory.emotion}-${season}`, startFrame: frame })
    }
    this.redrawLandscape()
    this.applySeasonParticles()
    this.publish()
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
    growth.flower.sprite.setVisible(true).setAlpha(1).setScale(growth.flower.baseScale)
    this.growths.delete(id)
    this.publish()
    this.callbacks.onGrowthChange(this.growths.size > 0)
  }

  private positionFlower(flower: Flower): void {
    const h = this.scale.height
    const importance = Phaser.Math.Clamp(flower.memory.importance, 1, 5)
    const flowerHeight = Math.min(255, Math.max(125, h * .25)) * (.85 + importance * .05)
    flower.baseScale = flowerHeight / FLOWER_HEIGHT
    flower.sprite.setPosition(flower.memory.position.x * this.scale.width, flower.memory.position.y * h)
      .setScale(flower.baseScale)
  }

  private redrawLandscape(): void {
    const key = 'landscape-' + this.landscapeVersion++
    this.textures.addCanvas(key, createLandscape(Math.max(1, this.scale.width), Math.max(1, this.scale.height), this.season))
    if (this.background) {
      const oldKey = this.background.texture.key
      this.background.setTexture(key)
      this.textures.remove(oldKey)
    } else this.background = this.add.image(0, 0, key).setOrigin(0).setDepth(0)
  }

  private resizeScene(): void {
    this.redrawLandscape()
    for (const flower of this.flowers.values()) this.positionFlower(flower)
    this.publishPlants()
  }

  private publish(): void {
    const canvas = this.game.canvas
    canvas.dataset.ready = String(this.ready)
    canvas.dataset.season = this.season
    canvas.dataset.plantCount = String(this.flowers.size)
    canvas.dataset.growing = String(this.growths.size > 0)
    canvas.dataset.reducedMotion = String(this.reducedMotion)
    canvas.dataset.selectedPlant = this.selectedId
    if (!this.growths.size) canvas.dataset.growthStage = 'mature'
    this.publishPlants()
  }

  private publishPlants(): void {
    this.game.canvas.dataset.plants = JSON.stringify([...this.flowers.values()].map(({ memory, sprite }) => ({
      id: memory.id, emotion: memory.emotion, x: sprite.x, y: sprite.y - sprite.displayHeight * .55,
      width: sprite.displayWidth, height: sprite.displayHeight, frame: sprite.frame.name,
      season: this.season, texture: sprite.texture.key,
    })))
    this.game.canvas.dataset.fps = this.game.loop.actualFps.toFixed(1)
  }
}
