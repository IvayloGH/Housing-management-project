// Small line icons (drawn as SVG) used instead of emoji, so they look the same
// on every device and match the calm Roomify style.
// Usage: <Icon name="check" />   Names: see the list below
const paths = {
  check: <polyline points="4 12 9.5 17.5 20 7" />,
  cross: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  house: (
    <>
      <path d="M3 11 12 4l9 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  chevronLeft: <polyline points="15 5 8 12 15 19" />,
  chevronRight: <polyline points="9 5 16 12 9 19" />,
  broom: (
    <>
      <path d="M19 3 11.5 10.5" />
      <path d="M9.5 9.5 14.5 14.5 12 21H4.5L3 19.5 9.5 9.5z" />
      <path d="M7 21l1.5-4" />
    </>
  ),
  basket: (
    <>
      <path d="M3 10h18l-2 10H5L3 10z" />
      <path d="M8 10 11 4" />
      <path d="M16 10 13 4" />
      <line x1="9" y1="14" x2="9" y2="16" />
      <line x1="15" y1="14" x2="15" y2="16" />
    </>
  ),
  wrench: <path d="M14.5 6.5a4 4 0 0 1 5.2-3.8l-2.6 2.6.6 2.4 2.4.6 2.6-2.6a4 4 0 0 1-5.4 5L8.5 19.5a2.1 2.1 0 0 1-3-3l8.8-8.8a4 4 0 0 1 .2-1.2z" />,
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <line x1="3.5" y1="10" x2="20.5" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7z" />
      <path d="M4 7l11-3v3" />
      <circle cx="16" cy="13.5" r="1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  message: <path d="M4 5h16v11H9l-5 4V5z" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5v16h5" />
      <polyline points="15 8 19 12 15 16" />
      <line x1="19" y1="12" x2="9" y2="12" />
    </>
  ),
}

function Icon({ name, size = 16, strokeWidth = 2, className = '' }) {
  return (
    <svg
      className={'icon ' + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

export default Icon
