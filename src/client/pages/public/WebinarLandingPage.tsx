/**
 * WebinarLandingPage — High-Converting Public Webinar Landing Page & CMS Fallback
 *
 * Modeled after https://krave-business-platform-webinar.vercel.app/
 * Dynamically pulls webinar details, trainer profile, and branding from backend APIs.
 * When no upcoming webinar is scheduled, displays static notice and auto-redirects in 5s.
 */

import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, type LandingPageSettings, type BenefitItem, type TestimonialItem, type FaqItemData } from '../../lib/api'
import { useBranding } from '../../hooks/useBranding'

// ── Countdown Hook ────────────────────────────────────────────────

interface CountdownValues {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
}

function useCountdown(targetDateStr?: string, targetTimeStr?: string): CountdownValues {
  const [countdown, setCountdown] = useState<CountdownValues>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  })

  useEffect(() => {
    if (!targetDateStr) return

    const calculate = () => {
      const timePart = targetTimeStr ? targetTimeStr.slice(0, 5) : '10:00'
      const target = new Date(`${targetDateStr}T${timePart}:00`)
      const now = new Date()
      const diff = target.getTime() - now.getTime()

      if (isNaN(diff) || diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setCountdown({ days, hours, minutes, seconds, isExpired: false })
    }

    calculate()
    const timer = setInterval(calculate, 1000)
    return () => clearInterval(timer)
  }, [targetDateStr, targetTimeStr])

  return countdown
}

// ── Date Formatter Helper ─────────────────────────────────────────

function formatWebinarDate(dateStr?: string, timeStr?: string, timezone = 'IST'): { short: string; full: string } {
  if (!dateStr) {
    return {
      short: 'Upcoming Live Session',
      full: 'Upcoming Session · Check Schedule',
    }
  }

  try {
    const timePart = timeStr ? timeStr.slice(0, 5) : '10:00'
    const dateObj = new Date(`${dateStr}T${timePart}:00`)

    if (isNaN(dateObj.getTime())) {
      return { short: `${dateStr} ${timePart}`, full: `${dateStr} at ${timePart} (${timezone})` }
    }

    const short =
      dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }) + ` ${timezone}`

    const full =
      dateObj.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }) + ` ${timezone}`

    return { short, full }
  } catch {
    return { short: `${dateStr} ${timeStr || ''}`, full: `${dateStr} ${timeStr || ''}` }
  }
}

// ── FAQ Accordion Item Component ──────────────────────────────────

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div
      style={{
        border: isOpen ? '1px solid #86efac' : '1px solid #e5e7eb',
        borderRadius: '16px',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        background: '#ffffff',
        boxShadow: isOpen ? '0 4px 12px rgba(34, 197, 94, 0.08)' : 'none',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          gap: '1rem',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '1rem', color: isOpen ? '#15803d' : '#1f2937' }}>
          {question}
        </span>
        <span
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isOpen ? '#16a34a' : '#f3f4f6',
            color: isOpen ? '#ffffff' : '#6b7280',
            fontWeight: 800,
            fontSize: '1rem',
            transform: isOpen ? 'rotate(45deg)' : 'none',
            transition: 'transform 0.2s ease, background-color 0.2s ease',
            flexShrink: 0,
          }}
        >
          +
        </span>
      </button>
      {isOpen && (
        <div style={{ padding: '0 1.5rem 1.25rem 1.5rem', color: '#4b5563', fontSize: '0.92rem', lineHeight: 1.6 }}>
          {answer}
        </div>
      )}
    </div>
  )
}

// ── No Webinar Fallback & 5-Second Redirection Screen ─────────────

