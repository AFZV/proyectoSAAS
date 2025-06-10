"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
  XAxis,
} from "recharts";
import { formatValue } from "@/utils/FormartValue";

type recaudosPorMes = { Mes: string; cobros: number };

export function GraphicsRecaudos({ data }: { data: recaudosPorMes[] }) {
  // ✅ Verificar si todos los valores son 0
  const hasData = data.some(item => item.cobros > 0);
  const maxValue = Math.max(...data.map(item => item.cobros));
  
  // ✅ Configurar dominio dinámico
  const yAxisDomain = hasData ? ['dataMin', 'dataMax + 100'] : [0, 1000];

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ 
            top: 20, 
            right: 20, 
            left: 60, 
            bottom: 70  // ✅ Más espacio para etiquetas rotadas
          }}
        >
          <defs>
            <linearGradient id="colorCobrosNew" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="Mes"
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 11, 
              fill: '#6B7280',
              textAnchor: 'end'
            }}
            angle={-45}
            interval={0}
            height={60}  // ✅ Altura fija para etiquetas
            className="text-xs"
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickFormatter={(value) => {
              if (value === 0) return '$0';
              if (value >= 1000000) return `$${(value/1000000).toFixed(1)}M`;
              if (value >= 1000) return `$${(value/1000).toFixed(0)}K`;
              return `$${value}`;
            }}
            width={55}
            domain={yAxisDomain}  // ✅ Dominio dinámico
            allowDataOverflow={false}
          />
          <Tooltip 
            formatter={(value: number) => [
              value === 0 ? '$0' : formatValue(value), 
              "Cobros"
            ]}
            labelStyle={{ 
              color: '#374151', 
              fontSize: '12px',
              fontWeight: '500'
            }}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '12px'
            }}
          />
          <Area
            type="monotone"
            dataKey="cobros"
            stroke="#10B981"
            strokeWidth={hasData ? 2 : 1}  // ✅ Línea más fina si no hay datos
            fillOpacity={1}
            fill="url(#colorCobrosNew)"
            dot={false}
            activeDot={{ 
              r: 4, 
              stroke: '#10B981', 
              strokeWidth: 2, 
              fill: '#ffffff' 
            }}
            connectNulls={false}
          />
          
          {/* ✅ Mensaje cuando no hay datos */}
          {!hasData && (
            <text 
              x="50%" 
              y="40%" 
              textAnchor="middle" 
              fill="#9CA3AF" 
              fontSize="14"
              fontWeight="500"
            >
              Sin datos de cobros
            </text>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}