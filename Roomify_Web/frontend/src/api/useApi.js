import { useCallback, useEffect, useState } from 'react'

// Loads data from the backend when the page opens.
//   const { data, error, loading, reload } = useApi(() => getGroceries())
// data:    null until the first answer has arrived
// loading: true while asking the backend (also during a reload)
// error:   the error of the last try, '' if it worked
// reload(): ask again, e.g. after a change. The old data stays visible meanwhile.
// deps: load again when one of these values changes, e.g. [year, month].
//       Then the old data is NOT shown any more (it belongs to other values).
export function useApi(load, deps = []) {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState({ depsKey: null, version: -1, data: null, error: '' })
  const depsKey = JSON.stringify(deps)

  useEffect(() => {
    let stillOpen = true // the page could be closed before the answer arrives
    load().then(
      (data) => {
        if (stillOpen) setResult({ depsKey, version, data, error: '' })
      },
      (err) => {
        if (stillOpen) {
          setResult((old) => ({
            depsKey,
            version,
            data: old.depsKey === depsKey ? old.data : null,
            error: err.message,
          }))
        }
      },
    )
    return () => {
      stillOpen = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, depsKey])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const sameDeps = result.depsKey === depsKey
  const upToDate = sameDeps && result.version === version

  return {
    data: sameDeps ? result.data : null,
    error: upToDate ? result.error : '',
    loading: !upToDate,
    reload,
  }
}