function NoWebinarFallbackScreen({
  branding,
  landingConfig,
}: {
  branding?: any
  landingConfig?: LandingPageSettings
}) {
  const redirectUrl = landingConfig?.fallback_redirect_url || 'https://kravemicrogreens.in'
  const initialSecs = landingConfig?.fallback_redirect_secs || 5

  const [secondsLeft, setSecondsLeft] = useState(initialSecs)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (isPaused) return

    if (secondsLeft <= 0) {
      window.location.href = redirectUrl
      return
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [secondsLeft, isPaused, redirectUrl])

  const brandName = branding?.platformName || 'Krave Microgreens'
  const progressPercent = Math.max(0, Math.min(100, (secondsLeft / initialSecs) * 100))

  return (
    <div
      style={{
        fontFamily: 'var(--font-body, Inter, system-ui, sans-serif)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #edf6f0 0%, #f7fbf8 50%, #ffffff 100%)',
        padding: '2rem 1rem',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '28px',
          border: '1px solid #e2efe6',
          padding: 'clamp(2rem, 5vw, 3.5rem)',
          boxShadow: '0 20px 40px rgba(30, 86, 49, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Brand Logo */}
        <div style={{ marginBottom: '1.75rem' }}>
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={brandName}
              style={{ height: '44px', maxWidth: '180px', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <span style={{ fontSize: '2rem' }}>🌱</span>
              <span style={{ fontWeight: 900, fontSize: '1.35rem', color: '#1e5631' }}>{brandName}</span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '999px',
            padding: '0.4rem 1.1rem',
            color: '#b45309',
            fontSize: '0.82rem',
            fontWeight: 800,
            marginBottom: '1.25rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <span>⏳</span>
          <span>Next Masterclass Batch In Preparation</span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
            fontWeight: 900,
            color: '#143623',
            lineHeight: 1.25,
            marginBottom: '0.85rem',
          }}
        >
          {landingConfig?.fallback_title || 'No Live Webinar Scheduled At The Moment'}
        </h1>

        {/* Description */}
        <p style={{ fontSize: '0.95rem', color: '#4a6b57', lineHeight: 1.6, marginBottom: '2rem' }}>
          {landingConfig?.fallback_message ||
            'We are currently scheduling our next high-yield live masterclass. You will be redirected to our main website shortly.'}
        </p>

        {/* 5-Second Countdown Ticker & Progress Bar */}
        <div
          style={{
            width: '100%',
            background: '#f4f9f5',
            border: '1px solid #d0e6d6',
            borderRadius: '16px',
            padding: '1.25rem',
            marginBottom: '1.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: '#1e5631',
              marginBottom: '0.75rem',
            }}
          >
            <span>
              {isPaused ? '⏸️ Auto-redirect paused' : `⏳ Redirecting in ${secondsLeft} second${secondsLeft === 1 ? '' : 's'}...`}
            </span>
          </div>

          {/* Animated Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '6px',
              background: '#e2efe6',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: '#16a34a',
                transition: 'width 1s linear',
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          <a
            href={redirectUrl}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: '#1e5631',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1rem',
              padding: '0.9rem',
              borderRadius: '14px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(30, 86, 49, 0.2)',
            }}
          >
            <span>Go to Website Now →</span>
          </a>

          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0.4rem',
            }}
          >
            {isPaused ? '▶ Resume Auto-Redirect' : '⏸️ Stay on this page'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Landing Page Component ───────────────────────────────────

export default function WebinarLandingPage() {
  const { id: routeWebinarId } = useParams<{ id?: string }>()
  const { data: branding } = useBranding()
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // Fetch Featured Webinar, Trainer & Landing Config
  const { data: landingData, isLoading } = useQuery({
    queryKey: ['public', 'landing', 'featured', routeWebinarId],
    queryFn: async () => {
      if (routeWebinarId) {
        const [webinarFetch, trainerRes, configRes] = await Promise.all([
          fetch(`/api/v1/webinars/${routeWebinarId}/public`, { credentials: 'include' })
            .then((r) => r.json() as Promise<any>)
            .catch(() => ({ ok: false })),
          api.trainer.getPublic().catch(() => ({ ok: false })),
          api.landing.getPublicConfig().catch(() => ({ ok: false })),
        ])
        return {
          webinar: webinarFetch && 'ok' in webinarFetch && webinarFetch.ok ? (webinarFetch as any).data.webinar : null,
          trainer: trainerRes && 'ok' in trainerRes && trainerRes.ok ? (trainerRes as any).data : null,
          landingConfig: configRes && 'ok' in configRes && configRes.ok ? (configRes as any).data : undefined,
        }
      }
      const res = await api.landing.getFeatured()
      if (!res.ok) {
        const cfg = await api.landing.getPublicConfig().catch(() => ({ ok: false }))
        return {
          webinar: null,
          trainer: null,
          landingConfig: cfg && 'ok' in cfg && cfg.ok ? (cfg as any).data : undefined,
        }
      }
      return res.data
    },
    staleTime: 15_000,
  })

  const webinar = landingData?.webinar
  const trainer = landingData?.trainer
  const config = landingData?.landingConfig

  // Always call hooks unconditionally at the top level
  const countdown = useCountdown(webinar?.startDate, webinar?.startTime)

  // If loading, show initial spinner
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faf5' }}>
        <div className="admin-spinner" />
      </div>
    )
  }

  // If NO active or upcoming webinar is scheduled, render fallback screen with 5s countdown redirect
  if (!webinar) {
    return <NoWebinarFallbackScreen branding={branding} landingConfig={config} />
  }

  const registerUrl = webinar?.id ? `/register/${webinar.id}` : '/register'
  const dates = formatWebinarDate(webinar?.startDate, webinar?.startTime, webinar?.timezone || 'IST')

  const whatsappUrl = trainer?.whatsapp_community_url || 'https://chat.whatsapp.com/krave-community'
  const brandName = branding?.platformName || 'Krave Microgreens'
  const spotsLeft = webinar?.spotsLeft ?? 300

  // CMS Overrides or intelligent defaults
  const heroHeadline = config?.hero_headline_override || webinar?.title || 'Start & Scale Your Profitable Microgreens Business'
  const heroSubheading =
    config?.hero_subheading_override || webinar?.description || `${brandName} Live Masterclass — Proven Roadmap to ₹30,000–₹50,000/Month from Home`
  const badgeText = config?.hero_badge_text || 'FREE LIVE WEBINAR'
  const socialProofText = config?.hero_social_proof_text || '2,000+ entrepreneurs already registered'
  const primaryCtaText = config?.hero_primary_cta_text || '🎯 Reserve My Free Spot'
  const secondaryCtaText = config?.hero_secondary_cta_text || '💬 Join WhatsApp Community'

  const learningPoints: BenefitItem[] = Array.isArray(config?.benefits) && config.benefits.length > 0
    ? config.benefits
    : [
        {
          icon: '🌱',
          num: '1',
          title: 'Start with Zero Experience',
          desc: 'No farming background needed. Our proven step-by-step system is engineered for complete beginners.',
        },
        {
          icon: '💰',
          num: '2',
          title: 'Earn ₹25,000–₹50,000/Month',
          desc: 'Learn exactly how to price, sell, and scale to a reliable full-time income from fresh microgreens.',
        },
        {
          icon: '📦',
          num: '3',
          title: 'Sell Before You Grow',
          desc: 'Discover our pre-order strategy so you have paying customers before spending a single rupee on seeds.',
        },
        {
          icon: '🏠',
          num: '4',
          title: 'Grow From Any Space',
          desc: 'A balcony, terrace, or spare corner is enough. No heavy land or expensive greenhouse required.',
        },
        {
          icon: '⚡',
          num: '5',
          title: 'Harvest in 7–14 Days',
          desc: 'Microgreens are the fastest-growing crop on earth. Get your first harvest and revenue within 2 weeks.',
        },
        {
          icon: '🎯',
          num: '6',
          title: 'Live Q&A with Trainer',
          desc: 'Get your specific questions answered live and leave with a personalized, actionable launch plan.',
        },
      ]

  const testimonials: TestimonialItem[] = Array.isArray(config?.testimonials) && config.testimonials.length > 0
    ? config.testimonials
    : [
        {
          initials: 'PS',
          name: 'Priya Sharma',
          location: 'Bengaluru · Sunflower & Pea shoots',
          rating: 5,
          quote:
            'I was skeptical at first, but within 6 weeks of following the system I had my first ₹18,000 month. The webinar gave me the confidence to start immediately.',
        },
        {
          initials: 'RM',
          name: 'Rajesh Mehta',
          location: 'Mumbai · Radish & Broccoli',
          rating: 5,
          quote:
            'I attended the webinar in early 2026. Within months I had established my commercial setup. Now I earn more than my previous IT job and work right from home.',
        },
        {
          initials: 'AK',
          name: 'Anita Krishnan',
          location: 'Chennai · Wheatgrass & Lentils',
          rating: 5,
          quote:
            'The most actionable webinar I have ever attended. Not just theory — real numbers, real strategies, real results. Completely free and worth every minute.',
        },
      ]

  const faqs: FaqItemData[] = Array.isArray(config?.faqs) && config.faqs.length > 0
    ? config.faqs
    : [
        {
          q: 'Is the webinar completely free?',
          a: 'Yes, 100% free. There are no hidden fees or paywalls. We run this masterclass to share practical knowledge and grow the microgreens entrepreneurship community across India.',
        },
        {
          q: 'Do I need any farming or agriculture experience?',
          a: 'Absolutely not. The webinar is tailored from the ground up for complete beginners. If you can water a tray, you can grow high-yield microgreens.',
        },
        {
          q: 'What equipment do I need to get started?',
          a: 'Just trays, a growing medium (coco peat), non-GMO seeds, and water. A complete starter setup costs as little as ₹2,000–₹3,000, which we will cover step-by-step.',
        },
        {
          q: 'How much space do I need in my home or apartment?',
          a: 'As little as 10–20 square feet. A small apartment balcony, utility area, or a vertical wire rack inside a spare room works perfectly.',
        },
        {
          q: 'Will the webinar recording be available?',
          a: 'A replay will be shared with registered attendees. However, attending live allows you to ask questions directly in the live interactive Q&A and participate in live polls.',
        },
        {
          q: 'How quickly can I make my first sale?',
          a: 'Microgreens mature in 7–14 days. With our pre-order strategy, many attendees secure their first customer orders before even sowing their first tray.',
        },
        {
          q: 'Is there a community I can join for support?',
          a: 'Yes! After registering, you can join our active WhatsApp community with fellow growers sharing tips, harvest photos, and local business insights.',
        },
        {
          q: 'Does this business model work in my city?',
          a: 'Microgreens are in high demand across all Indian cities — Tier 1 metropolises as well as Tier 2 & Tier 3 towns with restaurants, cafes, and health-conscious families.',
        },
      ]

  const trainerHighlights: string[] = Array.isArray(trainer?.highlights) && trainer.highlights.length > 0
    ? trainer.highlights
    : ['2,000+ students trained', 'Microgreens Pioneer in Coimbatore', 'Commercial & Home Setup Expert']

  return (
    <div style={{ fontFamily: 'var(--font-body, Inter, system-ui, sans-serif)', color: '#143623', background: '#f8faf5', minHeight: '100vh' }}>
      {/* ── Fixed Top Navigation ── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2efe6',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            maxWidth: '1140px',
            margin: '0 auto',
            padding: '0 1rem',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Brand Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={brandName}
                style={{ height: '36px', maxWidth: '160px', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.75rem' }}>🌱</span>
                <span style={{ fontWeight: 900, fontSize: '1.2rem', color: '#1e5631', letterSpacing: '-0.02em' }}>
                  {brandName}
                </span>
              </div>
            )}
          </Link>

          {/* Date Chip (Desktop) */}
          <div
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#1e5631',
              background: '#edf6f0',
              padding: '0.4rem 1rem',
              borderRadius: '999px',
              border: '1px solid #d0e6d6',
            }}
            className="landing-nav-chip"
          >
            <span>📅</span>
            <span>{dates.short}</span>
          </div>

          {/* Nav Register CTA */}
          <Link
            to={registerUrl}
            style={{
              background: '#1e5631',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.88rem',
              padding: '0.55rem 1.25rem',
              borderRadius: '12px',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(30, 86, 49, 0.2)',
              flexShrink: 0,
            }}
          >
            Register Free →
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section
        style={{
          position: 'relative',
          paddingTop: '120px',
          paddingBottom: '80px',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #edf6f0 0%, #f7fbf8 50%, #ffffff 100%)',
          textAlign: 'center',
        }}
      >
        {/* Glow ambient background orbs */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(187, 247, 208, 0.4)',
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(209, 250, 229, 0.5)',
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', maxWidth: '900px', margin: '0 auto', padding: '0 1.25rem' }}>
          {/* Live Webinar Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: '#e2efe6',
              border: '1px solid #b8dbc3',
              borderRadius: '999px',
              padding: '0.45rem 1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#16a34a',
                boxShadow: '0 0 8px #16a34a',
                display: 'inline-block',
              }}
            />
            <span style={{ color: '#1e5631', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.04em' }}>
              {badgeText} · {dates.short}
            </span>
          </div>

          {/* Main Title */}
          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.75rem)',
              fontWeight: 900,
              color: '#143623',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
            }}
          >
            {heroHeadline}
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
              fontWeight: 600,
              color: '#2d7d46',
              maxWidth: '750px',
              margin: '0 auto 2rem auto',
              lineHeight: 1.5,
            }}
          >
            {heroSubheading}
          </p>

          {/* Metadata Badges */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              marginBottom: '2.5rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#1e5631',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#ffffff',
                padding: '0.45rem 1rem',
                borderRadius: '999px',
                border: '1px solid #e2efe6',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <span>🗓️</span>
              <span>{dates.full}</span>
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#ffffff',
                padding: '0.45rem 1rem',
                borderRadius: '999px',
                border: '1px solid #e2efe6',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <span>⏱️</span>
              <span>90–120 minutes</span>
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#ffffff',
                padding: '0.45rem 1rem',
                borderRadius: '999px',
                border: '1px solid #e2efe6',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <span>🎙️</span>
              <span>{trainer?.name || webinar?.hostName || 'Shanthi Ramakrishnamurthy'}</span>
            </span>
          </div>

          {/* Live Countdown Timer Cards */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                background: '#ffffff',
                padding: '1rem 1.5rem',
                borderRadius: '20px',
                border: '1px solid #d0e6d6',
                boxShadow: '0 8px 24px rgba(30, 86, 49, 0.06)',
              }}
            >
              {[
                { label: 'DAYS', val: countdown.days },
                { label: 'HOURS', val: countdown.hours },
                { label: 'MINS', val: countdown.minutes },
                { label: 'SECS', val: countdown.seconds },
              ].map((item, idx) => (
                <React.Fragment key={item.label}>
                  {idx > 0 && <span style={{ fontWeight: 800, fontSize: '1.5rem', color: '#86efac' }}>:</span>}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '54px' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e5631', lineHeight: 1 }}>
                      {String(item.val).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6b8e78', marginTop: '0.3rem', letterSpacing: '0.05em' }}>
                      {item.label}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Primary & Secondary Action Buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: '1rem',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Link
              id="hero-register-btn"
              to={registerUrl}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                background: '#1e5631',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '1.15rem',
                padding: '1.1rem 2.5rem',
                borderRadius: '16px',
                textDecoration: 'none',
                boxShadow: '0 12px 30px rgba(30, 86, 49, 0.25)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>{primaryCtaText}</span>
            </Link>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                background: '#ffffff',
                color: '#1e5631',
                fontWeight: 800,
                fontSize: '1rem',
                padding: '1.1rem 2rem',
                borderRadius: '16px',
                border: '1px solid #b8dbc3',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>{secondaryCtaText}</span>
            </a>
          </div>

          {/* Social Proof Line */}
          <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#4a6b57', fontWeight: 600 }}>
            🔥 <strong style={{ color: '#143623', fontWeight: 800 }}>{socialProofText}</strong> · Limited to{' '}
            <strong style={{ color: '#143623' }}>{spotsLeft}</strong> seats
          </p>
        </div>
      </section>

      {/* ── What You'll Learn / Benefits Section ── */}
      <section id="benefits" style={{ padding: '96px 1rem', background: '#ffffff' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span
              style={{
                display: 'inline-block',
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '0.4rem 1rem',
                borderRadius: '999px',
                letterSpacing: '0.05em',
                marginBottom: '1rem',
                textTransform: 'uppercase',
              }}
            >
              WHAT YOU&apos;LL LEARN
            </span>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', fontWeight: 900, color: '#111827', margin: '0 0 1rem 0' }}>
              Everything You Need to Start and Scale
            </h2>
            <p style={{ fontSize: '1.15rem', color: '#6b7280', maxWidth: '650px', margin: '0 auto' }}>
              In 90 minutes, you&apos;ll walk away with a complete actionable roadmap — from your very first tray to your first ₹30,000 month.
            </p>
          </div>

          {/* 6 Grid Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {learningPoints.map((item: BenefitItem) => (
              <div
                key={item.num}
                style={{
                  position: 'relative',
                  background: '#ffffff',
                  border: '1px solid #f3f4f6',
                  borderRadius: '20px',
                  padding: '2rem',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  transition: 'all 0.3s ease',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '1.25rem',
                    right: '1.25rem',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#16a34a',
                  }}
                >
                  {item.num}
                </div>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{item.icon}</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.92rem', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
            <Link
              to={registerUrl}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#16a34a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.05rem',
                padding: '1rem 2.25rem',
                borderRadius: '14px',
                textDecoration: 'none',
                boxShadow: '0 8px 20px rgba(22, 163, 74, 0.25)',
              }}
            >
              Get Access to All of This — Free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trainer Profile Section ── */}
      <section id="trainer" style={{ padding: '96px 1rem', background: '#f4f9f5', borderTop: '1px solid #e2efe6', borderBottom: '1px solid #e2efe6' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span
              style={{
                display: 'inline-block',
                background: '#e2efe6',
                color: '#1e5631',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.35rem 1rem',
                borderRadius: '999px',
                letterSpacing: '0.06em',
                marginBottom: '1rem',
                textTransform: 'uppercase',
              }}
            >
              YOUR TRAINER
            </span>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', fontWeight: 900, color: '#143623', margin: 0 }}>
              Learn From India&apos;s Leading Microgreens Expert
            </h2>
          </div>

          <div
            style={{
              background: '#ffffff',
              borderRadius: '28px',
              border: '1px solid #e2efe6',
              padding: 'clamp(1.5rem, 4vw, 3rem)',
              boxShadow: '0 16px 36px rgba(30, 86, 49, 0.05)',
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '2.5rem',
            }}
          >
            {/* Trainer Photo */}
            <div style={{ flexShrink: 0, margin: '0 auto' }}>
              <div
                style={{
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '4px solid #1e5631',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
                  background: '#edf6f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {trainer?.avatar_url ? (
                  <img
                    src={trainer.avatar_url}
                    alt={trainer.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '5rem' }}>🌱</span>
                )}
              </div>
            </div>

            {/* Trainer Info */}
            <div style={{ flex: '1 1 340px' }}>
              <h3 style={{ fontSize: '2rem', fontWeight: 900, color: '#143623', margin: '0 0 0.4rem 0' }}>
                {trainer?.name || 'Shanthi Ramakrishnamurthy'}
              </h3>
              <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2d7d46', margin: '0 0 1.25rem 0' }}>
                {trainer?.title || `Lead Trainer & Microgreens Specialist, ${brandName}`}
              </p>
              <p style={{ fontSize: '0.98rem', color: '#4a6b57', lineHeight: 1.7, margin: '0 0 1.75rem 0', fontWeight: 500 }}>
                {trainer?.bio ||
                  'Shanthi is a passionate urban farming advocate and lead trainer at Krave Microgreens, helping home growers turn small balcony spaces into thriving, profitable microgreens businesses.'}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {trainerHighlights.map((h: string, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: '#f0f7f2',
                      border: '1px solid #d0e6d6',
                      borderRadius: '12px',
                      padding: '0.6rem 1rem',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: '#143623',
                    }}
                  >
                    <span style={{ color: '#1e5631', fontWeight: 900 }}>✓</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials Section ── */}
      <section id="testimonials" style={{ padding: '96px 1rem', background: '#f9fafb' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span
              style={{
                display: 'inline-block',
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '0.4rem 1rem',
                borderRadius: '999px',
                marginBottom: '1rem',
                textTransform: 'uppercase',
              }}
            >
              SUCCESS STORIES
            </span>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', fontWeight: 900, color: '#111827', margin: '0 0 1rem 0' }}>
              Real People, Real Results
            </h2>
            <p style={{ fontSize: '1.15rem', color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
              Over 2,000 students have attended our masterclass. Here is what they say.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {testimonials.map((t: TestimonialItem, idx: number) => (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: idx === 0 ? '2px solid #22c55e' : '1px solid #e5e7eb',
                  borderRadius: '20px',
                  padding: '1.75rem',
                  boxShadow: idx === 0 ? '0 12px 28px rgba(34, 197, 94, 0.12)' : '0 4px 12px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4ade80, #15803d)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        flexShrink: 0,
                      }}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>{t.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{t.location}</div>
                    </div>
                  </div>

                  <div style={{ color: '#eab308', fontSize: '1rem', marginBottom: '0.75rem' }}>
                    {'★'.repeat(t.rating)}
                  </div>

                  <p style={{ fontSize: '0.92rem', color: '#4b5563', lineHeight: 1.6, margin: 0 }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a' }}>
                    ✓ Verified Attendee
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section id="faq" style={{ padding: '96px 1rem', background: '#ffffff' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span
              style={{
                display: 'inline-block',
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '0.4rem 1rem',
                borderRadius: '999px',
                marginBottom: '1rem',
                textTransform: 'uppercase',
              }}
            >
              FAQ
            </span>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', fontWeight: 900, color: '#111827', margin: '0 0 1rem 0' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>
              Still have questions? Here are clear answers to the most common queries.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {faqs.map((faq: FaqItemData, index: number) => (
              <FaqItem
                key={index}
                question={faq.q}
                answer={faq.a}
                isOpen={openFaq === index}
                onToggle={() => setOpenFaq(openFaq === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final Call to Action Section ── */}
      <section
        style={{
          padding: '96px 1rem 64px 1rem',
          background: 'linear-gradient(180deg, #edf6f0 0%, #f7fbf8 50%, #ffffff 100%)',
          borderTop: '1px solid #e2efe6',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '750px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '999px',
              padding: '0.4rem 1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <span style={{ color: '#b91c1c', fontSize: '0.85rem', fontWeight: 800 }}>
              ⚡ LIMITED SEATS — Only {spotsLeft} spots available
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 4.5vw, 3rem)', fontWeight: 900, color: '#143623', marginBottom: '1rem' }}>
            Don&apos;t Miss Your Spot
          </h2>

          <p style={{ fontSize: '1.15rem', color: '#4a6b57', lineHeight: 1.6, marginBottom: '2.5rem', fontWeight: 500 }}>
            Join <strong style={{ color: '#143623', fontWeight: 800 }}>{trainer?.name || 'Shanthi Ramakrishnamurthy'}</strong> live on{' '}
            <strong style={{ color: '#143623', fontWeight: 800 }}>{dates.full}</strong> and start your own microgreens journey.
          </p>

          <Link
            id="footer-register-btn"
            to={registerUrl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: '#1e5631',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '1.25rem',
              padding: '1.25rem 3rem',
              borderRadius: '20px',
              textDecoration: 'none',
              boxShadow: '0 16px 36px rgba(30, 86, 49, 0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{primaryCtaText}</span>
          </Link>

          <p style={{ marginTop: '1.25rem', fontSize: '0.9rem', color: '#6b8e78', fontWeight: 600 }}>
            No credit card needed · 100% Free · Instant Confirmation
          </p>

          {/* Footer Bottom */}
          <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid #e2efe6' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              {branding?.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={brandName}
                  style={{ height: '36px', maxWidth: '160px', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ fontWeight: 900, color: '#1e5631', fontSize: '1.2rem' }}>{brandName}</div>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem', color: '#4a6b57', fontWeight: 600 }}>
              <a href="https://kravemicrogreens.in" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                kravemicrogreens.in
              </a>
              <span>·</span>
              <a href="https://kravemicrogreens.in/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                Privacy Policy
              </a>
              <span>·</span>
              <Link to="/privacy/request-deletion" style={{ color: 'inherit', textDecoration: 'none' }}>
                Data Deletion (DPDP)
              </Link>
              <span>·</span>
              <a href="https://kravemicrogreens.in/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                Terms
              </a>
              <span>·</span>
              <span>© {new Date().getFullYear()} {brandName}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mobile Sticky Bottom Bar ── */}
      <div
        className="landing-mobile-sticky-bar"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid #e2efe6',
          padding: '0.75rem 1rem',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
          display: 'none',
        }}
      >
        <Link
          id="sticky-register-btn"
          to={registerUrl}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            background: '#1e5631',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: '1rem',
            padding: '0.85rem',
            borderRadius: '14px',
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(30, 86, 49, 0.2)',
          }}
        >
          <span>{primaryCtaText}</span>
        </Link>
      </div>

      {/* Media Query Styles for Desktop/Mobile specific rules */}
      <style>{`
        @media (min-width: 768px) {
          .landing-nav-chip {
            display: flex !important;
          }
        }
        @media (max-width: 767px) {
          .landing-mobile-sticky-bar {
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}
