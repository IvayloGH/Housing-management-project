// Switches for parts of the app that are not ready in the backend yet.
// Set them in frontend/.env.local (see .env.example).

// Face login needs Manuel's AI, Eszter's face_crypto.py and the face_login table.
// Until then the buttons are hidden. Turn on with VITE_FACE_LOGIN=true
export const FACE_LOGIN_ENABLED = import.meta.env.VITE_FACE_LOGIN === 'true'
