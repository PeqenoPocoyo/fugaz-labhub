// LayoutPane — Painel simples com tamanho fixo e overflow controlado
// Sem divisor arrastável para evitar bugs de UI
import React from 'react'

interface LayoutPaneProps {
  children: React.ReactNode
  width?: number // px
  minWidth?: number
  className?: string
}

export const LayoutPane: React.FC<LayoutPaneProps> = ({
  children,
  width = 300,
  minWidth = 200,
  className = '',
}) => (
  <div
    className={`relative overflow-hidden shrink-0 ${className}`}
    style={{
      width: `${width}px`,
      minWidth: `${minWidth}px`,
      flex: '0 0 auto',
    }}
  >
    <div className="flex flex-col h-full overflow-hidden">
      {children}
    </div>
  </div>
)

export const LayoutDivider: React.FC = () => (
  <div className="w-1 bg-[#1A1F2E] shrink-0" />
)
