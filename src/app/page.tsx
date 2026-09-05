import Link from "next/link";
import styles from "./landing.module.css";

export default function LandingPage() {
  return (
    <main className={styles.page}>
      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <span className={styles.navLogo}>JUNCTION</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#platform" className={styles.navLink}>Platform</a>
          <a href="#solution" className={styles.navLink}>Solution</a>
          <a href="#about" className={styles.navLink}>About</a>
        </div>
        <Link href="/organizer" className={`btn btn-primary ${styles.navCta}`}>
          ENTER
        </Link>
      </nav>

      {/* HERO — SPLIT SCREEN */}
      <section className={styles.hero}>
        {/* LEFT — COPY */}
        <div className={styles.heroLeft}>
          <div className={styles.heroEyebrow}>
            <span className="pill pill-simulated">● Simulated Environment</span>
            <span className={styles.eyebrowText}>Mumbai · IPL Season 2026</span>
          </div>

          <h1 className={styles.heroHeadline}>
            <span className={styles.heroLine1}>ORCHESTRATING</span>
            <span className={styles.heroLine2}>EVERY</span>
            <span className={styles.heroLine3}>JOURNEY.</span>
          </h1>

          <p className={styles.heroTagline}>
            JUNCTION — Orchestrating Every Journey
          </p>

          <p className={styles.heroCopy}>
            Predict the demand wave. Find where capacity will break.
            Simulate what can be done. Help people make better choices
            before bottlenecks occur.
          </p>

          <div className={styles.heroCtas}>
            <Link href="/organizer" className={`btn btn-yellow btn-lg ${styles.ctaPrimary}`}>
              ENTER JUNCTION
            </Link>
            <Link href="#solution" className={`btn btn-outline btn-lg`}>
              SEE HOW IT WORKS
            </Link>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>33,000</span>
              <span className={styles.heroStatLabel}>Expected attendees</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>12+</span>
              <span className={styles.heroStatLabel}>Destination zones</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>94%</span>
              <span className={styles.heroStatLabel}>Peak pressure predicted</span>
            </div>
          </div>
        </div>

        {/* RIGHT — DESTINATION INTELLIGENCE VIZ */}
        <div className={styles.heroRight}>
          <DestinationViz />
          <div className={styles.vizLabel}>
            <span className="simulated-env-label">
              <span className="simulated-dot" />
              Simulated Environment
            </span>
          </div>
        </div>
      </section>

      {/* CORE LOOP — HOW IT WORKS */}
      <section className={styles.howSection} id="solution">
        <div className={styles.howHeader}>
          <span className="text-meta">The Core Loop</span>
          <h2 className="text-section-heading">The event is the trigger.<br />The destination is the system.</h2>
        </div>
        <div className={styles.loopGrid}>
          {[
            { step: "01", label: "OBSERVE", desc: "Crowd, transport, hotels, restaurants, roads — unified in real time." },
            { step: "02", label: "PREDICT", desc: "Forecast demand pressure at every node up to 60 minutes ahead." },
            { step: "03", label: "SIMULATE", desc: "Run what-if scenarios before pressure becomes a problem." },
            { step: "04", label: "RECOMMEND", desc: "Explainable, structured recommendations with expected impact." },
            { step: "05", label: "DECIDE", desc: "Organizers approve or reject. AI never acts autonomously." },
            { step: "06", label: "GUIDE", desc: "Attendees receive personalized route, stay, and timing guidance." },
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
          <span className="text-meta">Three Interfaces. One Platform.</span>
          <h2 className="text-section-heading">Built for every stakeholder.</h2>
        </div>
        <div className={styles.portalsGrid}>
          <Link href="/organizer" className={styles.portalCard}>
            <div className={styles.portalIcon}>⌘</div>
            <h3 className={styles.portalTitle}>Organizer Command Center</h3>
            <p className={styles.portalDesc}>Destination map, pressure analytics, cascade tracing, what-if simulation, and recommendation approval.</p>
            <span className={styles.portalCta}>Open Dashboard →</span>
          </Link>
          <Link href="/attendee" className={styles.portalCard}>
            <div className={styles.portalIcon}>◎</div>
            <h3 className={styles.portalTitle}>Attendee Journey Platform</h3>
            <p className={styles.portalDesc}>Personalized route planning, accommodation recommendations, real-time alerts, food & services guidance.</p>
            <span className={styles.portalCta}>Open Platform →</span>
          </Link>
          <Link href="/partner" className={styles.portalCard}>
            <div className={styles.portalIcon}>◈</div>
            <h3 className={styles.portalTitle}>Partner Portal</h3>
            <p className={styles.portalDesc}>Hotels, restaurants, and service operators update availability and receive event demand signals.</p>
            <span className={styles.portalCta}>Open Portal →</span>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <span className={styles.footerLogo}>JUNCTION</span>
          <span className={styles.footerTagline}>Orchestrating Every Journey</span>
        </div>
        <div className={styles.footerMeta}>
          <span className="simulated-env-label tooltip-simulated">
            <span className="simulated-dot" />
            Simulated Environment · Prototype
          </span>
          <span className={styles.footerRight}>Mumbai · IPL Season 2026 · All data simulated</span>
        </div>
      </footer>
    </main>
  );
}

function DestinationViz() {
  return (
    <svg
      viewBox="0 0 500 440"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.destViz}
      aria-label="Destination intelligence schematic map"
    >
      <defs>
        <radialGradient id="halocrit" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="halohigh" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="halowatch" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5C400" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#F5C400" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="halomain" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5C400" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#F5C400" stopOpacity="0" />
        </radialGradient>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#F5C400" opacity="0.7" />
        </marker>
        <marker id="arrowred" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#EF4444" opacity="0.6" />
        </marker>
        <marker id="arrowgrey" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#999" opacity="0.5" />
        </marker>
      </defs>

      {/* Background grid dots */}
      <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="1" fill="#E7E5DE" opacity="0.8" />
      </pattern>
      <rect width="500" height="440" fill="url(#dots)" />

      {/* === ROAD LINES === */}
      <line x1="320" y1="290" x2="220" y2="350" stroke="#CCCAB8" strokeWidth="3" strokeLinecap="round" />
      <line x1="320" y1="290" x2="260" y2="295" stroke="#CCCAB8" strokeWidth="3" strokeLinecap="round" />
      <line x1="320" y1="290" x2="450" y2="240" stroke="#CCCAB8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="320" y1="290" x2="380" y2="130" stroke="#CCCAB8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="220" y1="350" x2="120" y2="380" stroke="#CCCAB8" strokeWidth="2" strokeLinecap="round" />
      <line x1="450" y1="240" x2="380" y2="130" stroke="#CCCAB8" strokeWidth="2" strokeLinecap="round" />
      <line x1="260" y1="295" x2="220" y2="350" stroke="#CCCAB8" strokeWidth="2" strokeLinecap="round" />
      {/* Marine Drive coastal road */}
      <path d="M 100 310 Q 180 330 260 295 Q 310 285 320 290" stroke="#CCCAB8" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* === CROWD FLOW ARROWS — animated === */}
      {/* Churchgate → Wankhede */}
      <g className={styles.flowArrow} style={{"--flow-delay":"0s"} as React.CSSProperties}>
        <line x1="235" y1="342" x2="300" y2="298" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="5,4" markerEnd="url(#arrowred)" opacity="0.7" />
      </g>
      {/* CSMT → Wankhede */}
      <g className={styles.flowArrow} style={{"--flow-delay":"0.5s"} as React.CSSProperties}>
        <line x1="435" y1="248" x2="340" y2="284" stroke="#F5C400" strokeWidth="1.5" strokeDasharray="5,4" markerEnd="url(#arrow)" opacity="0.7" />
      </g>
      {/* Dadar → Wankhede */}
      <g className={styles.flowArrow} style={{"--flow-delay":"1s"} as React.CSSProperties}>
        <line x1="382" y1="148" x2="330" y2="278" stroke="#F5C400" strokeWidth="1.5" strokeDasharray="5,4" markerEnd="url(#arrow)" opacity="0.6" />
      </g>
      {/* Marine Lines → Wankhede */}
      <g className={styles.flowArrow} style={{"--flow-delay":"1.5s"} as React.CSSProperties}>
        <line x1="274" y1="297" x2="306" y2="290" stroke="#999" strokeWidth="1.5" strokeDasharray="5,4" markerEnd="url(#arrowgrey)" opacity="0.5" />
      </g>

      {/* === PRESSURE HALOS === */}
      {/* Churchgate — WATCH */}
      <circle cx="220" cy="350" r="52" fill="url(#halocrit)" className={styles.haloAnimate} />
      <circle cx="220" cy="350" r="38" fill="url(#halocrit)" className={styles.haloAnimate} style={{"--halo-delay":"0.5s"} as React.CSSProperties} />
      {/* Wankhede — main event */}
      <circle cx="320" cy="290" r="65" fill="url(#halomain)" className={styles.haloAnimate} style={{"--halo-delay":"0.3s"} as React.CSSProperties} />
      {/* CSMT — WATCH */}
      <circle cx="450" cy="240" r="42" fill="url(#halowatch)" className={styles.haloAnimate} style={{"--halo-delay":"0.7s"} as React.CSSProperties} />
      {/* Taxi Zone — HIGH */}
      <circle cx="370" cy="340" r="30" fill="url(#halohigh)" className={styles.haloAnimate} style={{"--halo-delay":"1s"} as React.CSSProperties} />

      {/* === HOTEL MARKERS === */}
      <rect x="158" y="258" width="10" height="10" rx="2" fill="#111" opacity="0.5" />
      <rect x="174" y="262" width="8" height="8" rx="2" fill="#111" opacity="0.4" />
      <rect x="148" y="310" width="9" height="9" rx="2" fill="#111" opacity="0.4" />
      <rect x="415" y="160" width="10" height="10" rx="2" fill="#111" opacity="0.5" />
      <rect x="400" y="175" width="8" height="8" rx="2" fill="#111" opacity="0.4" />
      {/* Hotel labels */}
      <text x="145" y="256" fontSize="8" fill="#666" fontFamily="Inter, sans-serif" letterSpacing="0.04em">HOTEL</text>
      <text x="408" y="158" fontSize="8" fill="#666" fontFamily="Inter, sans-serif" letterSpacing="0.04em">HOTEL</text>

      {/* === RESTAURANT MARKERS === */}
      <circle cx="192" cy="310" r="4" fill="#F97316" opacity="0.6" />
      <circle cx="350" cy="200" r="4" fill="#F97316" opacity="0.6" />
      <circle cx="290" cy="255" r="4" fill="#F97316" opacity="0.5" />

      {/* === TAXI/PICKUP ZONE === */}
      <rect x="355" y="325" width="32" height="20" rx="4" fill="#F5C400" opacity="0.3" stroke="#F5C400" strokeWidth="1" />
      <text x="371" y="338" fontSize="7" fill="#111" fontFamily="Inter, sans-serif" textAnchor="middle" letterSpacing="0.04em">TAXI</text>

      {/* === STATION NODES === */}
      {/* Churchgate */}
      <circle cx="220" cy="350" r="22" fill="white" stroke="#EF4444" strokeWidth="2.5" />
      <circle cx="220" cy="350" r="14" fill="#EF4444" opacity="0.15" />
      <circle cx="220" cy="350" r="7" fill="#EF4444" />
      <text x="220" y="382" fontSize="9.5" fill="#111" fontFamily="Space Grotesk, sans-serif" fontWeight="600" textAnchor="middle" letterSpacing="0.04em">CHURCHGATE</text>
      <text x="220" y="393" fontSize="8" fill="#EF4444" fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="600">94%</text>

      {/* Marine Lines */}
      <circle cx="260" cy="295" r="15" fill="white" stroke="#CA8A04" strokeWidth="2" />
      <circle cx="260" cy="295" r="7" fill="#CA8A04" opacity="0.4" />
      <circle cx="260" cy="295" r="4" fill="#CA8A04" />
      <text x="260" y="274" fontSize="8.5" fill="#111" fontFamily="Space Grotesk, sans-serif" fontWeight="600" textAnchor="middle" letterSpacing="0.03em">MARINE LINES</text>

      {/* CSMT */}
      <circle cx="450" cy="240" r="18" fill="white" stroke="#CA8A04" strokeWidth="2" />
      <circle cx="450" cy="240" r="10" fill="#CA8A04" opacity="0.15" />
      <circle cx="450" cy="240" r="5" fill="#CA8A04" />
      <text x="450" y="216" fontSize="9.5" fill="#111" fontFamily="Space Grotesk, sans-serif" fontWeight="600" textAnchor="middle" letterSpacing="0.04em">CSMT</text>
      <text x="450" y="227" fontSize="8" fill="#CA8A04" fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="600">58%</text>

      {/* Dadar */}
      <circle cx="380" cy="130" r="18" fill="white" stroke="#16A34A" strokeWidth="2" />
      <circle cx="380" cy="130" r="9" fill="#16A34A" opacity="0.15" />
      <circle cx="380" cy="130" r="5" fill="#16A34A" />
      <text x="380" y="109" fontSize="9.5" fill="#111" fontFamily="Space Grotesk, sans-serif" fontWeight="600" textAnchor="middle" letterSpacing="0.04em">DADAR</text>
      <text x="380" y="120" fontSize="8" fill="#16A34A" fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="600">58%</text>

      {/* === WANKHEDE — MAIN EVENT NODE === */}
      <circle cx="320" cy="290" r="38" fill="#F5C400" opacity="0.2" />
      <circle cx="320" cy="290" r="28" fill="#111" />
      <circle cx="320" cy="290" r="22" fill="#F5C400" opacity="0.2" />
      {/* W icon */}
      <text x="320" y="296" fontSize="13" fill="#F5C400" fontFamily="Space Grotesk, sans-serif" fontWeight="700" textAnchor="middle">W</text>
      <text x="320" y="344" fontSize="10" fill="#111" fontFamily="Space Grotesk, sans-serif" fontWeight="700" textAnchor="middle" letterSpacing="0.05em">WANKHEDE</text>
      <text x="320" y="356" fontSize="8.5" fill="#666" fontFamily="Inter, sans-serif" textAnchor="middle">STADIUM · IPL</text>

      {/* Taxi zone label */}
      <text x="371" y="316" fontSize="8" fill="#111" fontFamily="Space Grotesk, sans-serif" fontWeight="600" textAnchor="middle" letterSpacing="0.04em">PICKUP</text>

      {/* === LEGEND === */}
      <rect x="12" y="400" width="200" height="32" rx="8" fill="white" opacity="0.9" />
      <circle cx="28" cy="416" r="4" fill="#EF4444" />
      <text x="37" y="420" fontSize="8" fill="#333" fontFamily="Inter, sans-serif">Critical</text>
      <circle cx="78" cy="416" r="4" fill="#F97316" />
      <text x="87" y="420" fontSize="8" fill="#333" fontFamily="Inter, sans-serif">High</text>
      <circle cx="120" cy="416" r="4" fill="#CA8A04" />
      <text x="129" y="420" fontSize="8" fill="#333" fontFamily="Inter, sans-serif">Watch</text>
      <circle cx="162" cy="416" r="4" fill="#16A34A" />
      <text x="171" y="420" fontSize="8" fill="#333" fontFamily="Inter, sans-serif">Normal</text>
    </svg>
  );
}
