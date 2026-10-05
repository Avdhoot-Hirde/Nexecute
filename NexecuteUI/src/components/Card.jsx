
var demo={
    l:null,
    h:'Multi-Language Sandboxed Execution',
    b: 'Ephemeral Docker containers per submission — --network none, 128MB memory cap, 0.5 CPU quota, all capabilities dropped, dual timeout enforcement. Auto-removed after every run.'
}
function Card({
  logo = demo.l,
  heading = demo.h,
  body = demo.b,
  accent = '#8b5cf6',
  number = '01',
}) {
  return (
    <article className="feature-card" style={{ '--card-accent': accent }}>
      <div className="feature-card__glow" aria-hidden="true" />
      <div className="feature-card__content">
        <div className="flex items-start justify-between">
          <div className="feature-card__icon">{logo}</div>
          <span className="feature-card__number">{number}</span>
        </div>
        <div className="feature-card__line" aria-hidden="true" />
        <h3 className="text-xl font-semibold tracking-tight text-slate-50">{heading}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-400">{body}</p>
      </div>
    </article>
  );
}

export default Card
