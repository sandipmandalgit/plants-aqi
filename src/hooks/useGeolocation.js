import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Browser geolocation with an explicit status machine so the UI can distinguish
 * "still asking" from "user said no" from "device has no GPS fix".
 *
 * status: 'idle' | 'locating' | 'granted' | 'denied' | 'unsupported' | 'error'
 */
export function useGeolocation({ auto = true } = {}) {
  const [coords, setCoords] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported')
      setError('This browser does not expose location.')
      return
    }

    setStatus('locating')
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mounted.current) return
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setStatus('granted')
      },
      (err) => {
        if (!mounted.current) return
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error')
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was declined.'
            : 'Could not get a location fix.',
        )
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    )
  }, [])

  useEffect(() => {
    if (auto) locate()
  }, [auto, locate])

  return { coords, status, error, locate, setCoords }
}
