"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const TIMELINE = [
  { era: "c. 5000 BCE", title: "The Vedas",
    text: "The root of Ayurveda — foundational hymns in the Rig Veda reference plants, physicians (vaidya), and the three doshas." },
  { era: "c. 1000 BCE", title: "The Brahmanas & Upanishads",
    text: "Refined the concept of prana, the internal fire agni, and the link between food (ahara) and consciousness." },
  { era: "c. 400–200 BCE", title: "Charaka Samhita",
    text: "Definitive compendium of internal medicine — the science of agni, dosha, disease aetiology, and the dosha-based therapeutics that still anchor practice today." },
  { era: "c. 600 BCE", title: "Sushruta Samhita",
    text: "The surgical masterpiece — Sushruta codified anatomy, shalya (surgery), and the use of plant-based mritasanjivani, predating Greek surgery." },
  { era: "c. 700 CE", title: "Ashtanga Hridaya",
    text: "Vagbhata’s elegant distillation of earlier schools — the working text most vaidyas still memorise, covering the eight branches of Ayurveda." },
  { era: "Modern", title: "Today",
    text: "Recognised by the WHO as a traditional medicine system. Modern research increasingly validates classical claims — Ashwagandha, Turmeric, Bacopa and Triphala lead the evidence base." },
];

const CONCEPTS = [
  { sk: "Vata", en: "Air & ether", text: "Governance of movement — breath, circulation, nerves, thought." },
  { sk: "Pitta", en: "Fire & water", text: "Transformation — digestion, metabolism, body heat, perception." },
  { sk: "Kapha", en: "Earth & water", text: "Structure — stability, lubrication, tissue, immunity." },
  { sk: "Agni", en: "Digestive fire", text: "The central regulator — all health begins and ends with agni." },
  { sk: "Ama", en: "Undigested residue", text: "The roots of disease when agni is low; the aim is to clear it." },
  { sk: "Prakriti", en: "Your constitution", text: "The unique dosha balance you were born with." },
];

export default function Heritage() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let live = true;
    api.health().then((d) => live && setStats(d)).catch(() => {});
    return () => { live = false; };
  }, []);

  return (
    <main className="screen active">
      <section className="heritage wrap">
        <div className="section-head text-center">
          <div className="kicker kicker-turmeric">5,000 years of knowing</div>
          <h2>The science of life</h2>
          <p className="muted" style={{ maxWidth: 800, margin: "0 auto" }}>
            Ayurveda — <em>ayus</em> (life) + <em>veda</em> (knowledge) — grew from the
            Vedas into the world’s oldest continuously practised system of medicine. We
            carry it forward honestly: every recommendation keeps its source.
          </p>
        </div>

        <div className="tiers-explain">
          {[
            { t: "classical", text: "Documented in a classical text (Charaka, Sushruta, etc.). Traditional use only — many centuries of recorded practice." },
            { t: "traditional", text: "Widespread, long-standing use across lineages — beyond a single classical citation." },
            { t: "preliminary", text: "Lab, animal, or small/uncontrolled human studies. Promising but not yet conclusive." },
            { t: "clinical", text: "Supported by one or more controlled human trials. Strongest tier we apply." },
          ].map((x) => (
            <div className="tier-x" key={x.t}>
              <span className="tier" data-t={x.t}><span className="tb"></span>{x.t}</span>
              <p>{x.text}</p>
            </div>
          ))}
        </div>

        <div className="section-head" style={{ margin: "60px auto 24px" }}>
          <div className="kicker">A 5,000-year timeline</div>
          <h2 style={{ fontSize: "clamp(28px,5vw,44px)" }}>Tracing the lineage</h2>
        </div>

        <div className="timeline-v">
          {TIMELINE.map((t) => (
            <div className="tv-item" key={t.title}>
              <div className="era">{t.era}</div>
              <h4>{t.title}</h4>
              <p>{t.text}</p>
            </div>
          ))}
        </div>

        <section className="band dark mt-70">
          <div className="wrap">
            <div className="section-head text-center">
              <div className="kicker kicker-turmeric">The core ideas</div>
              <h2>Concepts you’ll meet</h2>
              <p className="muted">A short glossary — every term here shows up again in your personalized report.</p>
            </div>
            <div className="concept-grid">
              {CONCEPTS.map((c) => (
                <div className="concept" key={c.sk}>
                  <div className="sk">{c.sk}</div>
                  <h5>{c.en}</h5>
                  <p>{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {stats && (
          <>
            <div className="section-head" style={{ margin: "60px auto 24px" }}>
              <div className="kicker">Sources we lean on</div>
              <h2 style={{ fontSize: "clamp(28px,5vw,44px)" }}>The provenance chain</h2>
              <p className="muted">Every recommendation in this app traces back to a real source of record — never a vague “tradition says.”</p>
            </div>
            <div className="sources-list">
              {stats.sources ? (
                <div className="source-item">
                  <div>
                    <div className="si-title">{stats.sources} indexed sources</div>
                    <div className="si-meta">
                      {stats.herbs} herbs · {stats.conditions} conditions · {stats.formulations} formulations · {stats.indications} indications
                    </div>
                  </div>
                  <div className="si-count">All cited</div>
                </div>
              ) : null}
              <div className="source-item">
                <div>
                  <div className="si-title">Charaka Samhita</div>
                  <div className="si-meta">Classical text · Internal medicine</div>
                </div>
                <div className="pd">public domain</div>
              </div>
              <div className="source-item">
                <div>
                  <div className="si-title">Sushruta Samhita</div>
                  <div className="si-meta">Classical text · Surgery & anatomy</div>
                </div>
                <div className="pd">public domain</div>
              </div>
              <div className="source-item">
                <div>
                  <div className="si-title">Ashtanga Hridaya</div>
                  <div className="si-meta">Vagbhata’s synthesis · The eight branches</div>
                </div>
                <div className="pd">public domain</div>
              </div>
              <div className="source-item">
                <div>
                  <div className="si-title">Modern research</div>
                  <div className="si-meta">Peer-reviewed trials — flagged <code>requires_verification</code> until an exact study is attached</div>
                </div>
                <div className="si-count">verifiable</div>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
