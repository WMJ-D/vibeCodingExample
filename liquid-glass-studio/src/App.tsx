import { motion, useReducedMotion } from 'framer-motion'
import { BlurText } from './components/BlurText'
import { FadingVideo } from './components/FadingVideo'
import {
  ArrowUpRight,
  ClockIcon,
  GlobeIcon,
  ImageIcon,
  LightbulbIcon,
  MovieIcon,
  Play,
} from './components/Icons'

const heroVideo =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260619_191346_9d19d66e-86a4-47f7-8dc6-712c1788c3b2.mp4'
const capabilitiesVideo =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_093722_ccfc7ebf-182f-419f-8a62-2dc02db7dd9d.mp4'

const navigation = ['Work', 'Studio', 'Services', 'Journal', 'Contact']
const navigationTargets: Record<string, string> = {
  Work: '#capabilities',
  Studio: '#capabilities',
  Services: '#capabilities',
  Journal: '#capabilities',
  Contact: 'mailto:hello@aperture.studio',
}
const logos = ['Aeon', 'Vela', 'Apex', 'Orbit', 'Zeno']

const capabilities = [
  {
    title: 'Design',
    Icon: ImageIcon,
    tags: ['Brand Systems', 'Art Direction', 'Visual Identity', 'Motion'],
    body: 'We shape identities and interfaces that feel unmistakably yours -- typographic systems, component libraries, and art-directed pages that scale without losing soul.',
  },
  {
    title: 'Engineering',
    Icon: MovieIcon,
    tags: ['React', 'Next.js', 'Headless CMS', 'Edge-Ready'],
    body: 'Production-grade front-ends built on modern stacks. Performant, accessible, and instrumented -- with code your team will enjoy extending long after launch.',
  },
  {
    title: 'Growth',
    Icon: LightbulbIcon,
    tags: ['SEO', 'Analytics', 'A/B Testing', 'Retention'],
    body: 'Launch is the starting line. We partner with your team on conversion, content, and iteration loops that turn a beautiful site into a compounding asset.',
  },
]

const reveal = {
  hidden: { filter: 'blur(10px)', opacity: 0, y: 20 },
  visible: { filter: 'blur(0px)', opacity: 1, y: 0 },
}

