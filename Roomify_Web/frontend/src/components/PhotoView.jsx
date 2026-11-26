import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'

// Shows a photo of the problem. Click it to see it big; click again (or press Escape) to close.
// size: 'large' (manager review) or 'small' (in lists)
function PhotoView({ src, alt, size = 'large' }) {
  const [big, setBig] = useState(false)
  // The address of a photo that could not be loaded (e.g. the file is gone from the server)
  const [brokenSrc, setBrokenSrc] = useState(null)

  // Escape closes the big photo
  useEffect(() => {
    if (!big) return
    const onKey = (event) => {
      if (event.key === 'Escape') setBig(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [big])

  // No photo, or it could not be loaded: show a grey box with a camera icon
  if (!src || src === brokenSrc) {
    const text = src ? 'Photo not available' : 'No photo added'
    return (
      <div className={'photo-frame empty photo-' + size} aria-label={text}>
        <Icon name="camera" size={size === 'small' ? 20 : 28} strokeWidth={1.5} />
        {size === 'large' && <span>{text}</span>}
      </div>
    )
  }

  return (
    <>
      <button type="button" className={'photo-frame photo-' + size} onClick={() => setBig(true)}>
        <img src={src} alt={alt} onError={() => setBrokenSrc(src)} />
        {size === 'large' && <span className="photo-hint">Click to enlarge</span>}
      </button>

      {/* The big photo on top of the page. Clicking anywhere closes it. */}
      {big && (
        <div className="photo-overlay" onClick={() => setBig(false)}>
          <img src={src} alt={alt} />
          <button type="button" className="photo-close" aria-label="Close the photo" autoFocus>
            <Icon name="cross" size={22} />
          </button>
        </div>
      )}
    </>
  )
}

export default PhotoView
