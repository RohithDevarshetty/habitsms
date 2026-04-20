'use client'

import { useState, useEffect } from 'react'

interface PricingPlan {
  name: string
  description: string
  features: string[]
  highlighted?: boolean
  comingSoon?: boolean
}

const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Starter',
    description: 'Perfect for beginners',
    features: ['3 active habits', 'Daily SMS reminders', 'Streak tracking', 'Web dashboard'],
  },
  {
    name: 'Pro',
    description: 'For serious habit builders',
    highlighted: true,
    features: ['Unlimited habits', 'All reminders & tracking', 'Weekly summaries', 'Priority support'],
  },
  {
    name: 'Team',
    description: 'Coming soon',
    comingSoon: true,
    features: ['Everything in Pro', '5 team members', 'Shared dashboard', 'Group challenges'],
  },
]

const PRICES: Record<string, { symbol: string; rates: number[] }> = {
  IN: { symbol: '₹', rates: [49, 99, 299] },
  default: { symbol: '$', rates: [7, 12, 39] },
}

function useCountry() {
  const [country, setCountry] = useState<string>('IN')

  useEffect(() => {
    fetch('https://ipwho.is/')
      .then(res => res.json())
      .then(data => {
        const code = data?.country_code || 'IN'
        setCountry(PRICES[code] ? code : 'IN')
      })
      .catch(() => setCountry('IN'))
  }, [])

  return { country }
}

export default function DynamicPricing() {
  const { country } = useCountry()
  const prices = PRICES[country] || PRICES.IN
  const symbol = prices.symbol

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
      {PRICING_PLANS.map((plan, index) => {
        const isHighlighted = !!plan.highlighted
        const isTeam = !!plan.comingSoon

        const cardInner = (
          <div
            className={`relative flex flex-col h-full transition-all ${
              isHighlighted
                ? 'p-8 md:p-10'
                : 'liquid-glass rounded-[14px] p-8'
            }`}
          >
            {/* Badge row — always present so content aligns */}
            <div className="mb-5 h-6 flex items-center">
              {isHighlighted && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-400 text-black px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase">
                  <span>★</span> Most Popular
                </span>
              )}
              {isTeam && (
                <span className="inline-flex items-center bg-white/15 text-white/60 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase">
                  Coming Soon
                </span>
              )}
            </div>

            <h3 className={`text-2xl font-heading italic leading-tight ${isTeam ? 'text-white/40' : 'text-white'}`}>
              {plan.name}
            </h3>

            <div className={`mt-4 text-4xl font-heading italic leading-none ${isTeam ? 'text-white/30' : 'text-white'}`}>
              {isTeam ? '——' : `${symbol}${prices.rates[index]}`}
              {!isTeam && (
                <span className="text-base font-normal text-white/50 font-body ml-1">/month</span>
              )}
            </div>

            <p className={`mt-2 text-sm font-body font-light ${isTeam ? 'text-white/30' : 'text-white/60'}`}>
              {plan.description}
            </p>

            <ul className="mt-8 space-y-3 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className={`text-sm shrink-0 ${isTeam ? 'text-white/30' : isHighlighted ? 'text-yellow-400' : 'text-white/50'}`}>✓</span>
                  <span className={`text-sm font-body font-light ${isTeam ? 'text-white/30' : 'text-white/80'}`}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <button
              disabled={isTeam}
              className={`mt-8 w-full py-3 rounded-full font-medium text-sm transition ${
                isTeam
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : isHighlighted
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'liquid-glass text-white hover:bg-white/10'
              }`}
            >
              {isTeam ? 'Coming Soon' : isHighlighted ? 'Start Free Trial' : 'Get Started'}
            </button>

            {isHighlighted && (
              <p className="mt-3 text-center text-xs text-white/40 font-body">
                First 100 users: {symbol}{Math.floor(prices.rates[index] * 0.4)}/mo forever
              </p>
            )}
          </div>
        )

        if (isHighlighted) {
          return (
            <div
              key={plan.name}
              className="relative rounded-2xl md:-my-4"
              style={{
                padding: '1.5px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(180,180,180,0.4) 20%, rgba(240,240,240,0.6) 35%, rgba(100,100,100,0.35) 50%, rgba(200,200,200,0.55) 65%, rgba(150,150,150,0.4) 80%, rgba(230,230,230,0.6) 100%)',
                boxShadow: '0 0 48px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div className="rounded-[14px] overflow-hidden" style={{ background: '#0a0f1e' }}>
                {cardInner}
              </div>
            </div>
          )
        }

        return (
          <div key={plan.name} className={isTeam ? 'opacity-50' : ''}>
            {cardInner}
          </div>
        )
      })}
    </div>
  )
}
