"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const PETALS_A = Array.from({ length: 24 }, (_, i) => i);
const PETALS_B = Array.from({ length: 16 }, (_, i) => i);

const CURIOUS_CARDS = [
  {
    icon: "⚖",
    title: "What does your body say?",
    desc: "BMI, BMR, body fat, macros, water — get your complete body intelligence profile in seconds.",
    link: "/calculators",
    cta: "Calculate now",
    color: "var(--saffron)",
  },
  {
    icon: "◉",
    title: "What is your dosha?",
    desc: "Ancient Ayurveda sees three energies in every body. A quick quiz reveals your nature.",
    link: "/quiz",
    cta: "Discover your prakriti",
    color: "var(--terracotta)",
  },
  {
    icon: "✦",
    title: "How is your energy today?",
    desc: "Track mood, sleep, and daily habits. Watch patterns emerge over days and weeks.",
    link: "/myspace",
    cta: "Start journaling",
    color: "var(--gold)",
  },
  {
    icon: "🔥",
    title: "What is your metabolism?",
    desc: "Find out exactly how many calories your body burns at rest and in motion.",
    link: "/calculators",
    cta: "Calculate TDEE",
    color: "var(--terracotta)",
  },
  {
    icon: "💧",
    title: "Are you drinking enough?",
    desc: "Water needs vary by body size, activity, and climate. Get your personal number.",
    link: "/calculators",
    cta: "Check water intake",
    color: "var(--sky)",
  },
  {
    icon: "📊",
    title: "Where are you improving?",
    desc: "See weight trends, mood patterns, and wellness scores in beautiful charts.",
    link: "/tracking",
    cta: "View progress",
    color: "var(--green)",
  },
];

