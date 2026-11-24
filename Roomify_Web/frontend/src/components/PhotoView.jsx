import { useState } from 'react'
import Icon from './Icon.jsx'

// Shows a photo of the problem. Click it to see it big; click again to close.
// size: 'large' (manager review) or 'small' (in lists)
function PhotoView({ src, alt, size = 'large' }) {
  const [big, setBig] = useState(false)

  // No photo: show a grey box with a camera icon
  if (!src) {
    return (
      <div className={'photo-frame empty photo-' + size} aria-label="No photo added">
        <Icon name="camera" size={size === 'small' ? 20 : 28} strokeWidth={1.5} />
        {size === 'large' && <span>No photo added</span>}
      </div>
    )
  }

  return (
    <>
      <button type="button" className={'photo-frame photo-' + size} onClick={() => setBig(true)}>
        <img src={src} alt={alt} />
        {size === 'large' && <span className="photo-hint">Click to enlarge</span>}
      </button>

      {/* The big photo on top of the page. Clicking anywhere closes it. */}
      {big && (
        <div className="photo-overlay" onClick={() => setBig(false)}>
          <img src={src} alt={alt} />
          <button type="button" className="photo-close" aria-label="Close the photo">
            <Icon name="cross" size={22} />
          </button>
        </div>
      )}
    </>
  )
}

export default PhotoView
