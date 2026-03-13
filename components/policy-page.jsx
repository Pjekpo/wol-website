import Link from "next/link";

export default function PolicyPage({
  kicker,
  title,
  intro,
  sections
}) {
  return (
    <main className="policy-page">
      <header className="policy-page-header">
        <Link className="policy-page-back" href="/">
          Back to store
        </Link>
        <img className="policy-page-logo" src="/CHROME LOGO.png" alt="thewolcollective" />
        <div className="policy-page-spacer" aria-hidden="true" />
      </header>

      <section className="policy-page-shell">
        <p className="policy-page-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="policy-page-intro">{intro}</p>

        <div className="policy-page-sections">
          {sections.map(function (section) {
            return (
              <section className="policy-page-section" key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs
                  ? section.paragraphs.map(function (paragraph, index) {
                      return <p key={`${section.heading}-p-${index}`}>{paragraph}</p>;
                    })
                  : null}
                {section.items ? (
                  <ul className="policy-page-list">
                    {section.items.map(function (item, index) {
                      return <li key={`${section.heading}-i-${index}`}>{item}</li>;
                    })}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
