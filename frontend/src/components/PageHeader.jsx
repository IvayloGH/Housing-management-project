// The green band at the top of every page (eyebrow, big title, subtitle, buttons)
function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <section className="page-header">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
      {children && <div className="page-actions">{children}</div>}
    </section>
  )
}

export default PageHeader