export default function Home() {
  const [stats, setStats] = useState(null);
  const [visible, setVisible] = useState({});

  useEffect(() => {
    let live = true;
    api.health().then((d) => live && setStats(d.stats)).catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setVisible((v) => ({ ...v, [entry.target.dataset.reveal]: true }));
      });
    }, { threshold: 0.15 });
    document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const statsArr = stats ? [
    { n: stats.herbs, l: "Herbs", icon: "🌿" },
    { n: stats.conditions, l: "Concerns", icon: "◎" },
    { n: stats.formulations, l: "Formulations", icon: "⚗" },
    { n: stats.indications, l: "Indications", icon: "✦" },
  ] : [];

  return (
    <main id="home" className="screen active" tabIndex="-1">
      {/* Hero */}
      <section className="hero">
        <div className="mandala" aria-hidden="true">
          <svg viewBox="0 0 600 600" fill="none">
            <defs>
              <radialGradient id="mandala-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(217,138,43,0.08)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            <circle cx="300" cy="300" r="290" fill="url(#mandala-glow)" />
            <g className="spin-slow" stroke="#1f4d3a" strokeOpacity="0.3" strokeWidth="0.8">
              <circle cx="300" cy="300" r="278" />
              <circle cx="300" cy="300" r="232" />
              <circle cx="300" cy="300" r="186" />
              <g>
                {PETALS_A.map((i) => {
                  const a = (i / 24) * Math.PI * 2;
                  return (<line key={i} x1={300 + Math.cos(a) * 186} y1={300 + Math.sin(a) * 186} x2={300 + Math.cos(a) * 278} y2={300 + Math.sin(a) * 278} />);
                })}
              </g>
            </g>
            <g className="spin-rev" stroke="#d98a2b" strokeOpacity="0.4" strokeWidth="0.8">
              <circle cx="300" cy="300" r="120" />
              <g>
                {PETALS_B.map((i) => {
                  const a = (i / 16) * Math.PI * 2;
                  return (<line key={i} x1={300 + Math.cos(a) * 60} y1={300 + Math.sin(a) * 60} x2={300 + Math.cos(a) * 120} y2={300 + Math.sin(a) * 120} />);
                })}
              </g>
            </g>
            <circle cx="300" cy="300" r="60" fill="#1f4d3a" fillOpacity="0.05" />
            <circle cx="300" cy="300" r="6" fill="#d98a2b" fillOpacity="0.3" />
          </svg>
        </div>
        <div className="hero-inner wrap">
          <span className="eyebrow" data-reveal="hero"><span className="eyebrow-dot"></span>Ayurveda meets modern wellness</span>
          <h1 data-reveal="hero">
            Listen to your body,
            <br />
            <em>the ancient and modern way</em>
          </h1>
          <p className="sanskrit" data-reveal="hero">सर्वे भवन्तु सुखिनः — may all beings be well</p>
          <p className="lead" data-reveal="hero">
            One platform bridges 5,000-year-old Ayurvedic wisdom with modern fitness science.
            Calculate, track, discover — your body has a story. Let us help you read it.
          </p>
          <div className="hero-cta" data-reveal="hero">
            <Link href="/calculators" className="btn btn-primary btn-lg">
              Know your body <span aria-hidden="true">✦</span>
            </Link>
            <Link href="/checkin" className="btn btn-gold btn-lg">
              Check in <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="hero-links" data-reveal="hero">
            <Link href="/quiz" className="hero-textlink">or discover your dosha first <span aria-hidden="true">→</span></Link>
          </div>
          {stats && (
            <div className="stat-strip" data-reveal="hero">
              {statsArr.map((s) => (
                <div key={s.l} className="stat">
                  <span className="stat-icon">{s.icon}</span>
                  <span className="n">{s.n}</span>
                  <span className="l">{s.l}</span>
                </div>
              ))}
            </div>
          )}
          <div className="scrollcue" data-reveal="hero">
            <span className="scrollcue-line"></span>
          </div>
        </div>
      </section>

      {/* Curiosity-driven cards */}
      <section className="curious-band">
        <div className="wrap">
          <div className="section-head reveal" data-reveal="curious">
            <div className="kicker">What sparks your curiosity?</div>
            <h2>Explore your body</h2>
            <p>Every number is a clue. Every pattern tells a story. Start anywhere — the path unfolds.</p>
          </div>
          <div className="curious-grid">
            {CURIOUS_CARDS.map((card, i) => (
              <Link key={i} href={card.link} className="curious-card" data-reveal="curious" style={{ "--card-accent": card.color }}>
                <span className="curious-icon">{card.icon}</span>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
                <span className="curious-cta">{card.cta} <span aria-hidden="true">→</span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="band" data-reveal="how">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="kicker">The journey</div>
            <h2>From a feeling to full knowledge</h2>
            <p>Ancient diagnostics meet modern metrics. No jargon, no guesswork — every insight is sourced and transparent.</p>
          </div>
          <div className="steps3">
            <div className="step-card reveal" data-reveal="steps">
              <div className="step-no">01</div>
              <div className="step-icon">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                </svg>
              </div>
              <h3>Measure & discover</h3>
              <p>Calculate your metrics or check in with a concern. Both paths lead to the same place: understanding.</p>
            </div>
            <div className="step-card reveal" data-reveal="steps">
              <div className="step-no">02</div>
              <div className="step-icon">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" />
                </svg>
              </div>
              <h3>Track & connect</h3>
              <p>Log mood, energy, weight, waist — watch trends emerge. Link it to your Ayurvedic constitution.</p>
            </div>
            <div className="step-card reveal" data-reveal="steps">
              <div className="step-no">03</div>
              <div className="step-icon">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M9 11l3 3 5-6M21 12a9 9 0 1 1-9-9" />
                </svg>
              </div>
              <h3>Act with confidence</h3>
              <p>Cited herbs, evidence-tiered formulations, and your personal metrics — make informed choices.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      {stats && (
        <section className="band dark" data-reveal="stats">
          <div className="wrap text-center">
            <div className="section-head">
              <div className="kicker kicker-turmeric">The growing knowledge base</div>
              <h2>The science of life</h2>
              <p className="muted">Ayurveda — <em>ayus</em> (life) + <em>veda</em> (knowledge) — grew from the Vedas into the world&#39;s oldest continuously practised system. We carry it forward honestly.</p>
            </div>
            <div className="stat-strip large">
              {statsArr.map((s) => (
                <div key={s.l} className="stat">
                  <span className="stat-icon">{s.icon}</span>
                  <span className="n">{s.n}</span>
                  <span className="l">{s.l}</span>
                </div>
              ))}
            </div>
            <div className="text-center mt-34">
              <Link href="/heritage" className="btn btn-gold">Walk through the history <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="band band-cta" data-reveal="cta">
        <div className="wrap text-center">
          <div className="section-head">
            <h2>Start where you are</h2>
            <p className="muted">Every journey begins with a single question. What is yours?</p>
          </div>
          <div className="hero-cta" style={{ justifyContent: "center" }}>
            <Link href="/calculators" className="btn btn-primary btn-lg">Calculate your metrics <span aria-hidden="true">✦</span></Link>
            <Link href="/checkin" className="btn btn-gold btn-lg">Check a concern <span aria-hidden="true">→</span></Link>
            <Link href="/profile" className="btn btn-ghost btn-lg">Build your profile <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>
    </main>
  );
}