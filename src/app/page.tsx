'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import { ArrowUpRight, Zap, Clock, BarChart3, Globe, PartyPopper, Plane, X, Menu } from 'lucide-react'
import Link from 'next/link'
import DynamicPricing from '@/components/DynamicPricing'
import WhatsAppGifChat from './test'
import IMessageChat from './imessage'

const REGION_PRICING: Record<string, { symbol: string; price: string }> = {
  IN: { symbol: '₹', price: '199/mo' },
  US: { symbol: '$', price: '4.99/mo' },
  default: { symbol: '$', price: '4.99/mo' },
}

function useRegionPricing() {
  const [pricing, setPricing] = useState(REGION_PRICING.default)

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        const code = data?.country_code
        if (code && REGION_PRICING[code]) {
          setPricing(REGION_PRICING[code])
        }
      })
      .catch(() => {})
  }, [])

  return pricing
}

/* ----------------- Primitives ----------------- */

function BlurText({
  text,
  className = '',
  delay = 100,
  by = 'words',
}: {
  text: string
  className?: string
  delay?: number
  by?: 'words' | 'letters'
}) {
  const parts = useMemo(
    () => (by === 'letters' ? [...text] : text.split(' ')),
    [text, by]
  )
  return (
    <span className={className} style={{ display: 'inline-block' }}>
      {parts.map((p, i) => (
        <Fragment key={`blur-${i}`}>
          <span
            className="blur-word"
            style={{ animationDelay: `${(i * delay) / 1000}s` }}
          >
            {p}
          </span>
          {by === 'words' && i < parts.length - 1 ? (
            <span style={{ display: 'inline-block', width: '0.28em', letterSpacing: 0 }}>
              {'\u00A0'}
            </span>
          ) : null}
        </Fragment>
      ))}
    </span>
  )
}