function App() {
  const reduceMotion = useReducedMotion()

  const motionProps = (delay: number) => ({
    initial: reduceMotion ? false : 'hidden',
    animate: 'visible',
    variants: reveal,
    transition: { duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : delay, ease: 'easeOut' as const },
  })

  return (
    <main className="bg-black text-white">
      <section id="hero" className="relative h-screen min-h-[700px] overflow-hidden bg-black">
        <FadingVideo
          src={heroVideo}
          className="absolute left-1/2 top-0 z-0 -translate-x-1/2 object-cover object-top"
          style={{ width: '120%', height: '120%' }}
        />
        <div className="video-shade absolute inset-0 z-[1]" />

        <div className="relative z-10 flex h-full flex-col">
          <nav aria-label="Primary navigation" className="fixed left-0 right-0 top-4 z-50 flex items-center justify-between px-5 lg:px-16">
            <a href="#hero" aria-label="Aperture home" className="liquid-glass focus-ring flex h-12 w-12 items-center justify-center rounded-full">
              <span className="font-heading text-2xl italic">a</span>
            </a>

            <div className="liquid-glass hidden items-center rounded-full p-1.5 md:flex">
              {navigation.map((item) => (
                <a key={item} href={navigationTargets[item]} className="focus-ring rounded-full px-3 py-2 font-body text-sm font-medium text-white/90 transition-colors hover:text-white">
                  {item}
                </a>
              ))}
              <a href="mailto:hello@aperture.studio" className="focus-ring ml-1 flex items-center gap-2 rounded-full bg-white px-4 py-2 font-body text-sm font-medium text-black transition-transform hover:scale-[1.02]">
                Start a Project <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            <div className="h-12 w-12" aria-hidden="true" />
          </nav>

          <div className="flex flex-1 flex-col items-center justify-center px-4 pt-20 text-center sm:pt-24">
            <motion.div {...motionProps(0.4)} className="liquid-glass flex items-center gap-2 rounded-full px-2 py-1.5 font-body text-[11px] text-white/90 sm:text-xs">
              <span className="rounded-full bg-white px-2.5 py-1 font-medium text-black">New</span>
              <span className="pr-2">Booking Q3 2026 engagements -- limited capacity</span>
            </motion.div>

            <div className="mt-5 max-w-4xl sm:mt-6">
              <BlurText
                text="Crafted Digital Experiences Built to Outlast Trends"
                className="font-heading text-[3.35rem] italic leading-[0.8] tracking-[-3px] text-white sm:text-6xl md:text-7xl md:tracking-[-4px] lg:text-[5.5rem]"
              />
            </div>

            <motion.p {...motionProps(0.8)} className="mt-4 max-w-2xl font-body text-sm font-light leading-tight text-white md:text-base">
              We are a small studio of designers and engineers shaping brand-defining websites for ambitious companies. Precise typography, cinematic motion, and code you can be proud of.
            </motion.p>

            <motion.div {...motionProps(1.1)} className="mt-6 flex items-center gap-6">
              <a href="mailto:hello@aperture.studio" className="liquid-glass-strong focus-ring flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 font-body text-sm font-medium transition-transform hover:scale-[1.02]">
                Start a Project <ArrowUpRight className="h-4 w-4" />
              </a>
              <button type="button" className="focus-ring flex min-h-11 items-center gap-2 rounded-full px-1 font-body text-sm font-medium text-white/90 transition-colors hover:text-white">
                <Play className="h-4 w-4" /> Watch Showreel
              </button>
            </motion.div>

            <motion.div {...motionProps(1.3)} className="mt-7 hidden gap-3 sm:flex lg:mt-8 lg:gap-4">
              <article className="liquid-glass w-[210px] rounded-[1.25rem] p-4 text-left lg:w-[220px] lg:p-5">
                <ClockIcon className="h-5 w-5" />
                <p className="mt-3 font-heading text-4xl italic leading-none tracking-[-1px]">6 Weeks</p>
                <p className="mt-1 font-body text-xs font-light leading-tight text-white/80">Average End-to-End Launch Time</p>
              </article>
              <article className="liquid-glass w-[210px] rounded-[1.25rem] p-4 text-left lg:w-[220px] lg:p-5">
                <GlobeIcon className="h-5 w-5" />
                <p className="mt-3 font-heading text-4xl italic leading-none tracking-[-1px]">140+</p>
                <p className="mt-1 font-body text-xs font-light leading-tight text-white/80">Brands Shipped Across Four Continents</p>
              </article>
            </motion.div>
          </div>

          <motion.div {...motionProps(1.4)} className="flex flex-col items-center gap-3 px-4 pb-5 sm:gap-4 sm:pb-8">
            <p className="liquid-glass rounded-full px-4 py-2 text-center font-body text-[10px] font-light text-white/80 sm:text-xs">
              Trusted by founders, operators, and creative directors worldwide
            </p>
            <div className="flex w-full max-w-2xl items-center justify-between gap-3 px-1 sm:gap-8 md:gap-16">
              {logos.map((logo) => (
                <span key={logo} className="font-heading text-xl italic tracking-tight text-white/90 sm:text-2xl md:text-3xl">{logo}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section id="capabilities" className="relative min-h-screen overflow-hidden bg-black">
        <FadingVideo src={capabilitiesVideo} className="absolute inset-0 z-0 h-full w-full object-cover" />
        <div className="capabilities-shade absolute inset-0 z-[1]" />

        <div className="relative z-10 flex min-h-screen flex-col px-5 pb-10 pt-24 md:px-16 lg:px-20">
          <header className="mb-auto">
            <p className="mb-6 font-body text-sm text-white/80">// Capabilities</p>
            <h2 className="whitespace-pre-line font-heading text-6xl italic leading-[0.9] tracking-[-3px] md:text-7xl lg:text-[6rem]">
              {'Studio craft,\nend to end'}
            </h2>
          </header>

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            {capabilities.map(({ title, Icon, tags, body }, index) => (
              <motion.article
                key={title}
                initial={reduceMotion ? false : { filter: 'blur(10px)', opacity: 0, y: 30 }}
                whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : index * 0.12, ease: 'easeOut' }}
                className="liquid-glass flex min-h-[360px] flex-col rounded-[1.25rem] p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="liquid-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.75rem]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {tags.map((tag) => (
                      <span key={tag} className="liquid-glass whitespace-nowrap rounded-full px-3 py-1 font-body text-[11px] text-white/90">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex-1" />

                <div>
                  <h3 className="font-heading text-3xl italic leading-none tracking-[-1px] md:text-4xl">{title}</h3>
                  <p className="mt-4 max-w-[32ch] font-body text-sm font-light leading-snug text-white/90">{body}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
