// Trust chain / citations block — matches engine `ResolvedCitation` shape:
// { source_title, source_kind, locator, public_domain, requires_verification, note }
export default function Citations({ citations }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="ind-cites">
      {citations.map((c, i) => (
        <div className="cite" key={i}>
          <span className="vflag" title={c.source_kind}>{c.source_kind}</span>
          <span>
            <span className="src-title">{c.source_title}</span>
            {c.locator ? <span> — {c.locator}</span> : null}
            {c.public_domain ? <span className="pd">· public domain</span> : null}
            {c.requires_verification ? <span className="vflag" title="Exact reference still to be confirmed">verify</span> : null}
          </span>
          {c.note ? <span className="cite-note">· {c.note}</span> : null}
        </div>
      ))}
    </div>
  );
}