/* ----------------- Page sections ----------------- */

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const links = ['How It Works', 'Features', 'Pricing']

  return (
    <nav className="fixed top-4 left-0 right-0 z-50 px-5 sm:px-8 lg:px-16 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full liquid-glass-strong flex items-center justify-center shrink-0 cursor-pointer">
              <div
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
                style={{ background: 'radial-gradient(circle at 30% 30%, #fff, #cfd8ea 60%, #7a8cb8)' }}
              />
            </div>
          </Link>
          <Link href="/" className="hidden sm:block font-heading italic text-2xl tracking-tight cursor-pointer">HabitSMS</Link>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex liquid-glass rounded-full px-1.5 py-1 items-center gap-0">
          {links.map((l, i) => (
            <a
              key={`nav-${i}`}
              href={`#${l.toLowerCase().replace(/\s+/g, '-')}`}
              className="px-3 py-2 text-sm font-medium text-white/90 font-body hover:text-white transition"
            >
              {l}
            </a>
          ))}
          <Link href="/login" className="ml-1 bg-white text-black rounded-full px-3.5 py-1.5 text-sm font-medium flex items-center gap-1 hover:bg-white/90 transition whitespace-nowrap">
            Sign Up <ArrowUpRight size={14} />
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden liquid-glass-strong rounded-full p-2.5 text-white"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden mt-3 liquid-glass rounded-2xl p-4 flex flex-col gap-1">
          {links.map((l, i) => (
            <a
              key={`mob-nav-${i}`}
              href={`#${l.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2.5 text-sm font-medium text-white/90 font-body hover:text-white transition rounded-xl hover:bg-white/5"
            >
              {l}
            </a>
          ))}
          <Link href="/login" className="mt-2 bg-white text-black rounded-full px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-1 hover:bg-white/90 transition">
            Sign Up <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
    </nav>
  )
}

function Hero() {
  const { symbol, price } = useRegionPricing()
  const stats = [
    { v: '98%', l: 'Open Rate' },
    { v: 'Instant', l: 'Auto-Response' },
    { v: '78%', l: 'Less Than Apps' },
  ]
  return (
    <section className="relative overflow-visible min-h-[700px] sm:min-h-[850px] lg:min-h-[1000px]">
      {/* Background gradient — replaces video placeholder */}
      <div
        className="absolute inset-0 w-full h-full z-0"
        style={{
          background: `
            radial-gradient(1200px 600px at 30% 20%, rgba(90,130,200,0.35), transparent 60%),
            radial-gradient(900px 500px at 75% 70%, rgba(50,80,150,0.35), transparent 60%),
            linear-gradient(180deg, #0a1530 0%, #050a18 100%)
          `,
        }}
      />
      <div className="absolute inset-0 bg-black/5 z-0" />
      <div
        className="absolute top-0 left-0 right-0 z-[1] pointer-events-none"
        style={{ height: 420, background: 'linear-gradient(to bottom, black 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.3) 65%, transparent 100%)' }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 z-[1] pointer-events-none"
        style={{ height: 420, background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.85) 70%, black 100%)' }}
      />

      <div className="relative z-10 flex flex-col items-center text-center h-full px-5 sm:px-8 lg:px-16 pt-28 sm:pt-36 md:pt-44 pb-12">
        <div
          className="liquid-glass rounded-full px-1 py-1 inline-flex items-center gap-2 blur-in whitespace-nowrap"
          style={{ animationDelay: '0.2s' }}
        >
          <span className="bg-white text-black rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap">Limited</span>
          <span className="text-xs md:text-sm text-white/90 font-body pr-3 whitespace-nowrap">
            First 100 users get {symbol}{price} lifetime.
          </span>
        </div>

        <h1
          className="mt-6 sm:mt-8 text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic text-white leading-[0.85] max-w-xs sm:max-w-xl md:max-w-3xl"
          style={{ letterSpacing: '-2px' }}
        >
          <BlurText text="Build habits with a 98% success rate." delay={100} />
        </h1>

        <p
          className="mt-5 sm:mt-6 text-sm md:text-base text-white font-body font-light leading-snug max-w-sm md:max-w-md blur-in"
          style={{ animationDelay: '0.8s' }}
        >
          SMS reminders that actually work. No app to install, no notifications to ignore. Just reply Y or N.
        </p>

        <div
          className="mt-7 sm:mt-8 flex items-center justify-center gap-3 sm:gap-5 blur-in w-full"
          style={{ animationDelay: '1.1s' }}
        >
          <Link href="/login" className="liquid-glass-strong rounded-full px-5 py-3 text-sm font-medium text-white flex items-center gap-1.5 whitespace-nowrap w-full sm:w-auto justify-center">
            Start Free Trial <ArrowUpRight size={14} />
          </Link>
        </div>

        <p
          className="mt-4 text-xs text-white/50 font-body blur-in"
          style={{ animationDelay: '1.3s' }}
        >
          No credit card required • Cancel anytime
        </p>

        {/* Stats */}
        <div className="mt-auto pt-10 pb-6">
          <div className="flex flex-col items-center gap-5">
            <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
              By the numbers
            </div>
            <div className="flex flex-wrap items-end justify-center gap-8 sm:gap-10 md:gap-16">
              {stats.map((s, i) => (
                <div key={`stat-${i}`} className="text-center">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-heading italic text-white leading-none">{s.v}</div>
                  <div className="mt-2 text-white/60 font-body font-light text-sm">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TheProblem() {
  const problems = [
    '78% of people abandon habit apps after just 3 days.',
    'Push notifications get ignored — 60% of users disable them.',
    'Apps require opening, logging in, and navigating screens.',
    'People pay $500/month for coaches who just… text them.',
  ]
  return (
    <section className="px-5 sm:px-8 lg:px-16 py-16 md:py-20 max-w-7xl mx-auto">

      {/* Chat demos side by side */}
      <div className="flex flex-col sm:flex-row items-start justify-center gap-6 sm:gap-8 mb-12">
        <div className="w-full sm:w-auto">
          <div className="text-center text-white/60 text-sm mb-3">Message</div>
          <div className="w-full max-w-[280px] sm:max-w-none sm:w-[300px] mx-auto">
            <IMessageChat isDemo />
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <div className="text-center text-white/60 text-sm mb-3">WhatsApp</div>
          <div className="w-full max-w-[280px] sm:max-w-none sm:w-[300px] mx-auto">
            <WhatsAppGifChat isDemo />
          </div>
        </div>
        
      </div>

      <div className="flex flex-col items-center text-center mb-10 md:mb-16">
        <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">The problem</div>
        <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9] max-w-xs sm:max-w-2xl md:max-w-3xl">
          <BlurText text="Habit apps don't actually work." delay={80} />
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {problems.map((p, i) => (
          <div
            key={`prob-${i}`}
            className="liquid-glass rounded-2xl p-5 md:p-6 flex items-start gap-4 blur-in-up"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="text-2xl md:text-4xl font-heading italic text-white/40 leading-none shrink-0">
              {String(i + 1).padStart(2, '0')}
            </div>
            <p className="text-white/80 font-body font-light text-sm md:text-base leading-relaxed">{p}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Set your habits.',
      body: 'Choose from templates — workout, meditation, reading — or make your own. Pick a time.',
    },
    {
      n: '02',
      title: 'Receive an SMS.',
      body: 'A text arrives at your scheduled time. "Did you meditate today? Reply Y or N."',
    },
    {
      n: '03',
      title: 'Track your streak.',
      body: 'Just reply Y or N. We handle streaks, milestones, and weekly summaries automatically.',
    },
  ]
  return (
    <section id="how-it-works" className="px-5 sm:px-8 lg:px-16 py-16 md:py-28 max-w-7xl mx-auto">
      <div className="flex flex-col items-center text-center mb-10 md:mb-16">
        <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">How it works</div>
        <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9] max-w-xs sm:max-w-2xl md:max-w-3xl">
          <BlurText text="Three steps. Then it runs itself." delay={80} />
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {steps.map((s, i) => (
          <div
            key={`step-${i}`}
            className="liquid-glass rounded-2xl p-6 md:p-8 blur-in-up"
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            <div className="text-white/40 font-heading italic text-4xl md:text-5xl leading-none">{s.n}</div>
            <h3 className="mt-5 md:mt-6 text-xl md:text-2xl lg:text-3xl font-heading italic text-white leading-tight">{s.title}</h3>
            <p className="mt-3 text-white/60 font-body font-light text-sm leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Features() {
  const cards = [
    { Icon: Zap, title: '5 Habit Templates', body: 'Workout, meditation, water, reading, sleep — or create your own in seconds.' },
    { Icon: Clock, title: 'Custom Timing', body: 'Set reminders for any time. Morning habits at 6am, evening at 9pm. Your call.' },
    { Icon: BarChart3, title: 'Web Dashboard', body: 'See progress, streaks, and weekly summaries in a clean, fast dashboard.' },
    { Icon: Globe, title: 'Timezone Smart', body: 'Works worldwide. Reminders always arrive in your current local time.' },
    { Icon: PartyPopper, title: 'Milestone Moments', body: 'Special messages at 7, 30, and 100 days. A real reason to keep going.' },
    { Icon: Plane, title: 'Vacation Mode', body: 'Pause while you travel. Resume anytime. Nothing lost, nothing broken.' },
  ]
  return (
    <section id="features" className="px-5 sm:px-8 lg:px-16 py-16 md:py-28 max-w-7xl mx-auto">
      <div className="flex flex-col items-center text-center mb-10 md:mb-16">
        <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">Everything you need</div>
        <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9] max-w-xs sm:max-w-2xl md:max-w-3xl">
          <BlurText text="Small surface. Deep craft." delay={80} />
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {cards.map(({ Icon: Ic, title, body }, i) => (
          <div
            key={`feat-${i}`}
            className="liquid-glass rounded-2xl p-5 md:p-6 blur-in-up"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="liquid-glass-strong rounded-full w-10 h-10 flex items-center justify-center">
              <Ic size={18} className="text-white" />
            </div>
            <h4 className="mt-4 md:mt-5 text-xl md:text-2xl font-heading italic text-white leading-tight">{title}</h4>
            <p className="mt-3 text-white/60 font-body font-light text-sm leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section id="pricing" className="px-5 sm:px-8 lg:px-16 py-16 md:py-28 max-w-7xl mx-auto">
      <div className="flex flex-col items-center text-center mb-10 md:mb-12">
        <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">Pricing</div>
        <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9] max-w-xs sm:max-w-2xl md:max-w-3xl">
          <BlurText text="Simple. Honest. Lifetime." delay={80} />
        </h2>
      </div>
      <DynamicPricing />
    </section>
  )
}

function CtaFooter() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 w-full h-full z-0"
        style={{
          background: `
            radial-gradient(800px 500px at 50% 30%, rgba(60,90,160,0.2), transparent 60%),
            linear-gradient(180deg, #050a18 0%, #000 100%)
          `,
        }}
      />
      <div className="absolute top-0 left-0 right-0 z-[1] pointer-events-none" style={{ height: 200, background: 'linear-gradient(to top, transparent, black)' }} />
      <div className="absolute bottom-0 left-0 right-0 z-[1] pointer-events-none" style={{ height: 200, background: 'linear-gradient(to bottom, transparent, black)' }} />

      <div className="relative z-10 px-5 sm:px-8 lg:px-16 pt-20 md:pt-40 pb-10 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading italic text-white leading-[0.9] max-w-xs sm:max-w-2xl md:max-w-3xl">
            <BlurText text="Ready to build better habits?" delay={80} />
          </h2>
          <p className="mt-6 text-white/70 font-body font-light text-sm md:text-base max-w-sm md:max-w-xl">
            Join the first 100 users and lock in a lifetime discount. 7-day free trial. No credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <Link href="/login" className="liquid-glass-strong rounded-full px-6 py-3 text-sm font-medium text-white flex items-center gap-1.5 whitespace-nowrap w-full sm:w-auto justify-center">
              Start Free Trial <ArrowUpRight size={14} />
            </Link>
            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({behavior:'smooth'})} className="bg-white text-black rounded-full px-6 py-3 text-sm font-medium whitespace-nowrap w-full sm:w-auto">
              View Pricing
            </button>
          </div>
        </div>

        <div className="mt-20 md:mt-36 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white/40 text-xs font-body">© 2026 HabitSMS. All rights reserved.</div>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Contact'].map((l) => (
              <a key={l} href="#" className="text-white/40 text-xs font-body hover:text-white/70">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}



/* ----------------- Page root ----------------- */

export default function Home() {
  return (
    <div className="bg-black text-white">
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <div className="bg-black">
          <TheProblem />
          <HowItWorks />
          <Pricing />
          <Features />
          <CtaFooter />
        </div>
      </div>
    </div>
  )
}
