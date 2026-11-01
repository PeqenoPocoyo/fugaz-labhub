// useDragDrop — Hook para drag & drop de dispositivos na cena 3D
import { useRef, useState, useCallback } from 'react'
import { useSceneStore } from '../store/sceneStore'
import * as THREE from 'three'

interface DragState {
  isDragging: boolean
  draggedType: string | null
  position: [number, number, number]
}

export const useDragDrop = (camera: THREE.Camera) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedType: null,
    position: [0, 0, 0],
  })

  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const { addObject } = useSceneStore()

  const startDrag = useCallback((deviceType: string) => {
    setDragState({
      isDragging: true,
      draggedType: deviceType,
      position: [0, 0.5, 0],
    })
  }, [])

  const updateDrag = useCallback((clientX: number, clientY: number, canvas: HTMLCanvasElement) => {
    if (!dragState.isDragging) return

    const rect = canvas.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )

    raycasterRef.current.setFromCamera(mouse, camera)
    const intersection = new THREE.Vector3()
    raycasterRef.current.ray.intersectPlane(planeRef.current, intersection)

    if (intersection) {
      setDragState((prev) => ({
        ...prev,
        position: [intersection.x, 0.5, intersection.z],
      }))
    }
  }, [dragState.isDragging, camera])

  const endDrag = useCallback(() => {
    if (dragState.isDragging && dragState.draggedType) {
      addObject({
        id: `${dragState.draggedType}_${Date.now()}`,
        type: dragState.draggedType,
        position: dragState.position,
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.5],
        properties: {},
        layer: 'devices',
      })
    }
    setDragState({
      isDragging: false,
      draggedType: null,
      position: [0, 0, 0],
    })
  }, [dragState, addObject])

  const cancelDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedType: null,
      position: [0, 0, 0],
    })
  }, [])

  return {
    dragState,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
  }
}
