"use client";
import { useState } from "react";
import Link from "next/link";
import { useLocal } from "@/lib/storage";
import { DOSHA_LABEL } from "@/lib/api";
import { useToast } from "@/components/Toast";

const QUIZ = [
  { question: "How would you describe your body frame?",
    options: [
      { text: "Thin, slender, hard to gain weight", value: "vata" },
      { text: "Medium, athletic, gains/loses weight easily", value: "pitta" },
      { text: "Broad, sturdy, gains weight easily", value: "kapha" } ] },
  { question: "What is your skin typically like?",
    options: [
      { text: "Dry, rough, or cold to the touch", value: "vata" },
      { text: "Warm, oily, prone to freckles or breakouts", value: "pitta" },
      { text: "Thick, moist, smooth, and cool", value: "kapha" } ] },
  { question: "How is your digestion and appetite?",
    options: [
      { text: "Irregular, sometimes I forget to eat", value: "vata" },
      { text: "Strong and sharp, I get irritable if I skip a meal", value: "pitta" },
      { text: "Slow and steady, I can easily skip a meal", value: "kapha" } ] },
  { question: "How do you typically sleep?",
    options: [
      { text: "Light, interrupted, often wake up tired", value: "vata" },
      { text: "Sound, but I wake up hot or thirsty", value: "pitta" },
      { text: "Deep, heavy, hard to wake up in the morning", value: "kapha" } ] },
  { question: "How do you respond to stress?",
    options: [
      { text: "Anxious, worried, fearful", value: "vata" },
      { text: "Irritable, frustrated, angry", value: "pitta" },
      { text: "Withdrawn, stubborn, unbothered", value: "kapha" } ] },
  { question: "What climate do you dislike the most?",
    options: [
      { text: "Cold and dry weather", value: "vata" },
      { text: "Hot and humid weather", value: "pitta" },
      { text: "Cold and damp weather", value: "kapha" } ] },
  { question: "How is your energy level?",
    options: [
      { text: "Quick bursts of energy, but tire easily", value: "vata" },
      { text: "Moderate, focused and driven", value: "pitta" },
      { text: "Slow to start, but excellent endurance", value: "kapha" } ] },
];

const DOSHA_META = {
  vata: { color: "var(--sky)", elements: "air & ether — movement" },
  pitta: { color: "var(--terracotta)", elements: "fire & water — transformation" },
  kapha: { color: "var(--green-2)", elements: "earth & water — structure" },
};
const ORDER = ["vata", "pitta", "kapha"];

export default function Quiz() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ vata: 0, pitta: 0, kapha: 0 });
  const [saved, setSaved] = useState(false);
  const [prakriti, setPrakriti] = useLocal("prakriti", null);
  const toast = useToast();

  const handleAnswer = (value) => {
    setAnswers((a) => ({ ...a, [value]: a[value] + 1 }));
    setStep((s) => s + 1);
  };

  const total = QUIZ.length;
  const tallies = answers;
  const max = Math.max(tallies.vata, tallies.pitta, tallies.kapha);
  const primary =
    tallies.vata === tallies.pitta && tallies.pitta === tallies.kapha
      ? "Tridoshic"
      : ORDER.filter((d) => tallies[d] === max).map((d) => DOSHA_LABEL[d]).join(" · ");

  const save = () => {
    const entry = {
      primary,
      vata: tallies.vata,
      pitta: tallies.pitta,
      kapha: tallies.kapha,
      takenAt: new Date().toISOString(),
    };
    setPrakriti(entry);
    setSaved(true);
    toast("Prakriti saved to My space");
  };

  if (step === total) {
    return (
      <main className="screen active">
        <section className="intake wrap">
          <div className="qr-head">
            <div className="kicker">Your dominant nature</div>
            <h2 style={{ marginTop: 10 }}>{primary}</h2>
            <div className="qr-el">prakriti · your constitutional balance</div>
          </div>

          <div className="qr-bars">
            {ORDER.map((d) => {
              const pct = Math.round((tallies[d] / total) * 100);
              return (
                <div className="qr-bar-row" key={d}>
                  <div className="qr-name">{DOSHA_LABEL[d]}</div>
                  <div className="qr-track">
                    <div className="qr-fill" data-d={d} style={{ width: pct + "%" }} />
                  </div>
                  <div className="qr-pct">{pct}%</div>
                </div>
              );
            })}
          </div>

          {prakriti && !saved && (
            <p className="qr-saved">You’ve already saved a prakriti — saving again will replace it.</p>
          )}
          {saved && <p className="qr-saved">Saved to My space.</p>}

          <p className="muted" style={{ maxWidth: 600, margin: "30px auto 0", textAlign: "center" }}>
            Remember, you are a unique mix of all three doshas. Keep this dominant dosha in mind
            when choosing your daily routines and herbs — and run a check-in for any specific concern.
          </p>

          <div className="share-row">
            <button type="button" className="btn btn-primary btn-lg" onClick={save}>
              Save my prakriti <span className="btn-arrow">→</span>
            </button>
            <Link href="/checkin" className="btn btn-gold btn-lg">
              Begin your check-in <span aria-hidden="true">→</span>
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => { setStarted(false); setStep(0); setAnswers({ vata: 0, pitta: 0, kapha: 0 }); setSaved(false); }}
            >
              Retake
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="screen active">
      <section className="intake wrap">
        {!started ? (
          <div>
            <div className="section-head mb-30">
              <div className="kicker">Prakriti · your nature</div>
              <h2>Discover your constitution</h2>
              <p>Ayurveda holds that each of us is born with a unique balance of the three doshas — Vata, Pitta and Kapha. Knowing yours helps everything else make sense. Seven quick questions, about a minute.</p>
            </div>
            <div className="quiz-doshas">
              {ORDER.map((d) => (
                <div className="qd" key={d}>
                  <span className="qd-dot" style={{ background: DOSHA_META[d].color }}></span>
                  <b>{DOSHA_LABEL[d]}</b>
                  <span>{DOSHA_META[d].elements}</span>
                </div>
              ))}
            </div>
            <div className="text-center mt-34">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => setStarted(true)}>
                Begin the quiz <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="progress mb-8">
              {QUIZ.map((q, i) => (
                <span key={q.question} className={`dot ${i <= step ? "on" : ""}`}></span>
              ))}
            </div>
            <div className="quiz-q-card">
              <h2 className="quiz-q-title">{QUIZ[step].question}</h2>
              <div className="quiz-options">
                {QUIZ[step].options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="quiz-opt"
                    onClick={() => handleAnswer(opt.value)}
                  >
                    <span className="qo-mark"></span>
                    <span>{opt.text}</span>
                  </button>
                ))}
              </div>
              {step > 0 && (
                <button
                  type="button"
                  className="quiz-back"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  ← Previous
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
