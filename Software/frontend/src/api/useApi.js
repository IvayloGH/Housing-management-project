import { useEffect, useState } from 'react'

// Loads data from the backend when the page opens.
//   const { data, error, reload } = useApi(() => getGroceries())
// data is null while loading. Call reload() after a change, to load it again.
// deps: load again when one of these values changes, e.g. [year, month]
export function useApi(load, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let stillOpen = true // the page could be closed before the answer arrives
    load()
      .then((result) => {
        if (stillOpen) {
          setData(result)
          setError('')
        }
      })
      .catch((err) => {
        if (stillOpen) setError(err.message)
      })
    return () => {
      stillOpen = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps])

  return { data, error, reload: () => setVersion(version + 1) }
}
