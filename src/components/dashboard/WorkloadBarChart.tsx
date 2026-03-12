'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BarData {
    name: string;
    value: number;
    color?: string;
}

interface WorkloadBarChartProps {
    data: BarData[];
    title?: string;
    yAxisFormatter?: (value: number) => string;
}

export function WorkloadBarChart({ data, title, yAxisFormatter }: WorkloadBarChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-slate-400">
                <p className="text-xs uppercase font-bold tracking-widest">Keine Daten</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full min-h-[250px]">
            {title && (
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{title}</h4>
            )}
            
            <div className="flex-1 w-full h-full pr-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 5, right: 10, left: 10, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 10, fontWeight: 'bold' }}
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 'bold' }}
                            tickFormatter={yAxisFormatter}
                            width={50}
                        />
                        <Tooltip
                            cursor={{ fill: '#F1F5F9' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                            formatter={(value: number) => {
                                return [yAxisFormatter ? yAxisFormatter(value) : value, 'Wert'];
                            }}
                            labelStyle={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
