'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ChartData {
    name: string;
    value: number;
    color: string;
}

interface StatusDonutChartProps {
    data: ChartData[];
    title?: string;
    totalLabel?: string;
}

export function StatusDonutChart({ data, title, totalLabel = "Total" }: StatusDonutChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Filter out zero values so they don't break the donut or show empty tooltips
    const renderData = data.filter(d => d.value > 0);

    if (renderData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-slate-400">
                <p className="text-xs uppercase font-bold tracking-widest">Keine Daten</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full min-h-[250px] relative">
            {title && (
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{title}</h4>
            )}
            
            <div className="flex-1 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={renderData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {renderData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                            itemStyle={{ color: '#334155' }}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            iconType="circle"
                            formatter={(value, entry: any) => (
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 ml-1">{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
                
                {/* Center Total Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                    <span className="text-2xl font-black text-slate-800 tracking-tighter">{total}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{totalLabel}</span>
                </div>
            </div>
        </div>
    );
}
