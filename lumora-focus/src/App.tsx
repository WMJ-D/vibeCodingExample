import { FormEvent, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Menu, X } from 'lucide-react'
import { gsap } from 'gsap'

const NAV_LINKS = ['Gallery', 'Styles', 'API', 'Pricing', 'Blog']
const VIDEO_SRC = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_080827_a9e5ad52-b6ee-4e79-b393-d936f179cfd7.mp4'

const videos = [
  {
    label: 'Golden Hour',
    src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_081127_0992a171-d3c6-4978-8213-0ec5df8b6d63.mp4',
  },
  {
    label: 'Still Water',
    src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_092026_dd05b805-ea0f-40b2-8c52-332b88502592.mp4',
  },
  {
    label: 'Deep Woods',
    src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_081042_df7202bf-bd80-4b2b-bbc6-1f09ba2870e9.mp4',
  },
  {
    label: 'Quiet Dawn',
    src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_080959_4cac5234-3573-464e-a5b7-76b94b8a7d61.mp4',
  },
]

const navLinks = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Community', href: '#community' },
  { label: 'Foldcraft', href: '/foldcraft' },
  { label: 'MicroVisuals', href: '/microvisuals' },
]
const stats = ['60+ Deep Sessions', '12,000+ Creators', '4.8 User Satisfaction', 'Intentional-First Design']

