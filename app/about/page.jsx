"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="about-page">
      <header className="about-page-header">
        <Link className="about-page-back" href="/">
          Back to store
        </Link>
        <img className="about-page-logo" src="/CHROME LOGO.png" alt="thewolcollective" />
        <div className="about-page-spacer" aria-hidden="true" />
      </header>

      <section className="about-page-shell">
        <p className="about-page-kicker">About us</p>
        <h1>Culture is non-negotiable.</h1>
        <div className="about-page-copy">
          <p>
            The WOL Collective is an Afro-centred clothing project building garments around memory,
            resistance, and cultural authorship.
          </p>
          <p>
            This first release stays singular: one statement piece, one clear voice, one disciplined
            silhouette.
          </p>
        </div>
      </section>
    </main>
  );
}
