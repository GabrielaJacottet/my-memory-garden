import Phaser from 'phaser'
import { GardenScene } from './GardenScene'
import { FieldScene } from './FieldScene'
import type { GardenCallbacks, GardenMemory, GardenView } from './types'
import type { SeasonId } from './seasons'

/** React owns memories; this class owns only their living canvas representation. */
export class PhaserGarden {
  private readonly game: Phaser.Game
  private readonly scene: GardenScene | FieldScene
  private readonly observer: ResizeObserver
  private destroyed = false

  constructor(container: HTMLElement, callbacks: GardenCallbacks, view: GardenView = 'side') {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.scene = view === 'top' ? new FieldScene(callbacks, reducedMotion) : new GardenScene(callbacks, reducedMotion)
    this.game = new Phaser.Game({
      type: Phaser.AUTO, parent: container,
      width: Math.max(1, container.clientWidth), height: Math.max(1, container.clientHeight),
      backgroundColor: '#abd8e4', antialias: true, pixelArt: false, roundPixels: false, banner: false,
      scale: { mode: Phaser.Scale.RESIZE }, scene: [this.scene],
      input: { activePointers: 2 },
      callbacks: { postBoot: (game) => {
        game.canvas.setAttribute('role', 'img')
        game.canvas.setAttribute('aria-label', view === 'top'
          ? 'Memory garden seen from above: a meadow of interactive flowers you can drag and zoom.'
          : 'Memory garden with pastel sky, hills and interactive flowers.')
        game.canvas.style.touchAction = 'none'
        game.canvas.dataset.ready ??= 'false'
      } },
    })
    this.observer = new ResizeObserver(([entry]) => {
      if (this.destroyed || !entry) return
      const width = Math.max(1, Math.round(entry.contentRect.width))
      const height = Math.max(1, Math.round(entry.contentRect.height))
      if (width !== this.game.scale.width || height !== this.game.scale.height) this.game.scale.resize(width, height)
    })
    this.observer.observe(container)
  }

  plant(memory: GardenMemory, instant = false): void { this.scene.plant(memory, instant) }
  remove(id: string): void { this.scene.remove(id) }
  setReducedMotion(value: boolean): void { this.scene.setReducedMotion(value) }
  setSeason(value: SeasonId): void { this.scene.setSeason(value) }
  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.observer.disconnect()
    this.game.destroy(true)
  }
}
