// MaterialSelector — Pop-up de seleção de materiais e massas
import React, { useState, useEffect } from 'react'
import { Package, Droplets, Wind, X, Search, CheckCircle2 } from 'lucide-react'

interface MaterialOption {
  id: string
  name: string
  category: string
  density: number
  mass: number
  color: string
}

interface MaterialSelectorProps {
  isOpen: boolean
  onClose: () => void
  onMaterialSelected: (materialId: string, materialName: string, category: string) => void
}

const CATEGORY_ICONS: Record<string, React.FC<any>> = {
  solid: Package as React.FC<any>,
  liquid: Droplets as React.FC<any>,
  gas: Wind as React.FC<any>,
}

const CATEGORY_COLORS: Record<string, string> = {
  solid: '#00D4FF',
  liquid: '#10B981',
  gas: '#F59E0B',
}

const CATEGORY_LABELS: Record<string, string> = {
  solid: 'Sólidos',
  liquid: 'Líquidos',
  gas: 'Gases',
}

const MaterialSelector: React.FC<MaterialSelectorProps> = ({
  isOpen,
  onClose,
  onMaterialSelected,
}) => {
  const [materials, setMaterials] = useState<MaterialOption[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadMaterials()
    }
  }, [isOpen])

  const loadMaterials = async () => {
    try {
      const res = await fetch('/api/materials')
      const data = await res.json()
      setMaterials(data.materials || [])
    } catch (e) {
      console.error('Failed to load materials:', e)
      // Fallback com materiais hardcoded se API não estiver disponível
      setMaterials([
        { id: 'steel', name: 'Aço', category: 'solid', density: 7850, mass: 10, color: '#7F8C8D' },
        { id: 'aluminum', name: 'Alumínio', category: 'solid', density: 2700, mass: 5, color: '#95A5A6' },
        { id: 'plastic', name: 'Plástico', category: 'solid', density: 950, mass: 2, color: '#3498DB' },
        { id: 'wood', name: 'Madeira', category: 'solid', density: 600, mass: 3, color: '#8B4513' },
        { id: 'water', name: 'Água', category: 'liquid', density: 1000, mass: 1, color: '#3498DB' },
        { id: 'oil', name: 'Óleo', category: 'liquid', density: 900, mass: 0.9, color: '#8B4513' },
        { id: 'air', name: 'Ar', category: 'gas', density: 1.225, mass: 0.0012, color: '#ECF0F1' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const filteredMaterials = materials.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = selectedCategory === 'all' || m.category === selectedCategory
    return matchSearch && matchCategory
  })

  const handleSelect = (material: MaterialOption) => {
    onMaterialSelected(material.id, material.name, material.category)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Modal */}
      <div
        className="relative bg-[#1A1F2E] border border-[#2D3748] rounded-xl shadow-2xl w-full max-w-md mx-4 p-0 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[#0A0E17] border-b border-[#2D3748] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Package size={16} className="text-[#00D4FF]" /> Selecionar Material
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#2D3748] rounded transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 overflow-y-auto max-h-[400px]">
          {/* Search */}
          <div className="mb-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar material..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0A0E17] border border-[#2D3748] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#00D4FF]"
              />
            </div>
          </div>

          {/* Category filters */}
          <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2 py-1 text-xs rounded transition ${
                selectedCategory === 'all'
                  ? 'bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30'
                  : 'text-gray-400 hover:text-white hover:bg-[#2D3748]'
              }`}
            >
              Todos
            </button>
            {['solid', 'liquid', 'gas'].map((cat) => {
              const Icon = CATEGORY_ICONS[cat]
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 text-xs rounded transition ${
                    selectedCategory === cat
                      ? `bg-[${CATEGORY_COLORS[cat]}]/20 text-[${CATEGORY_COLORS[cat]}] border border-[${CATEGORY_COLORS[cat]}]/30`
                      : 'text-gray-400 hover:text-white hover:bg-[#2D3748]'
                  }`}
                >
                  <Icon size={10} className="mr-1" />
                  {CATEGORY_LABELS[cat]}
                </button>
              )
            })}
          </div>

          {/* Materials list */}
          {loading ? (
            <div className="flex items-center justify-center py-4 text-[10px] text-gray-500">
              Carregando materiais...
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-[10px] text-gray-500">
              Nenhum material encontrado
            </div>
          ) : (
            <div className="space-y-1">
              {filteredMaterials.map((material) => {
                const Icon = CATEGORY_ICONS[material.category] || Package
                return (
                  <button
                    key={material.id}
                    onClick={() => handleSelect(material)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2D3748]/50 bg-[#0A0E17]/50 hover:bg-[#00D4FF]/10 hover:border-[#00D4FF]/30 transition-all group"
                  >
                    <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: material.color }}>
                      <Icon size={10} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white truncate">
                          {material.name}
                        </span>
                        <span className={`text-[9px] ${CATEGORY_COLORS[material.category]} font-medium`}>
                          {CATEGORY_LABELS[material.category]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                        <span>ρ: {material.density} kg/m³</span>
                        <span>m: {material.mass} kg</span>
                      </div>
                    </div>
                    <CheckCircle2 size={12} className="text-[#10B981] opacity-0 group-hover:opacity-100" />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#2D3748] bg-[#0A0E17]">
          <button
            onClick={onClose}
            className="w-full py-1.5 text-xs text-gray-400 hover:text-white hover:bg-[#2D3748] rounded-lg transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default MaterialSelector
