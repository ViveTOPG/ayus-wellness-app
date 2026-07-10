import Link from "next/link";

export default function Footer() {
  return (
    <footer>
      <div className="om-mini">ॐ</div>
      <p>Āyus — educational only. Not medical advice.</p>
      <nav className="foot-links" aria-label="Footer">
        <Link href="/checkin">Check-in</Link>
        <Link href="/library">Herbs</Link>
        <Link href="/quiz">Prakṛti</Link>
        <Link href="/heritage">Heritage</Link>
        <Link href="/myspace">My space</Link>
      </nav>
      <p className="mt-14" style={{ opacity: 0.7, marginTop: 12 }}>
        Every recommendation keeps its source. Built on a corpus of classical
        texts and indexed modern research.
      </p>
    </footer>
  );
}
