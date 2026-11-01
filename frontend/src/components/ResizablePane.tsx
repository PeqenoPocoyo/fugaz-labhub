// ResizablePane — Painel redimensionável com divisor arrastável
import React, { useState, useCallback } from 'react'

interface ResizablePaneProps {
  children: React.ReactNode
  defaultSize?: number // px
  minSize?: number
  maxSize?: number
  className?: string
  onResize?: (size: number) => void
}

export const ResizablePane: React.FC<ResizablePaneProps> = ({
  children,
  defaultSize = 300,
  minSize = 200,
  maxSize = 500,
  className = '',
  onResize,
}) => {
  const [size, setSize] = useState(defaultSize)
  const [isResizing, setIsResizing] = useState(false)

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    const startX = e.clientX
    const startSize = size

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing) return
      const dx = moveEvent.clientX - startX
      const newSize = Math.max(minSize, Math.min(maxSize, startSize + dx))
      setSize(newSize)
      onResize?.(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [size, isResizing, minSize, maxSize, onResize])

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width: `${size}px`,
        minWidth: `${minSize}px`,
        maxWidth: `${maxSize}px`,
        flex: '0 0 auto',
      }}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {children}
      </div>
      <div
        onMouseDown={startResize}
        className="absolute top-0 bottom-0 right-0 w-4 cursor-col-resize select-none z-20"
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1 bg-[#00D4FF]/40 hover:bg-[#00D4FF]/60 active:bg-[#00D4FF] transition-all"
        />
      </div>
    </div>
  )
}
