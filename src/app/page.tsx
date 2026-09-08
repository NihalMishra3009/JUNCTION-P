"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/state/AuthContext";
import styles from "./landing.module.css";

export default function LandingPage() {
  const { currentUser, isAuthenticated, logout } = useAuth();

  const organizerRoute = isAuthenticated && currentUser?.role === "ORGANIZER" ? "/organizer" : "/login?redirect=/organizer";
  const partnerRoute = isAuthenticated && currentUser?.role === "PARTNER" ? "/partner" : "/login?redirect=/partner";
  const primaryCtaRoute = isAuthenticated && currentUser ? currentUser.defaultRoute : "/login";
  const primaryCtaLabel = isAuthenticated && currentUser
    ? `ENTER ${currentUser.role === "ORGANIZER" ? "OPERATIONS" : "PORTAL"} →`
    : "SIGN IN / ENTER JUNCTION →";

  return (
    <main className={styles.page}>
      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <span className={styles.navLogo}>JUNCTION</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#solution" className={styles.navLink}>SOLUTION</a>
          <a href="#platform" className={styles.navLink}>PLATFORM</a>
          <a href="#about" className={styles.navLink}>ABOUT</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isAuthenticated && currentUser ? (
            <>
              <span className="pill pill-yellow" style={{ fontSize: 9, padding: "2px 7px" }}>
                {currentUser.role}: {currentUser.displayName}
              </span>
              <Link href={currentUser.defaultRoute} className={`btn btn-primary ${styles.navCta}`}>
                OPEN PORTAL →
              </Link>
              <button
                type="button"
                onClick={logout}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, color: "var(--red)", fontWeight: 700 }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/login" className={`btn btn-primary ${styles.navCta}`}>
              SIGN IN →
            </Link>
          )}
        </div>
      </nav>

      {/* HERO — ONE EDITORIAL CANVAS */}
      <section className={styles.hero}>
        {/* Top sweeping yellow curve background SVG */}
        <svg className={styles.topCurve} viewBox="0 0 1440 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M -20 100 C 180 230, 480 160, 680 0" stroke="#F5C400" strokeWidth="2.5" opacity="0.85" />
        </svg>

        <div className={styles.heroCanvas}>
          {/* LEFT: illustration — crisp & unmasked, occupying left side */}
          <div className={styles.heroArt} aria-hidden="true">
            <Image
              src="/junction_hero.png"
              alt=""
              fill
              priority
              sizes="54vw"
              className={styles.heroArtImg}
            />
          </div>

          {/* RIGHT: brand typography — in natural negative space, never overlapping art */}
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowPill}>
                <span className={styles.eyebrowDot} />
                SIMULATED ENVIRONMENT
              </span>
              <span className={styles.eyebrowRule} />
              <span className={styles.eyebrowMeta}>MUMBAI · IPL SEASON 2026</span>
            </div>

            <h1 className={styles.heroTitle}>JUNCTION</h1>

            <h2 className={styles.heroTagline}>
              Orchestrating Every Journey<span className={styles.taglineDot}>.</span>
            </h2>

            <p className={styles.heroBody}>
              Every event creates thousands of journeys.<br />
              JUNCTION helps bring them together.
            </p>

            <div className={styles.heroCtas}>
              <Link href={primaryCtaRoute} className={styles.ctaPrimary}>
                {primaryCtaLabel}
              </Link>
              <Link href="#solution" className={styles.ctaSecondary}>
                SEE HOW IT WORKS
              </Link>
            </div>

            <div className={styles.heroFooter}>
              <span className={styles.footerRule} />
              <span className={styles.footerMeta}>A MORE CONNECTED TOMORROW</span>
              <span className={styles.footerDots}>
                <span className={styles.footerDot} />
                <span className={styles.footerDot} />
                <span className={styles.footerDot} />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.howSection} id="solution">
        <div className={styles.howHeader}>
          <span className={styles.howEyebrow}>THE CORE LOOP</span>
          <h2 className={styles.howHeading}>
            The event is the trigger.<br />The destination is the system.
          </h2>
        </div>
        <div className={styles.loopGrid}>
          {[
            { step: "01", label: "OBSERVE", desc: "Crowd, transport, hotels, restaurants, roads — unified in real time." },
            { step: "02", label: "PREDICT", desc: "Forecast demand pressure at every node up to 60 minutes ahead." },
            { step: "03", label: "SIMULATE", desc: "Run what-if scenarios before pressure becomes a problem." },
            { step: "04", label: "RECOMMEND", desc: "Explainable, structured recommendations with expected impact." },
            { step: "05", label: "DECIDE", desc: "Organizers approve or reject. AI never acts autonomously." },
            { step: "06", label: "GUIDE", desc: "Attendees receive personalised route, stay, and timing guidance." },
          ].map((item) => (
            <div key={item.step} className={styles.loopCard}>
              <span className={styles.loopStep}>{item.step}</span>
              <h3 className={styles.loopLabel}>{item.label}</h3>
              <p className={styles.loopDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* THREE PORTALS */}
      <section className={styles.portalsSection} id="platform">
        <div className={styles.portalsHeader}>
          <span className={styles.portalsEyebrow}>THREE INTERFACES. ONE PLATFORM.</span>
          <h2 className={styles.portalsHeading}>Built for every stakeholder.</h2>
        </div>
        <div className={styles.portalsGrid}>
          <Link href={organizerRoute} className={styles.portalCard}>
            <div className={styles.portalIcon}>⌘</div>
            <h3 className={styles.portalTitle}>Organizer Command Center</h3>
            <p className={styles.portalDesc}>Destination map, pressure analytics, cascade tracing, what-if simulation, and recommendation approval.</p>
            <span className={styles.portalCta}>
              {isAuthenticated && currentUser?.role === "ORGANIZER" ? "Open Dashboard →" : "Sign In to Access →"}
            </span>
          </Link>
          <Link href="/attendee" className={styles.portalCard}>
            <div className={styles.portalIcon}>◎</div>
            <h3 className={styles.portalTitle}>Attendee Journey Platform</h3>
            <p className={styles.portalDesc}>Personalised route planning, accommodation recommendations, real-time alerts, food &amp; services guidance.</p>
            <span className={styles.portalCta}>Open Platform →</span>
          </Link>
          <Link href={partnerRoute} className={styles.portalCard}>
            <div className={styles.portalIcon}>◈</div>
            <h3 className={styles.portalTitle}>Partner Portal</h3>
            <p className={styles.portalDesc}>Hotels, restaurants, and service operators update availability and receive event demand signals.</p>
            <span className={styles.portalCta}>
              {isAuthenticated && currentUser?.role === "PARTNER" ? "Open Portal →" : "Sign In to Access →"}
            </span>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <span className={styles.footerLogo}>JUNCTION</span>
          <span className={styles.footerTagline}>Orchestrating Every Journey</span>
        </div>
        <div className={styles.footerRight}>
          <span className="simulated-env-label tooltip-simulated">
            <span className="simulated-dot" />
            Simulated Environment · Prototype
          </span>
          <span className={styles.footerSmall}>Mumbai · IPL Season 2026 · All data simulated</span>
        </div>
      </footer>
    </main>
  );
}