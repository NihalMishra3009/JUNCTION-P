"use client";
import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/state/AppContext";
import { MOCK_EVENT } from "@/data/mockEvent";
import { Compass, Hotel, UtensilsCrossed, Ticket } from "lucide-react";
import styles from "./home.module.css";
import showcaseStyles from "./showcase.module.css";

/* =========================================================================
   1. EXISTING ATTENDEE APPLICATION HOME / DASHBOARD (PRESERVED IN FULL)
   Rendered when accessed via /attendee?app=true
   ========================================================================= */
function ExistingAttendeeDashboard() {
  const {
    activeScenario,
    hasAttendeeRecommendation,
    attendeeRecommendationMessage,
    attendeeSelectedRouteId,
    alerts,
  } = useApp();
  const topAlert = alerts[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "GOOD MORNING" : hour < 17 ? "GOOD AFTERNOON" : "GOOD EVENING";

  return (
    <div className={styles.page}>
      {/* GREETING */}
      <div className={styles.greeting}>
        <span className={styles.greetText}>{greeting}</span>
        <div className={styles.eventCard}>
          <div className={styles.eventInfo}>
            <span className="pill pill-live" style={{ fontSize: 10 }}>● LIVE</span>
            <h2 className={styles.eventName}>{MOCK_EVENT.name}</h2>
            <span className={styles.eventMeta}>{MOCK_EVENT.venue} · {MOCK_EVENT.startTime} · Gate 3</span>
          </div>
        </div>
      </div>

      {/* ALERT BANNER */}
      {(topAlert || hasAttendeeRecommendation) && (
        <div className={styles.alertBanner}>
          <div className={styles.alertBannerIcon}>!</div>
          <div className={styles.alertBannerContent}>
            <span className={styles.alertBannerTitle}>
              {hasAttendeeRecommendation ? "Organizer recommendation" : topAlert?.title}
            </span>
            <p className={styles.alertBannerMsg}>
              {hasAttendeeRecommendation ? attendeeRecommendationMessage : topAlert?.message}
            </p>
          </div>
          <Link href="/attendee/plan" className="btn btn-yellow btn-sm" style={{ flexShrink: 0 }}>
            See Options
          </Link>
        </div>
      )}

      {/* YOUR JOURNEY */}
      <div className={styles.journeyCard}>
        <span className="text-meta">Your Journey</span>
        <div className={styles.journeyRoute}>
          <div className={styles.journeyFrom}>
            <span className={styles.routeLabel}>FROM</span>
            <span className={styles.routePlace}>Harbour Line Area</span>
          </div>
          <div className={styles.routeArrow}>→</div>
          <div className={styles.journeyTo}>
            <span className={styles.routeLabel}>TO</span>
            <span className={styles.routePlace}>Wankhede Stadium</span>
          </div>
        </div>
        {attendeeSelectedRouteId ? (
          <div className={styles.selectedRoute}>
            <span className="pill pill-live">Route Selected: {attendeeSelectedRouteId}</span>
            <span className={styles.selectedTime}>{attendeeSelectedRouteId === "FASTEST" ? "24" : attendeeSelectedRouteId === "BALANCED" ? "31" : "48"} min</span>
          </div>
        ) : (
          <div className={styles.journeyMeta}>
            <span className={styles.journeyTime}>31 min</span>
            <span className={styles.journeyType}>Balanced route · Recommended</span>
          </div>
        )}
        <Link href="/attendee/plan" className="btn btn-yellow" style={{ width: "100%", marginTop: 12 }}>
          {attendeeSelectedRouteId ? "Change Route" : "VIEW JOURNEY"}
        </Link>
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <span className="text-meta" style={{ marginBottom: 12, display: "block" }}>Quick Actions</span>
        <div className={styles.quickGrid}>
          {[
            { href: "/attendee/plan", label: "Plan Journey", icon: <Compass size={18} /> },
            { href: "/attendee/stay", label: "Find Stay", icon: <Hotel size={18} /> },
            { href: "/attendee/food", label: "Food & Services", icon: <UtensilsCrossed size={18} /> },
            { href: "/attendee/event", label: "Event Info", icon: <Ticket size={18} /> },
          ].map(q => (
            <Link key={q.href} href={q.href} className={styles.quickCard}>
              <span className={styles.quickIcon}>{q.icon}</span>
              <span className={styles.quickLabel}>{q.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ALL ALERTS */}
      <div>
        <span className="text-meta" style={{ marginBottom: 12, display: "block" }}>Alerts</span>
        <div className={styles.alertsList}>
          {alerts.map(a => (
            <div key={a.id} className={`${styles.alertItem} ${styles[`alert${a.severity}`]}`}>
              <div className={styles.alertItemHeader}>
                <span className={`pill ${a.severity === "CRITICAL" ? "pill-critical" : a.severity === "HIGH" ? "pill-high" : "pill-watch"}`}>{a.category}</span>
                <span className={styles.alertTime}>{a.timestamp}</span>
              </div>
              <span className={styles.alertTitle}>{a.title}</span>
              {a.actionLabel && (
                <Link href={a.actionRoute || "/attendee/plan"} className="btn btn-outline btn-sm" style={{ alignSelf: "flex-start", marginTop: 4 }}>
                  {a.actionLabel}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.simLabel}>
        <span className="simulated-env-label tooltip-simulated">
          <span className="simulated-dot" />
          Simulated Environment · All data is prototype demonstration
        </span>
      </div>
    </div>
  );
}

/* =========================================================================
   2. PUBLIC ATTENDEE JOURNEY PLATFORM SHOWCASE (NEW)
   Rendered when accessed via /attendee
   ========================================================================= */
const APK_DOWNLOAD_URL =
  "https://github.com/NihalMishra3009/Junction-App/releases/latest/download/junction-attendee.apk";

const QR_CODE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
  APK_DOWNLOAD_URL
)}&margin=6&color=111111&bgcolor=FFFFFF`;

function AttendeeShowcase() {
  return (
    <div className={showcaseStyles.container}>
      {/* HEADER */}
      <header className={showcaseStyles.header}>
        <div className={showcaseStyles.headerInner}>
          <div className={showcaseStyles.headerBrand}>
            <Link href="/" className={showcaseStyles.logo}>JUNCTION</Link>
            <span className={showcaseStyles.brandBadge}>ATTENDEE PLATFORM</span>
          </div>
          <nav className={showcaseStyles.headerNav}>
            <Link href="/" className={showcaseStyles.backLink}>
              ← Main Overview
            </Link>
            <a href={APK_DOWNLOAD_URL} className={showcaseStyles.headerCta}>
              OPEN ATTENDEE APP →
            </a>
          </nav>
        </div>
      </header>

      {/* HERO SECTION WITH INTEGRATED QR CODE */}
      <section className={showcaseStyles.heroSection}>
        <div className={showcaseStyles.heroInner}>
          {/* LEFT: EDITORIAL MESSAGING */}
          <div className={showcaseStyles.heroContent}>
            <div className={showcaseStyles.eyebrow}>
              <span className={showcaseStyles.statusPill}>
                <span className={showcaseStyles.statusDot} />
                LIVE PLATFORM
              </span>
              <span className={showcaseStyles.eyebrowText}>MUMBAI · IPL SEASON 2026</span>
            </div>

            <h1 className={showcaseStyles.heroTitle}>
              ATTENDEE JOURNEY PLATFORM
            </h1>

            <h2 className={showcaseStyles.heroSubtitle}>
              Plan smarter. Travel smoother. Experience more.
            </h2>

            <p className={showcaseStyles.heroBody}>
              JUNCTION helps event attendees navigate the destination while responding to live event conditions — coordinating routes, accommodation, dining, and matchday access from a single real-time operational picture.
            </p>

            <div className={showcaseStyles.heroActions}>
              <a href={APK_DOWNLOAD_URL} className={showcaseStyles.primaryCta}>
                OPEN ATTENDEE APP →
              </a>
              <a href="#capabilities" className={showcaseStyles.secondaryCta}>
                EXPLORE CAPABILITIES ↓
              </a>
            </div>
          </div>

          {/* RIGHT: PROMINENT QR CODE SECTION */}
          <div className={showcaseStyles.qrCardContainer}>
            <div className={showcaseStyles.qrCard}>
              <span className={showcaseStyles.qrCardBadge}>Android Release</span>
              <h3 className={showcaseStyles.qrCardTitle}>TAKE JUNCTION WITH YOU</h3>
              <p className={showcaseStyles.qrCardSub}>SCAN TO DOWNLOAD</p>

              <div className={showcaseStyles.qrFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={QR_CODE_URL}
                  alt="Scan to download JUNCTION Attendee App"
                  className={showcaseStyles.qrImage}
                  width={216}
                  height={216}
                />
              </div>

              <p className={showcaseStyles.qrInstruction}>
                Scan with your phone camera to download the JUNCTION Attendee App.
              </p>

              <a href={APK_DOWNLOAD_URL} className={showcaseStyles.qrButton}>
                OPEN ATTENDEE APP →
              </a>

              <span className={showcaseStyles.qrNote}>
                Android APK · Direct Release Download
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES SECTION */}
      <section className={showcaseStyles.capabilitiesSection} id="capabilities">
        <div className={showcaseStyles.sectionHeader}>
          <span className={showcaseStyles.sectionEyebrow}>PLATFORM CAPABILITIES</span>
          <h2 className={showcaseStyles.sectionHeading}>
            Ground-level guidance powered by destination signals.
          </h2>
          <p className={showcaseStyles.sectionDesc}>
            Built on top of actual operational data to help attendees navigate transit crowds, accommodation demand, and matchday logistics.
          </p>
        </div>

        <div className={showcaseStyles.capabilityGrid}>
          {/* Card 1: Journey Planning */}
          <div className={showcaseStyles.capabilityCard}>
            <div>
              <div className={showcaseStyles.cardTop}>
                <div className={showcaseStyles.cardIconBox}>◇</div>
                <span className={showcaseStyles.cardNumber}>01</span>
              </div>
              <h3 className={showcaseStyles.cardTitle}>JOURNEY PLANNING</h3>
              <p className={showcaseStyles.cardDesc}>
                Compare routes and make movement decisions based on journey conditions across Western, Central, and Harbour corridors.
              </p>
            </div>
            <div className={showcaseStyles.cardMeta}>
              <span className={showcaseStyles.cardFeatureBadge}>Transit &amp; Route Comparison</span>
              <span className={showcaseStyles.cardArrow}>→</span>
            </div>
          </div>

          {/* Card 2: Stay */}
          <div className={showcaseStyles.capabilityCard}>
            <div>
              <div className={showcaseStyles.cardTop}>
                <div className={showcaseStyles.cardIconBox}>◈</div>
                <span className={showcaseStyles.cardNumber}>02</span>
              </div>
              <h3 className={showcaseStyles.cardTitle}>STAY</h3>
              <p className={showcaseStyles.cardDesc}>
                Discover accommodation options using destination pressure and usable capacity, avoiding saturated clusters near stadium zones.
              </p>
            </div>
            <div className={showcaseStyles.cardMeta}>
              <span className={showcaseStyles.cardFeatureBadge}>Pressure-Aware Lodging</span>
              <span className={showcaseStyles.cardArrow}>→</span>
            </div>
          </div>

          {/* Card 3: Food & Services */}
          <div className={showcaseStyles.capabilityCard}>
            <div>
              <div className={showcaseStyles.cardTop}>
                <div className={showcaseStyles.cardIconBox}>◆</div>
                <span className={showcaseStyles.cardNumber}>03</span>
              </div>
              <h3 className={showcaseStyles.cardTitle}>FOOD &amp; SERVICES</h3>
              <p className={showcaseStyles.cardDesc}>
                Find dining and essential service options and respond to real-time demand conditions and wait-time surges around Marine Drive.
              </p>
            </div>
            <div className={showcaseStyles.cardMeta}>
              <span className={showcaseStyles.cardFeatureBadge}>Demand Index &amp; Timing</span>
              <span className={showcaseStyles.cardArrow}>→</span>
            </div>
          </div>

          {/* Card 4: Event */}
          <div className={showcaseStyles.capabilityCard}>
            <div>
              <div className={showcaseStyles.cardTop}>
                <div className={showcaseStyles.cardIconBox}>★</div>
                <span className={showcaseStyles.cardNumber}>04</span>
              </div>
              <h3 className={showcaseStyles.cardTitle}>EVENT</h3>
              <p className={showcaseStyles.cardDesc}>
                Access match and event information, gate assignments, schedules, and relevant entry notices for Wankhede Stadium.
              </p>
            </div>
            <div className={showcaseStyles.cardMeta}>
              <span className={showcaseStyles.cardFeatureBadge}>Gates, Timings &amp; Notices</span>
              <span className={showcaseStyles.cardArrow}>→</span>
            </div>
          </div>

          {/* Card 5: Live Guidance */}
          <div className={showcaseStyles.capabilityCard}>
            <div>
              <div className={showcaseStyles.cardTop}>
                <div className={showcaseStyles.cardIconBox}>◉</div>
                <span className={showcaseStyles.cardNumber}>05</span>
              </div>
              <h3 className={showcaseStyles.cardTitle}>LIVE GUIDANCE</h3>
              <p className={showcaseStyles.cardDesc}>
                Receive attendee guidance based on changing destination conditions, incidents, and organizer-approved diversion advisories.
              </p>
            </div>
            <div className={showcaseStyles.cardMeta}>
              <span className={showcaseStyles.cardFeatureBadge}>Dynamic Closed-Loop Alerts</span>
              <span className={showcaseStyles.cardArrow}>→</span>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT STORY / CLOSED LOOP */}
      <section className={showcaseStyles.storySection}>
        <div className={showcaseStyles.storyInner}>
          <div className={showcaseStyles.storyHeader}>
            <span className={showcaseStyles.sectionEyebrow}>THE CLOSED-LOOP CONCEPT</span>
            <h2 className={showcaseStyles.storyTitle}>
              One operational picture for organizers and attendees.
            </h2>
            <p className={showcaseStyles.storyText}>
              JUNCTION doesn&apos;t only help operators manage the destination. It gives attendees guidance based on the exact same operational picture.
            </p>
          </div>

          <div className={showcaseStyles.loopFlow}>
            <div className={showcaseStyles.loopStepCard}>
              <span className={showcaseStyles.stepTag}>STEP 01</span>
              <h4 className={showcaseStyles.stepTitle}>DESTINATION INTELLIGENCE</h4>
              <p className={showcaseStyles.stepDesc}>
                Operators observe real-time crowd pressure, transit headway shifts, and corridor saturation across the destination.
              </p>
            </div>

            <div className={showcaseStyles.flowConnector}>→</div>

            <div className={showcaseStyles.loopStepCard}>
              <span className={showcaseStyles.stepTag}>STEP 02</span>
              <h4 className={showcaseStyles.stepTitle}>ATTENDEE GUIDANCE</h4>
              <p className={showcaseStyles.stepDesc}>
                Verified interventions and predictive recommendations are pushed directly to attendee journey interfaces as actionable advice.
              </p>
            </div>

            <div className={showcaseStyles.flowConnector}>→</div>

            <div className={showcaseStyles.loopStepCard}>
              <span className={showcaseStyles.stepTag}>STEP 03</span>
              <h4 className={showcaseStyles.stepTitle}>BETTER JOURNEY</h4>
              <p className={showcaseStyles.stepDesc}>
                Attendees avoid peak congestion, disperse pressure across balanced transit routes, and reach their venue safely on schedule.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className={showcaseStyles.ctaSection}>
        <div className={showcaseStyles.ctaCard}>
          <span className={showcaseStyles.ctaEyebrow}>START YOUR MATCHDAY JOURNEY</span>
          <h2 className={showcaseStyles.ctaTitle}>READY TO EXPERIENCE JUNCTION?</h2>
          <p className={showcaseStyles.ctaText}>
            Download the official JUNCTION Attendee Android app or scan the QR code to experience destination-guided travel.
          </p>
          <div className={showcaseStyles.ctaButtonGroup}>
            <a href={APK_DOWNLOAD_URL} className={showcaseStyles.ctaYellowBtn}>
              OPEN ATTENDEE APP →
            </a>
            <Link href="/" className={showcaseStyles.ctaSecondaryBtn}>
              BACK TO MAIN OVERVIEW
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={showcaseStyles.footer}>
        <div className={showcaseStyles.footerInner}>
          <div className={showcaseStyles.footerBrand}>
            <span className={showcaseStyles.footerLogo}>JUNCTION</span>
            <span className={showcaseStyles.footerMeta}>· Attendee Journey Platform</span>
          </div>
          <span className={showcaseStyles.footerMeta}>
            Simulated Environment · Mumbai IPL Season 2026 · Prototype Demonstration
          </span>
        </div>
      </footer>
    </div>
  );
}

/* =========================================================================
   3. MAIN ATTENDEE ENTRY ROUTE
   Routes to AttendeeShowcase on /attendee
   Routes to ExistingAttendeeDashboard on /attendee?app=true
   ========================================================================= */
function AttendeePageRouter() {
  const searchParams = useSearchParams();
  const isAppMode = searchParams.get("app") === "true";

  if (isAppMode) {
    return <ExistingAttendeeDashboard />;
  }

  return <AttendeeShowcase />;
}

export default function AttendeePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--paper)" }} />}>
      <AttendeePageRouter />
    </Suspense>
  );
}
