// The green band at the top of every page (eyebrow, big title, subtitle, buttons)
// "side" is shown on the right, for example the house filter on the manager overview.
// "titleMuted" is a second, grey part of the title (two-tone heading).
// "image" is an optional photo on the right, so the page feels less empty.
function PageHeader({ eyebrow, title, subtitle, children, side, image, titleMuted, imageAlt = '' }) {
  return (
    <section className={'page-header' + (image ? ' has-photo' : '')}>
      <div className="page-header-main">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>
          {title}
          {titleMuted && <span className="title-muted"> {titleMuted}</span>}
        </h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
        {children && <div className="page-actions">{children}</div>}
      </div>
      {side && <div className="page-header-side">{side}</div>}
      {image && <img src={image} alt={imageAlt} className="page-header-photo" />}
    </section>
  )
}

export default PageHeader
