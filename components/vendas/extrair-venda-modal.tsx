'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Upload, FileText, Clipboard, Loader2, Sparkles } from 'lucide-react'

interface ExtrairVendaModalProps {
  onClose: () => void
  onExtractionComplete: (data: any) => void
}

export default function ExtrairVendaModal({ onClose, onExtractionComplete }: ExtrairVendaModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'upload' | 'texto'>('upload')
  const [texto, setTexto] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processExtraction(file)
  }

  const handleTextSubmit = async () => {
    if (!texto.trim()) return
    await processExtraction(null, texto)
  }

  const processExtraction = async (file: File | null, text?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const formData = new FormData()
      if (file) formData.append('file', file)
      if (text) formData.append('text', text)

      const response = await fetch('/api/vendas/extrair', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erro ao processar o documento. Verifica a tua chave de API.')
      }

      const data = await response.json()
      onExtractionComplete(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <CardTitle>Extrair com IA Gemini 2.0</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                tab === 'upload' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="w-4 h-4" /> Upload PDF/Imagem
            </button>
            <button
              onClick={() => setTab('texto')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                tab === 'texto' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clipboard className="w-4 h-4" /> Colar Texto
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">
              {error}
            </div>
          )}

          {tab === 'upload' ? (
            <div 
              onClick={() => !loading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                loading ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-blue-400 hover:bg-blue-50/30'
              }`}
            >
              <input 
                type="input" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
                accept="application/pdf,image/*"
              />
              {loading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                  <p className="font-medium text-gray-900">A analisar documento...</p>
                  <p className="text-sm text-gray-500 mt-1">O Gemini está a ler os detalhes da fatura</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6 text-gray-500" />
                  </div>
                  <p className="font-medium text-gray-900">Clica para carregar ou arrasta ficheiro</p>
                  <p className="text-sm text-gray-500 mt-1">Suporta PDF, JPG e PNG</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                className="w-full h-48 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm"
                placeholder="Cola aqui o texto copiado da fatura ou documento..."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                disabled={loading}
              />
              <Button 
                onClick={handleTextSubmit} 
                className="w-full py-6 text-lg" 
                disabled={loading || !texto.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Extrair Informação
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="mt-6 flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100 italic">
            <FileText className="w-5 h-5 text-blue-400 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              O Gemini 2.0 Flash pode extrair automaticamente o número da fatura, data, cliente e todos os itens (incluindo quantidades e preços unitários).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
