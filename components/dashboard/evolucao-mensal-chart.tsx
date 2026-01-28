'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  ComposedChart
} from 'recharts'
import { formatarValor } from '@/lib/calculos/lucro'

interface DadosMensais {
  mes: string
  comissao: number
  lucro: number
  [key: string]: string | number
}

interface Props {
  data: DadosMensais[]
}

export function EvolucaoMensalChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Evolução Mensal</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-gray-500">Sem dados suficientes para gerar gráfico.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Comissões e Lucro (Últimos 12 Meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorComissao" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="mes" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                tickFormatter={(value) => `€${value}`}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' 
                }}
                formatter={(value: any) => [formatarValor(Number(value) || 0), '']}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar 
                dataKey="lucro" 
                name="Lucro Total" 
                fill="url(#colorLucro)" 
                radius={[6, 6, 0, 0]} 
                maxBarSize={40}
              />
              <Area 
                type="monotone" 
                dataKey="comissao" 
                name="Minha Comissão" 
                fill="url(#colorComissao)" 
                stroke="#3b82f6" 
                strokeWidth={3}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
