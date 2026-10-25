import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { EmotionId } from '../garden/types'
import { useAuth } from '../services/auth'
import { EXAMPLE_SUMMARIES, searchGardens, type GardenSummary } from '../services/gardens'
import { LanguageSwitcher, useI18n } from '../i18n'
import './home.css'

const COLORS = ['#e9a8a0', '#d9744f', '#e8c46a', '#a99bd1', '#f4efe4']
const EMOTION_COLORS: Record<EmotionId, string> = {
  joy: '#e8c46a', love: '#e9a8a0', calm: '#f4efe4', sad: '#9db8d6', growth: '#d9744f', wonder: '#a99bd1',
}
const AVATAR_COLORS = ['#d9744f', '#355e41', '#7a6bb0']
const GARDEN_SKIES = ['#2c4434', '#3b5a43', '#24382b']

// Seeded, so the illustration is the same on every visit and between renders.
function seeded(seed: number) {
  return (min: number, max: number) => {
    seed = (seed * 16807) % 2147483647
    return min + (seed - 1) / 2147483646 * (max - min)
  }
}

const heroRandom = seeded(7)
const STARS = Array.from({ length: 34 }, () => ({ cx: heroRandom(40, 440), cy: heroRandom(40, 330), r: heroRandom(.6, 1.6), opacity: heroRandom(.2, .8) }))
const HERO_PLANTS = Array.from({ length: 11 }, (_, index) => {
  const x = 60 + index * 36 + heroRandom(-14, 14)
  const base = heroRandom(462, 492)
  const height = heroRandom(150, 310)
  const bend = heroRandom(-40, 40)
  const control = { x: x + bend, y: base - height * .55 }
  const tip = { x: x + bend * .3, y: base - height }
  const at = (t: number) => ({
    x: (1 - t) ** 2 * x + 2 * (1 - t) * t * control.x + t * t * tip.x,
    y: (1 - t) ** 2 * base + 2 * (1 - t) * t * control.y + t * t * tip.y,
  })
  const delay = .2 + index * .12 + heroRandom(0, .3)
  return {
    d: `M${x} ${base} Q${control.x} ${control.y} ${tip.x} ${tip.y}`,
    stroke: index % 3 ? '#7fa36b' : '#5d8a55', width: heroRandom(2.4, 3.6), delay,
    leaves: [-1, 1].map((side) => ({ side, ...at(heroRandom(.25, .6)) })),
    tip, color: COLORS[index % COLORS.length], radius: heroRandom(11, 18),
  }
})
const FLIES = Array.from({ length: 14 }, () => ({
  cx: heroRandom(60, 420), cy: heroRandom(180, 470), r: heroRandom(1.4, 2.6),
  style: { '--x': `${heroRandom(-30, 30)}px`, '--y': `${heroRandom(-40, 10)}px`, '--t': `${heroRandom(4, 8)}s`, '--d': `${heroRandom(0, 3)}s` },
}))

// Texts live in the dictionaries (home.demoMemories), in this same order.
const DEMO_MEMORIES = [
  { color: '#d9744f', shared: true },
  { color: '#a99bd1', shared: false },
  { color: '#e8c46a', shared: true },
  { color: '#e9a8a0', shared: false },
]

function Flower({ color, radius, className, style }: { color: string; radius: number; className?: string; style?: CSSProperties }) {
  const petals = color === '#e8c46a' ? 8 : 5
  return (
    <g className={className} style={style}>
      <g className="petals">
        {Array.from({ length: petals }, (_, index) => (
          <ellipse key={index} cx={0} cy={-radius * .62} rx={radius * .42} ry={radius * .66} fill={color} opacity={.95} transform={`rotate(${index * 360 / petals})`} />
        ))}
        <circle r={radius * .32} fill={color === '#e8c46a' ? '#7a4b2a' : '#f4d27a'} />
      </g>
    </g>
  )
}

function MiniFlower({ color }: { color: string }) {
  return <svg viewBox="-20 -20 40 40" aria-hidden="true"><circle r={19} fill="currentColor" opacity={.08} /><Flower color={color} radius={10} /></svg>
}

