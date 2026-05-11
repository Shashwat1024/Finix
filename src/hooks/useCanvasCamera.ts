'use client'

import { useRef, useCallback, useEffect } from 'react'

export interface Camera { zoom: number; panX: number; panY: number }

const DEFAULT_CAMERA: Camera = { zoom: 1, panX: 0, panY: 0 }

/**
 * Attaches scroll-to-zoom and drag-to-pan to a canvas element.
 * Returns a stable cameraRef (mutated in-place, never causes re-renders)
 * and a reset function.
 *
 * Transforms mouse coordinates from screen space → canvas world space:
 *   worldX = (screenX - panX) / zoom
 *   worldY = (screenY - panY) / zoom
 */
export function useCanvasCamera(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const cameraRef = useRef<Camera>({ ...DEFAULT_CAMERA })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const dragDist = useRef(0)

  const reset = useCallback(() => {
    cameraRef.current = { ...DEFAULT_CAMERA }
  }, [])

  /** Convert a screen-space point to canvas world space. */
  const toWorld = useCallback((sx: number, sy: number) => {
    const { zoom, panX, panY } = cameraRef.current
    return { x: (sx - panX) / zoom, y: (sy - panY) / zoom }
  }, [])

  /** True if the last mousedown→mouseup was a drag (moved > 5px). */
  const wasDrag = useCallback(() => dragDist.current > 5, [])

  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = cvs.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const factor = e.deltaY > 0 ? 0.92 : 1.08
      const cam = cameraRef.current
      const newZoom = Math.max(0.25, Math.min(8, cam.zoom * factor))
      // Zoom toward cursor
      const wx = (mx - cam.panX) / cam.zoom
      const wy = (my - cam.panY) / cam.zoom
      cameraRef.current = { zoom: newZoom, panX: mx - wx * newZoom, panY: my - wy * newZoom }
    }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      isDragging.current = true
      dragDist.current = 0
      dragStart.current = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      dragDist.current += Math.abs(dx) + Math.abs(dy)
      cameraRef.current.panX += e.movementX
      cameraRef.current.panY += e.movementY
    }

    const onMouseUp = () => { isDragging.current = false }
    const onDblClick = () => reset()

    cvs.addEventListener('wheel', onWheel, { passive: false })
    cvs.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    cvs.addEventListener('dblclick', onDblClick)

    return () => {
      cvs.removeEventListener('wheel', onWheel)
      cvs.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      cvs.removeEventListener('dblclick', onDblClick)
    }
  }, [canvasRef, reset])

  return { cameraRef, reset, toWorld, wasDrag }
}
