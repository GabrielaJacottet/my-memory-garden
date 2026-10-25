/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'

interface ProjectedPlant {
  id: string
  x: number
  y: number
  width: number
  height: number
  frame: number | string
  season: string
  texture: string
}

const browserIssues = new WeakMap<Page, string[]>()

async function plants(canvas: Locator): Promise<ProjectedPlant[]> {
  return JSON.parse((await canvas.getAttribute('data-plants')) ?? '[]') as ProjectedPlant[]
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
}

async function openForm(page: Page) {
  await page.getByRole('button', { name: /Plant a Memory/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Plant a new memory', exact: true })).toBeVisible()
  return dialog
}

async function plantMemory(page: Page, description: string, emotion = 'Love') {
  const dialog = await openForm(page)
  await dialog.getByLabel(/What happened\?/i).fill(description)
  await dialog.getByRole('radio', { name: emotion, exact: true }).click()
  await dialog.getByRole('button', { name: /Plant it/i }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('canvas')).toHaveAttribute('data-growing', 'false')
  return page.locator('canvas')
}

async function openPlant(page: Page, isMobile: boolean, index = 0) {
  const canvas = page.locator('canvas')
  await expect.poll(async () => (await plants(canvas)).length).toBeGreaterThan(index)
  const plant = (await plants(canvas))[index]
  if (isMobile) await canvas.tap({ position: { x: plant.x, y: plant.y } })
  else await canvas.click({ position: { x: plant.x, y: plant.y } })
  await expect(page.getByRole('dialog')).toBeVisible()
  return page.getByRole('dialog')
}

test.beforeEach(async ({ page }) => {
  const issues: string[] = []
  browserIssues.set(page, issues)
  page.on('pageerror', (error) => issues.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(message.text())
  })
  page.on('response', (response) => {
    if (response.status() >= 400) issues.push(`${response.status()} ${response.url()}`)
  })
  page.on('requestfailed', (request) => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') issues.push(`${request.failure()?.errorText} ${request.url()}`)
  })
  // The app defaults to Portuguese; these checks are written against the English copy.
  // The side view is what these checks measure; the app now opens in the 3/4 meadow by default.
  await page.addInitScript(() => {
    localStorage.setItem('my-memory-garden:language', 'en')
    localStorage.setItem('my-memory-garden:view', 'side')
  })
  await page.goto('/#/garden')
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true')
})

test.afterEach(async ({ page }) => {
  expect(browserIssues.get(page), 'nenhum erro de JavaScript, console ou recursos de rede').toEqual([])
})

test('começa com jardim vazio, mostra ajuda e cabe na tela sem criar banco de dados', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'My Memory Garden', exact: true })).toBeVisible()
  await expect(page.getByText('0 memories', { exact: true })).toBeVisible()
  await expect(page.locator('.season-badge')).toContainText('Spring')
  await expect(page.locator('canvas')).toHaveAttribute('data-plant-count', '0')
  expect(await plants(page.locator('canvas'))).toEqual([])
  expect(await page.evaluate(() => indexedDB.databases())).toEqual([])
  await expectNoOverflow(page)
  await page.getByRole('button', { name: 'Help', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText(/demonstration|demo|prototype/i)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('valida texto vazio, cancela sem plantar e fecha por Escape restaurando o foco', async ({ page }) => {
  const opener = page.getByRole('button', { name: /Plant a Memory/i })
  let dialog = await openForm(page)
  await expect(dialog.getByRole('slider', { name: /How important/i })).toHaveValue('3')
  await expect(dialog).toContainText('Medium')
  for (const emotion of ['Joy', 'Love', 'Calm', 'Sad', 'Growth', 'Wonder']) {
    await expect(dialog.getByRole('radio', { name: emotion, exact: true })).toBeVisible()
  }
  const joy = dialog.getByRole('radio', { name: 'Joy', exact: true })
  await expect(joy).toBeChecked()
  await joy.focus()
  await joy.press('ArrowRight')
  await expect(dialog.getByRole('radio', { name: 'Love', exact: true })).toBeChecked()
  await dialog.getByRole('button', { name: /Plant it/i }).click()
  await expect(dialog).toBeVisible()
  await dialog.getByLabel(/What happened\?/i).fill('   ')
  await dialog.getByRole('button', { name: /Plant it/i }).click()
  await expect(dialog).toBeVisible()
  await expect(page.locator('canvas')).toHaveAttribute('data-plant-count', '0')
  await dialog.getByLabel(/What happened\?/i).fill('Uma lembrança que decidi não plantar.')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(opener).toBeFocused()
  dialog = await openForm(page)
  await expect(dialog.getByLabel(/What happened\?/i)).toHaveValue('')
  await expectNoOverflow(page)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(opener).toBeFocused()
  await expect(page.getByText('0 memories', { exact: true })).toBeVisible()
})

test('planta com emoção e importância, acompanha crescimento e abre a flor por clique ou toque', async ({ page, isMobile }) => {
  const description = 'Na cozinha da minha avó, o bolo ainda estava quente e a tarde parecia infinita.'
  const canvas = page.locator('canvas')
  const dialog = await openForm(page)
  await dialog.getByLabel(/What happened\?/i).fill(description)
  await dialog.getByRole('radio', { name: 'Love', exact: true }).click()
  const importance = dialog.getByRole('slider', { name: /How important/i })
  await importance.focus()
  await importance.press('End')
  await expect(importance).toHaveValue('5')
  await dialog.getByRole('button', { name: /Plant it/i }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('1 memory', { exact: true })).toBeVisible()
  await expect(canvas).toHaveAttribute('data-plant-count', '1')
  await expect(canvas).toHaveAttribute('data-growing', 'true')
  await expect(canvas).toHaveAttribute('data-growth-stage', 'seed')
  await expect(canvas).toHaveAttribute('data-growth-stage', 'sprout')
  await expect(canvas).toHaveAttribute('data-growth-stage', 'growing')
  await expect(canvas).toHaveAttribute('data-growing', 'false')
  await expect(canvas).toHaveAttribute('data-growth-stage', 'mature')
  const memory = await openPlant(page, isMobile)
  await expect(memory).toContainText(description)
  await expect(memory).toContainText('Love')
  await expect(memory.locator('time')).toContainText(/\d{1,2} de .+ de \d{4}/)
  await expect(memory.getByRole('button', { name: 'Pluck', exact: true })).toBeVisible()
  await expectNoOverflow(page)
  await memory.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => indexedDB.databases())).toEqual([])
  await page.reload()
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await expect(canvas).toHaveAttribute('data-plant-count', '0')
  await expect(page.getByText('0 memories', { exact: true })).toBeVisible()
})