function GardenArt({ colors, sky, seed }: { colors: string[]; sky: string; seed: number }) {
  const random = seeded(seed)
  return (
    <svg viewBox="0 0 360 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width={360} height={150} fill={sky} />
      <path d="M0 120 Q90 100 180 115 T360 108 V150 H0Z" fill="#1f3326" />
      {Array.from({ length: 9 }, (_, index) => {
        const x = 24 + index * 39 + random(-8, 8)
        const top = random(40, 90)
        return (
          <g key={index}>
            <path d={`M${x} 150 Q${x + random(-12, 12)} ${(150 + top) / 2} ${x} ${top}`} stroke="#7fa36b" strokeWidth={2.4} fill="none" strokeLinecap="round" />
            <g transform={`translate(${x} ${top})`}><Flower color={colors[index % colors.length]} radius={random(8, 12)} /></g>
          </g>
        )
      })}
    </svg>
  )
}

/** The front gate: tend your own garden, or wander through gardens other people opened. */
export function Home() {
  const rootRef = useRef<HTMLDivElement>(null)
  const { t: { home: t }, locale } = useI18n()
  const [shared, setShared] = useState(() => DEMO_MEMORIES.map((memory) => memory.shared))
  const demo = DEMO_MEMORIES.map((memory, index) => ({ ...memory, ...t.demoMemories[index], shared: shared[index] }))
  const { user } = useAuth()
  const [gardens, setGardens] = useState<GardenSummary[]>(EXAMPLE_SUMMARIES)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const sharedDemo = demo.filter((memory) => memory.shared)

  useEffect(() => {
    const sections = rootRef.current?.querySelectorAll<HTMLElement>('.reveal:not(.in)') ?? []
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('in')
      observer.unobserve(entry.target)
    }), { threshold: .15 })
    sections.forEach((section, index) => {
      section.style.transitionDelay = `${index % 3 * 90}ms`
      observer.observe(section)
    })
    return () => observer.disconnect()
    // Garden cards arrive after the first paint, so new ones need watching too.
  }, [gardens])

  // Waits for a pause in typing so each keystroke doesn't become a query.
  useEffect(() => {
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      searchGardens(search)
        .then((list) => { if (!cancelled) setGardens(list) })
        .catch(() => { /* keep the last results */ })
        .finally(() => { if (!cancelled) setSearching(false) })
    }, search ? 300 : 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [search])

  return (
    <div className="home" lang={locale} ref={rootRef}>
      <div className="wrap">
        <nav>
          <a className="brand" href="#/" aria-label={t.homeLabel}>
            <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#1f2b22" /><path d="M16 25V14" stroke="#7fa36b" strokeWidth="2" strokeLinecap="round" /><path d="M16 18c-4 0-6-2.5-6-6 3.5 0 6 2 6 6Z" fill="#7fa36b" /><path d="M16 15c0-3.5 2.5-6 6.5-6 0 4-2.5 6-6.5 6Z" fill="#e8c46a" /></svg>
            My Memory Garden
          </a>
          <div className="nav-links">
            <a href="#como-funciona">{t.howItWorks}</a>
            <a href="#jardins-abertos">{t.openGardens}</a>
            <LanguageSwitcher />
            <a className="btn btn-ghost" href={user ? '#/garden' : '#/login'}>{user ? t.myGarden : t.signIn}</a>
          </div>
        </nav>

        <header className="hero">
          <div>
            <span className="eyebrow">{t.eyebrow}</span>
            <h1>{t.title[0]}<em>{t.title[1]}</em></h1>
            <p className="lede">{t.lede}</p>

            <div className="choices">
              <a className="choice primary" href="#/garden">
                <span className="ico" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 21v-9" stroke="#7fa36b" strokeWidth="2" strokeLinecap="round" /><path d="M12 14c-4.5 0-7-3-7-7 4 0 7 2.5 7 7Z" fill="#7fa36b" /><path d="M12 11c0-4 3-7 7.5-7 0 4.5-3 7-7.5 7Z" fill="#e8c46a" /></svg></span>
                <h3>{t.ownTitle}</h3>
                <span className="choice-desc">
                  {t.ownDesc}
                </span>
                <span className="go">{user ? t.ownBack : t.ownStart} <span>→</span></span>
              </a>
              <a className="choice" href="#jardins-abertos">
                <span className="ico" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 20V10a8 8 0 0 1 16 0v10" stroke="#355e41" strokeWidth="2" strokeLinecap="round" /><path d="M12 20v-6" stroke="#355e41" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="11" r="2.4" fill="#d9744f" /></svg></span>
                <h3>{t.visitTitle}</h3>
                <span className="choice-desc">{t.visitDesc}</span>
                <span className="go">{t.visitGo} <span>→</span></span>
              </a>
            </div>
            <p className="trust">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" /></svg>
              {t.trust}
            </p>
          </div>

          <div className="scene" aria-hidden="true">
            <svg viewBox="0 0 480 540">
              <defs>
                <clipPath id="home-arch"><path d="M30 540V230A210 210 0 0 1 450 230V540Z" /></clipPath>
                <linearGradient id="home-sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#1b2a20" /><stop offset=".65" stopColor="#2c4434" /><stop offset="1" stopColor="#3b5a43" />
                </linearGradient>
                <radialGradient id="home-moon" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#f6e3a8" /><stop offset=".55" stopColor="#e8c46a" stopOpacity=".5" /><stop offset="1" stopColor="#e8c46a" stopOpacity="0" /></radialGradient>
              </defs>
              <g clipPath="url(#home-arch)">
                <rect width="480" height="540" fill="url(#home-sky)" />
                <circle cx="330" cy="150" r="90" fill="url(#home-moon)" />
                <circle cx="330" cy="150" r="26" fill="#f4e6b8" />
                <g>{STARS.map((star, index) => <circle key={index} {...star} fill="#f4efe4" />)}</g>
                <path d="M0 470 Q120 430 240 455 T480 440 V540 H0Z" fill="#1f3326" />
                <g>
                  {HERO_PLANTS.map((plant, index) => (
                    <g key={index}>
                      <path d={plant.d} className="stem" stroke={plant.stroke} strokeWidth={plant.width} pathLength={1} style={{ '--len': 1, '--d': `${plant.delay}s` } as CSSProperties} />
                      {plant.leaves.map(({ side, x, y }, leaf) => (
                        <g key={leaf} transform={`translate(${x} ${y})`}>
                          <path className="leaf" fill="#6f9a5f" style={{ '--d': `${plant.delay + .6 + leaf * .15}s` } as CSSProperties}
                            d={`M0 0 C${side * 14} -6 ${side * 22} -18 ${side * 20} -26 C${side * 8} -22 ${side * 2} -12 0 0Z`} />
                        </g>
                      ))}
                      <g transform={`translate(${plant.tip.x} ${plant.tip.y})`}>
                        <Flower color={plant.color} radius={plant.radius} className="head" style={{ '--d': `${plant.delay + 1.3}s` } as CSSProperties} />
                      </g>
                    </g>
                  ))}
                </g>
                <path d="M0 500 Q140 480 260 498 T480 490 V540 H0Z" fill="#16211a" />
                <g>{FLIES.map(({ style, ...fly }, index) => <circle key={index} {...fly} fill="#f6e3a8" className="fly" style={{ ...style, filter: 'drop-shadow(0 0 4px #e8c46a)' } as CSSProperties} />)}</g>
              </g>
              <path d="M30 540V230A210 210 0 0 1 450 230V540" fill="none" stroke="#1f2b22" strokeWidth="10" />
              <path d="M240 20V540M30 330H450" stroke="#1f2b22" strokeWidth="3" opacity=".35" />
            </svg>
            <div className="tag tag-1"><span className="dot" style={{ background: 'var(--leaf)' }} /><b>{t.public}</b>&nbsp;· {t.demoMemories[0].title}</div>
            <div className="tag tag-2"><span className="dot" style={{ background: 'var(--ink-soft)' }} /><b>{t.private}</b>&nbsp;· {t.demoMemories[3].title}</div>
          </div>
        </header>
      </div>

      <section id="como-funciona">
        <div className="wrap">
          <div className="section-head reveal">
            <h2>{t.privacyTitle[0]}<em>{t.privacyTitle[1]}</em>{t.privacyTitle[2]}</h2>
            <p>{t.privacyText}</p>
          </div>

          <div className="steps">
            {t.steps.map((step, index) => (
              <div className="step reveal" key={index}><span className="n">{['i.', 'ii.', 'iii.'][index]}</span><h3>{step.title}</h3><p>{step.text}</p></div>
            ))}
          </div>

          <div className="demo reveal">
            <div className="panel panel-own">
              <div className="panel-title"><h4>{t.demoOwn}</h4><span className="pill">{t.demoTry}</span></div>
              <div>
                {demo.map((memory, index) => (
                  <div className="mem" key={memory.color}>
                    <MiniFlower color={memory.color} />
                    <div className="mem-txt"><b>{memory.title}</b><small>{memory.when}</small></div>
                    <button type="button" className="switch" role="switch" aria-checked={memory.shared} aria-label={t.makePublic(memory.title)}
                      onClick={() => setShared((items) => items.map((value, other) => other === index ? !value : value))}>
                      <span className="lbl">{memory.shared ? t.public : t.private}</span><span className="track" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel panel-visit" aria-live="polite">
              <div className="panel-title"><h4>{t.demoVisitor}</h4><span className="pill">{t.demoCount(sharedDemo.length)}</span></div>
              <div className="visit-grid">
                {sharedDemo.length
                  ? sharedDemo.map((memory) => <div className="vcard" key={memory.color}><MiniFlower color={memory.color} /><b>{memory.title}</b></div>)
                  : <p className="empty">{t.demoEmpty}</p>}
              </div>
              <p className="note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>{t.demoNote}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="jardins-abertos" className="no-top">
        <div className="wrap">
          <div className="section-head reveal">
            <h2>{t.gardensTitle[0]}<em>{t.gardensTitle[1]}</em></h2>
            <form className="garden-search" role="search" onSubmit={(event) => event.preventDefault()}>
              <label className="sr-only" htmlFor="garden-search">{t.searchLabel}</label>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <input id="garden-search" type="search" placeholder={t.searchPlaceholder} maxLength={60} autoComplete="off"
                value={search} onChange={(event) => setSearch(event.target.value)} />
              {search && <button type="button" aria-label={t.clearSearch} onClick={() => setSearch('')}>×</button>}
            </form>
          </div>
          <p className="search-status" role="status">
            {search.trim() && (searching ? t.searching : gardens.length ? '' : t.searchEmpty(search.trim()))}
          </p>
          <div className="gardens">
            {gardens.map((garden, index) => (
              <article className="garden reveal" key={garden.id}>
                <div className="garden-art">
                  <GardenArt colors={garden.emotions.length ? garden.emotions.map((emotion) => EMOTION_COLORS[emotion]) : COLORS} sky={GARDEN_SKIES[index % GARDEN_SKIES.length]} seed={index + 11} />
                </div>
                <div className="garden-body">
                  <div className="owner">
                    <span className="avatar" style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }} aria-hidden="true">
                      {garden.owner.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                    </span>
                    <span><small>{t.gardenOf}</small>{garden.owner}</span>
                  </div>
                  <h3>{garden.name}{garden.example && <span className="pill example-pill">{t.example}</span>}</h3>
                  <div className="garden-foot">
                    <span>{t.publicCount(garden.publicCount)}</span>
                    <a href={`#/garden/${garden.id}`} aria-label={t.visitLabel(garden.name)}>{t.visit} →</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="no-top">
        <div className="wrap">
          <div className="cta reveal">
            <span className="glow" /><span className="glow b" />
            <h2>{t.ctaTitle[0]}<em className="sun">{t.ctaTitle[1]}</em></h2>
            <p>{t.ctaText}</p>
            <a className="btn btn-light" href="#/garden">{t.ownTitle} →</a>
          </div>
        </div>
      </section>

      <div className="wrap">
        <footer>
          <span>© 2026 My Memory Garden</span>
          <span>{t.footer}</span>
        </footer>
      </div>
    </div>
  )
}