function LumoraPage() {
  const [activeVideo, setActiveVideo] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const transitionTimer = useRef<number | null>(null)
  const darkContent = activeVideo === 2

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  useEffect(() => {
    return () => {
      if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current)
    }
  }, [])

  const switchVideo = (index: number) => {
    if (index === activeVideo || isTransitioning) return
    setIsTransitioning(true)
    setActiveVideo(index)
    transitionTimer.current = window.setTimeout(() => setIsTransitioning(false), 1000)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <section className="lumora-page relative h-screen w-full overflow-hidden bg-black">
      <div className="absolute inset-0 z-0" aria-hidden="true">
        {videos.map((video, index) => (
          <video
            key={video.src}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
              index === activeVideo ? 'opacity-100' : 'opacity-0'
            }`}
            src={video.src}
            autoPlay
            muted
            loop
            playsInline
            preload={index === 0 ? 'auto' : 'metadata'}
          />
        ))}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      <img
        src="https://soft-zoom-63098134.figma.site/_assets/v11/0b4a435b2df2747593c43d7a1c9b4578f7d8d90c.png"
        alt=""
        className="train-bob pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover"
      />

      <div className="relative z-[2] flex h-full flex-col px-5 pb-5 pt-5 sm:px-8 sm:pb-7 sm:pt-7 lg:px-12 lg:pb-8">
        <nav className="flex shrink-0 items-center justify-between" aria-label="Primary navigation">
          <a href="#" className="focus-ring rounded-lg font-serif text-xl italic text-white sm:text-2xl">
            Lumora
          </a>

          <div className="liquid-glass hidden items-center rounded-full p-1.5 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="focus-ring rounded-full px-3 py-2 text-sm text-white/90 transition-colors hover:text-white"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#early-access"
              className="focus-ring ml-1 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#182C41] transition-transform hover:scale-[1.02]"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              Get Started
            </a>
          </div>

          <button
            type="button"
            className="liquid-glass focus-ring relative flex h-11 w-11 items-center justify-center rounded-full text-white md:hidden"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Menu className={`absolute h-5 w-5 transition-all duration-300 ${menuOpen ? 'rotate-90 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
            <X className={`absolute h-5 w-5 transition-all duration-300 ${menuOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-75 opacity-0'}`} />
          </button>
        </nav>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center pb-2 pt-5 text-center sm:pt-7">
          <div className={`hero-tone flex w-full flex-col items-center ${darkContent ? 'is-dark' : ''}`}>
            <div className="liquid-glass rounded-full px-4 py-2 text-[10px] sm:text-xs" style={{ fontFamily: 'system-ui, sans-serif' }}>
              Over 10,000 minds already finding their clarity
            </div>

            <h1 className="mt-4 max-w-4xl text-4xl leading-[1.02] tracking-[-0.02em] sm:mt-5 sm:text-5xl md:text-7xl lg:text-[5.5rem] lg:leading-[1.1]">
              Clarity in an Endlessly
              <br />
              Noisy Universe
            </h1>

            <p
              className="mt-4 max-w-xl px-2 text-xs leading-relaxed sm:text-sm md:text-base"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              Rise above the chaos of pings, infinite scrolling, and relentless demands. Discover how to protect your presence and create with intention.
            </p>

            <form
              id="early-access"
              className="liquid-glass mt-5 flex w-full max-w-[320px] items-center rounded-full p-1.5 sm:max-w-sm"
              onSubmit={handleSubmit}
            >
              <label htmlFor="email" className="sr-only">Your best email</label>
              <input
                id="email"
                type="email"
                required
                disabled={submitted}
                placeholder="Your Best Email"
                className="min-w-0 flex-1 bg-transparent px-3 text-xs text-current outline-none placeholder:text-current placeholder:opacity-60 sm:text-sm"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              />
              <button
                type="submit"
                disabled={submitted}
                className="focus-ring flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-medium text-[#182C41] transition-transform hover:scale-[1.02] disabled:cursor-default disabled:hover:scale-100 sm:text-sm"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                {submitted && <Check className="h-3.5 w-3.5" />}
                {submitted ? 'You are in' : 'Get Early Access'}
              </button>
            </form>

            <div className="mt-5 flex max-w-full items-center gap-3 overflow-x-auto px-2 pb-1 sm:mt-6 sm:gap-5" role="tablist" aria-label="Choose a focus landscape">
              {videos.map((video, index) => (
                <button
                  key={video.label}
                  type="button"
                  role="tab"
                  aria-selected={index === activeVideo}
                  disabled={isTransitioning && index !== activeVideo}
                  onClick={() => switchVideo(index)}
                  className={`focus-ring shrink-0 border-b px-0.5 py-1 text-[10px] transition-all duration-300 sm:text-xs ${
                    index === activeVideo
                      ? 'border-current opacity-100'
                      : 'border-transparent opacity-50 hover:opacity-80 disabled:cursor-wait'
                  }`}
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  {video.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-white/70 sm:text-xs lg:text-sm" style={{ fontFamily: 'system-ui, sans-serif' }}>
          {stats.map((stat, index) => (
            <div key={stat} className="contents">
              {index > 0 && <span className="hidden text-white/35 sm:inline" aria-hidden="true">|</span>}
              <span>{stat}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-500 md:hidden ${
          menuOpen ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' }}
        aria-hidden={!menuOpen}
      >
        <button type="button" className="absolute inset-0" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-6 px-8 text-center">
          {navLinks.map((link, index) => (
            <a
              key={link.label}
              href={link.href}
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => setMenuOpen(false)}
              className={`focus-ring rounded-lg text-3xl text-white transition-all duration-500 ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
              style={{
                transitionDelay: menuOpen ? `${100 + index * 50}ms` : '0ms',
                transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#early-access"
            tabIndex={menuOpen ? 0 : -1}
            onClick={() => setMenuOpen(false)}
            className={`focus-ring mt-4 rounded-full bg-white px-7 py-3 text-sm font-medium text-[#182C41] transition-all duration-500 ${menuOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
            style={{
              fontFamily: 'system-ui, sans-serif',
              transitionDelay: menuOpen ? '300ms' : '0ms',
              transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            Get Started
          </a>
        </div>
      </div>
    </section>
  )
}

const foldcraftNavLinks = ['Home', 'Projects', 'Studio', 'Reach Us']

function FoldcraftPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    document.title = 'Foldcraft | Creative Studio'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black font-geist">
      <video
        className="absolute h-full w-full object-cover"
        style={{ objectPosition: '70% center' }}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_204221_5339e40b-e73d-4ab0-9c65-79c18c66fd50.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      <nav className="relative z-30 flex items-center justify-between px-6 py-5 md:px-12 lg:px-16" aria-label="Foldcraft navigation">
        <div className="flex items-center gap-8 lg:gap-10">
          <a href="/foldcraft" className="focus-ring rounded-md text-lg font-semibold tracking-tight text-white sm:text-xl">
            Foldcraft
          </a>
          <div className="hidden items-center gap-6 md:flex lg:gap-8">
            {foldcraftNavLinks.map((link) => (
              <a
                key={link}
                href={link === 'Home' ? '/foldcraft' : `#${link.toLowerCase().replaceAll(' ', '-')}`}
                className="focus-ring rounded-md text-sm text-white/80 transition-colors hover:text-white"
              >
                {link}
              </a>
            ))}
            <a href="/" className="focus-ring rounded-md text-sm text-white/60 transition-colors hover:text-white">
              Lumora
            </a>
            <a href="/microvisuals" className="focus-ring rounded-md text-sm text-white/60 transition-colors hover:text-white">
              MicroVisuals
            </a>
          </div>
        </div>

        <a
          href="#reach-us"
          className="focus-ring hidden rounded-lg bg-white px-5 py-2 text-sm font-medium text-black transition-transform hover:scale-105 md:inline-flex"
        >
          Let's Talk
        </a>

        <button
          type="button"
          className="focus-ring relative z-50 flex h-10 w-10 items-center justify-center rounded-lg text-white transition-transform duration-300 active:scale-90 md:hidden"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <Menu className={`absolute h-6 w-6 transition-all duration-300 ${mobileMenuOpen ? 'rotate-90 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
          <X className={`absolute h-6 w-6 transition-all duration-300 ${mobileMenuOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-75 opacity-0'}`} />
        </button>
      </nav>

      <div
        className={`absolute inset-x-0 top-0 z-20 overflow-hidden bg-black/98 backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden ${
          mobileMenuOpen ? 'h-screen opacity-100' : 'pointer-events-none h-0 opacity-0'
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className={`flex h-full flex-col justify-center px-8 transition-all delay-100 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="flex flex-col items-start gap-5">
            {foldcraftNavLinks.map((link) => (
              <a
                key={link}
                href={link === 'Home' ? '/foldcraft' : `#${link.toLowerCase().replaceAll(' ', '-')}`}
                tabIndex={mobileMenuOpen ? 0 : -1}
                className="focus-ring rounded-md text-3xl font-medium text-white/90 transition-colors hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link}
              </a>
            ))}
            <a
              href="/"
              tabIndex={mobileMenuOpen ? 0 : -1}
              className="focus-ring rounded-md text-3xl font-medium text-white/60 transition-colors hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Lumora
            </a>
            <a
              href="/microvisuals"
              tabIndex={mobileMenuOpen ? 0 : -1}
              className="focus-ring rounded-md text-3xl font-medium text-white/60 transition-colors hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              MicroVisuals
            </a>
          </div>
          <a
            href="#reach-us"
            tabIndex={mobileMenuOpen ? 0 : -1}
            className="focus-ring mt-6 w-fit rounded-full bg-white px-8 py-3.5 text-base font-medium text-black transition-transform hover:scale-105"
            onClick={() => setMobileMenuOpen(false)}
          >
            Let's Talk
          </a>
        </div>
      </div>

      <div className="relative z-10 flex h-[calc(100vh-80px)] flex-col justify-between px-6 pb-10 pt-12 sm:pb-12 sm:pt-16 md:px-12 md:pb-16 md:pt-20 lg:px-16">
        <div className="max-w-3xl">
          <p className="mb-4 animate-[fadeSlideUp_0.8s_ease_0.2s_both] text-xs text-white/90 sm:mb-6 sm:text-sm">
            Brand &amp; Visual Storytelling
          </p>
          <h1 className="animate-[fadeSlideUp_0.8s_ease_0.4s_both] text-3xl font-medium leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Shaping visual
            <br />
            narratives,
            <br />
            one pixel at a time.
          </h1>
        </div>

        <div>
          <p className="mb-5 max-w-sm animate-[fadeSlideUp_0.8s_ease_0.7s_both] text-sm leading-relaxed text-white/60 sm:mb-6 sm:max-w-lg sm:text-base md:text-lg">
            Turning vision into reality through craft, motion, and an endless pursuit of beauty.
          </p>
          <a
            href="#projects"
            className="focus-ring inline-flex animate-[fadeSlideUp_0.8s_ease_0.9s_both] items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-transform hover:scale-105 sm:px-6 sm:py-3"
          >
            Explore Work <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}

function LogoMark() {
  return (
    <svg width="44" height="26" viewBox="0 0 44 26" fill="none" aria-label="MicroVisuals">
      <rect x="0" y="3" width="14" height="20" rx="3" fill="white" />
      <rect x="16" y="3" width="12" height="20" rx="3" fill="white" />
      <rect x="30" y="3" width="14" height="20" rx="3" fill="white" />
    </svg>
  )
}

type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number) => void) => number
  cancelVideoFrameCallback?: (handle: number) => void
}

function MicroVisualsPage() {
  const [mounted, setMounted] = useState(false)
  const [framesReady, setFramesReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoBgRef = useRef<HTMLDivElement>(null)
  const displayCanvasRef = useRef<HTMLCanvasElement>(null)
  const framesRef = useRef<HTMLCanvasElement[]>([])

  useEffect(() => {
    document.title = 'MicroVisuals | AI Creative Direction'
    setMounted(true)
  }, [])

  useEffect(() => {
    const video = videoRef.current as FrameVideo | null
    if (!video) return

    let capturing = true
    let lastTime = -1
    let rafId = 0
    let videoFrameId: number | null = null
    let captureStarted = false
    const MAX_WIDTH = 960
    const frames: HTMLCanvasElement[] = []

    const captureFrame = () => {
      if (!capturing || video.readyState < 2 || video.currentTime === lastTime || !video.videoWidth || !video.videoHeight) return
      lastTime = video.currentTime
      const scale = Math.min(1, MAX_WIDTH / video.videoWidth)
      const width = Math.max(1, Math.round(video.videoWidth * scale))
      const height = Math.max(1, Math.round(video.videoHeight * scale))
      const frame = document.createElement('canvas')
      frame.width = width
      frame.height = height
      const context = frame.getContext('2d')
      if (!context) return

      try {
        context.drawImage(video, 0, 0, width, height)
        frames.push(frame)
      } catch {
        capturing = false
      }
    }

    const requestNextFrame = () => {
      if (!capturing) return
      if (video.requestVideoFrameCallback) {
        videoFrameId = video.requestVideoFrameCallback(() => {
          captureFrame()
          requestNextFrame()
        })
      } else {
        rafId = requestAnimationFrame(() => {
          captureFrame()
          requestNextFrame()
        })
      }
    }

    const onLoaded = () => {
      if (captureStarted) return
      captureStarted = true
      void video.play().catch(() => {})
      requestNextFrame()
    }

    const onEnded = () => {
      capturing = false
      if (frames.length > 1) {
        framesRef.current = frames
        setFramesReady(true)
        return
      }

      video.currentTime = 0
      void video.play().catch(() => {})
    }

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('ended', onEnded)
    if (video.readyState >= 1) onLoaded()

    return () => {
      capturing = false
      cancelAnimationFrame(rafId)
      if (videoFrameId !== null) video.cancelVideoFrameCallback?.(videoFrameId)
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('ended', onEnded)
      framesRef.current = []
    }
  }, [])

  useEffect(() => {
    if (!framesReady) return
    const frames = framesRef.current
    const canvas = displayCanvasRef.current
    if (!canvas || frames.length < 2) return
    const context = canvas.getContext('2d')
    if (!context) return

    canvas.width = frames[0].width
    canvas.height = frames[0].height
    let index = 0
    let direction = 1
    let last = performance.now()
    const interval = 1000 / 30
    let rafId = 0

    const render = (now: number) => {
      if (now - last >= interval) {
        context.drawImage(frames[index], 0, 0)
        index += direction
        if (index >= frames.length - 1) {
          index = frames.length - 1
          direction = -1
        } else if (index <= 0) {
          index = 0
          direction = 1
        }
        last = now - ((now - last) % interval)
      }
      rafId = requestAnimationFrame(render)
    }

    rafId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(rafId)
  }, [framesReady])

  useEffect(() => {
    const background = videoBgRef.current
    if (!background || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const strength = 20
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0
    let rafId = 0

    const onMouseMove = (event: MouseEvent) => {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      targetX = ((event.clientX - centerX) / centerX) * strength
      targetY = ((event.clientY - centerY) / centerY) * strength
    }

    const animate = () => {
      currentX += (targetX - currentX) * 0.06
      currentY += (targetY - currentY) * 0.06
      gsap.set(background, { x: currentX, y: currentY })
      rafId = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMouseMove)
    rafId = requestAnimationFrame(animate)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(rafId)
      gsap.set(background, { clearProps: 'transform' })
    }
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-black font-body text-white">
      <div ref={videoBgRef} className="fixed left-0 top-0 z-0 h-full w-full scale-[1.08] origin-center">
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          className="h-full w-full object-cover"
          style={{ display: framesReady ? 'none' : 'block' }}
        />
        <canvas
          ref={displayCanvasRef}
          className="h-full w-full object-cover"
          style={{ display: framesReady ? 'block' : 'none' }}
          aria-hidden="true"
        />
      </div>

      <div
        className={`fixed left-0 right-0 z-20 w-full px-4 transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
        style={{ top: '126px' }}
      >
        <h1 className="hero-title select-none">MicroVisuals</h1>
      </div>

      <nav className="fixed left-1/2 top-5 z-50 -translate-x-1/2 whitespace-nowrap" aria-label="MicroVisuals navigation">
        <div className="liquid-glass flex items-center gap-3 rounded px-3 py-2.5 sm:gap-6 sm:px-4">
          <a href="/microvisuals" className="focus-ring rounded" aria-label="MicroVisuals home">
            <LogoMark />
          </a>
          <div className="hidden items-center gap-5 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link} href={`#${link.toLowerCase()}`} className="focus-ring rounded text-sm font-body font-light text-white/70 transition-colors duration-200 hover:text-white">
                {link}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:ml-4 sm:gap-3">
            <a href="/" className="focus-ring hidden rounded text-sm font-body font-light text-white/70 transition-colors duration-200 hover:text-white sm:inline">
              Sign in
            </a>
            <a href="#try" className="liquid-glass-strong focus-ring rounded px-4 py-1.5 text-sm font-body font-medium text-white transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_0_16px_2px_rgba(255,255,255,0.12)] active:scale-[0.97]">
              Try it free
            </a>
          </div>
        </div>
      </nav>

      <div className={`fixed bottom-6 left-0 right-0 z-20 flex items-end justify-between px-4 transition-all delay-300 duration-1000 sm:bottom-12 sm:px-10 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <p className="hidden max-w-[220px] text-sm font-body font-light leading-relaxed text-white/75 lg:block">
          Forma's AI understands context, composition, and style like a creative director would.
        </p>

        <div className="mx-auto flex items-center gap-2 sm:absolute sm:bottom-0 sm:left-1/2 sm:-translate-x-1/2 sm:gap-3">
          <a href="#generate" className="group relative overflow-hidden rounded bg-white px-4 py-3 text-xs font-body font-medium text-black shadow-[0_0_0_0_rgba(255,255,255,0)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_24px_4px_rgba(255,255,255,0.25)] active:scale-[0.97] sm:px-6 sm:text-sm">
            <span className="relative z-10">Start generating</span>
            <span className="absolute inset-0 bg-gradient-to-b from-white to-white/85 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          </a>
          <a href="#templates" className="liquid-glass group rounded px-4 py-3 text-xs font-body font-medium text-white transition-all duration-200 hover:scale-[1.03] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_20px_2px_rgba(255,255,255,0.07)] active:scale-[0.97] sm:px-6 sm:text-sm">
            See templates
          </a>
        </div>

        <p className="hidden max-w-[220px] text-right text-sm font-body font-light leading-relaxed text-white/75 lg:block">
          Describe what you see in your head — get images that actually match.
        </p>
      </div>
    </div>
  )
}

function App() {
  const path = window.location.pathname.replace(/\/+$/, '')
  if (path === '/foldcraft') return <FoldcraftPage />
  if (path === '/microvisuals') return <MicroVisualsPage />
  return <LumoraPage />
}

export default App