test('conta duas memórias e permite arrancar cada flor sem deixar dados salvos', async ({ page, isMobile }) => {
  await page.getByRole('button', { name: 'Help', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Reduce motion', exact: true }).check()
  await page.getByRole('button', { name: 'Back to the garden', exact: true }).click()
  const firstDescription = 'Uma pausa ao sol entre as árvores.'
  const secondDescription = 'A alegria de reencontrar uma amiga querida.'
  await plantMemory(page, firstDescription, 'Calm')
  await plantMemory(page, secondDescription, 'Joy')
  await expect(page.getByText('2 memories', { exact: true })).toBeVisible()
  await expect(page.locator('canvas')).toHaveAttribute('data-plant-count', '2')
  let memory = await openPlant(page, isMobile)
  await expect(memory).toContainText(firstDescription)
  await memory.getByRole('button', { name: 'Pluck', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('1 memory', { exact: true })).toBeVisible()
  memory = await openPlant(page, isMobile)
  await expect(memory).toContainText(secondDescription)
  await memory.getByRole('button', { name: 'Pluck', exact: true }).click()
  await expect(page.locator('canvas')).toHaveAttribute('data-plant-count', '0')
  await expect(page.getByText('0 memories', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => indexedDB.databases())).toEqual([])
})

test('flores se movem suavemente e respeitam a preferência de movimento reduzido', async ({ page }) => {
  const canvas = await plantMemory(page, 'As flores novas trouxeram cor para aquele dia.', 'Wonder')
  const initialFrames = (await plants(canvas)).map((plant) => plant.frame).join(',')
  await expect.poll(async () => (await plants(canvas)).map((plant) => plant.frame).join(',')).not.toBe(initialFrames)
  await page.getByRole('button', { name: 'Help', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Reduce motion', exact: true }).check()
  await expect(canvas).toHaveAttribute('data-reduced-motion', 'true')
  await expect.poll(async () => (await plants(canvas)).every((plant) => Number(plant.frame) === 0)).toBe(true)
  await page.waitForTimeout(700)
  expect((await plants(canvas)).every((plant) => Number(plant.frame) === 0)).toBe(true)
  await page.getByRole('button', { name: 'Back to the garden', exact: true }).click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await expect(canvas).toHaveAttribute('data-reduced-motion', 'true')
})

test('alterna as quatro estações, muda a paisagem e preserva a memória plantada', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const canvas = page.locator('canvas')
  await expect(canvas).toHaveAttribute('data-reduced-motion', 'true')
  const description = 'Uma lembrança para guardar em qualquer estação.'
  await plantMemory(page, description, 'Love')
  const originalPlant = (await plants(canvas))[0]
  const originalIds = [originalPlant.id]
  await expect(canvas).toHaveAttribute('data-season', 'spring')
  await expect(page.getByRole('button', { name: 'Change season', exact: true })).toContainText('🌿')
  const bounds = await canvas.boundingBox()
  if (!bounds) throw new Error('Canvas sem dimensões')
  const clip = { x: bounds.x + bounds.width * .1, y: bounds.y + bounds.height * .3, width: bounds.width * .25, height: bounds.height * .1 }
  const flowerClip = { x: bounds.x + originalPlant.x - originalPlant.width * .5, y: bounds.y + originalPlant.y - originalPlant.height * .45, width: originalPlant.width, height: originalPlant.height }
  let landscape = await page.screenshot({ clip })
  let flower = await page.screenshot({ clip: flowerClip })
  let texture = originalPlant.texture
  for (const [season, icon] of [['Summer', '☀️'], ['Autumn', '🍂'], ['Winter', '❄️'], ['Spring', '🌿']]) {
    await page.getByRole('button', { name: 'Change season', exact: true }).click()
    await expect(canvas).toHaveAttribute('data-season', season.toLowerCase())
    await expect(page.locator('.season-badge')).toContainText(season)
    await expect(page.getByRole('button', { name: 'Change season', exact: true })).toContainText(icon)
    await expect(page.getByText('1 memory', { exact: true })).toBeVisible()
    const currentPlant = (await plants(canvas))[0]
    expect(currentPlant.id).toBe(originalIds[0])
    expect(currentPlant.season).toBe(season.toLowerCase())
    expect(currentPlant.texture).toBeTruthy()
    expect(currentPlant.texture).not.toBe(texture)
    expect([currentPlant.x, currentPlant.y, currentPlant.width, currentPlant.height]).toEqual([originalPlant.x, originalPlant.y, originalPlant.width, originalPlant.height])
    await expect.poll(async () => !(await page.screenshot({ clip })).equals(landscape)).toBe(true)
    await expect.poll(async () => !(await page.screenshot({ clip: flowerClip })).equals(flower)).toBe(true)
    landscape = await page.screenshot({ clip })
    flower = await page.screenshot({ clip: flowerClip })
    texture = currentPlant.texture
  }
  expect(texture).toBe(originalPlant.texture)
  const memory = await openPlant(page, isMobile)
  await expect(memory).toContainText(description)
  await expect(memory).toContainText('Love')
  await expectNoOverflow(page)
})

test('planta com o aspecto do inverno e troca estações durante o crescimento sem reiniciá-lo', async ({ page, isMobile }) => {
  const canvas = page.locator('canvas')
  const changeSeason = page.getByRole('button', { name: 'Change season', exact: true })
  for (let step = 0; step < 3; step += 1) await changeSeason.click()
  await expect(canvas).toHaveAttribute('data-season', 'winter')
  const description = 'Uma lembrança que nasceu no inverno e continuou a florescer.'
  const form = await openForm(page)
  await form.getByLabel(/What happened\?/i).fill(description)
  await form.getByRole('radio', { name: 'Love', exact: true }).click()
  await form.getByRole('button', { name: /Plant it/i }).click()
  await expect(canvas).toHaveAttribute('data-growth-stage', 'seed')
  const seedPlant = (await plants(canvas))[0]
  expect(seedPlant.season).toBe('winter')
  expect(seedPlant.texture).toContain('winter')
  await expect(canvas).toHaveAttribute('data-growth-stage', 'sprout')
  await changeSeason.click()
  await expect(canvas).toHaveAttribute('data-season', 'spring')
  expect(['sprout', 'growing', 'mature']).toContain(await canvas.getAttribute('data-growth-stage'))
  expect((await plants(canvas))[0].id).toBe(seedPlant.id)
  await expect(canvas).toHaveAttribute('data-growth-stage', 'growing')
  const growingPlant = (await plants(canvas))[0]
  await changeSeason.click()
  await expect(canvas).toHaveAttribute('data-season', 'summer')
  expect(['growing', 'mature']).toContain(await canvas.getAttribute('data-growth-stage'))
  expect((await plants(canvas))[0].width).toBeGreaterThanOrEqual(growingPlant.width - 1)
  await expect(canvas).toHaveAttribute('data-growth-stage', 'mature')
  await expect(canvas).toHaveAttribute('data-growing', 'false')
  const maturePlant = (await plants(canvas))[0]
  expect(maturePlant.id).toBe(seedPlant.id)
  expect(maturePlant.x).toBe(seedPlant.x)
  expect(maturePlant.y + maturePlant.height * .55).toBeCloseTo(seedPlant.y + seedPlant.height * .55, 2)
  expect(maturePlant.season).toBe('summer')
  expect(maturePlant.texture).not.toBe(seedPlant.texture)
  expect(maturePlant.texture).toContain('summer')
  await expect(page.getByText('1 memory', { exact: true })).toBeVisible()
  await expect(await openPlant(page, isMobile)).toContainText(description)
})
