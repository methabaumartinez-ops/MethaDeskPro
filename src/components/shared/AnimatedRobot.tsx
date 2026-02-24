import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedRobotProps {
    className?: string;
    isWaving?: boolean;
    isThinking?: boolean;
}

export const AnimatedRobot: React.FC<AnimatedRobotProps> = ({ className, isWaving = false, isThinking = false }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            className={cn("w-full h-full drop-shadow-md", className)}
        >
            <defs>
                <style>
                    {`
                    @keyframes wave {
                        0% { transform: rotate(0deg); }
                        25% { transform: rotate(-30deg); }
                        50% { transform: rotate(15deg); }
                        75% { transform: rotate(-30deg); }
                        100% { transform: rotate(0deg); }
                    }
                    @keyframes blink {
                        0%, 90%, 100% { transform: scaleY(1); }
                        95% { transform: scaleY(0.1); }
                    }
                    @keyframes hov {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-3px); }
                    }
                    .waving-arm {
                        transform-origin: 80px 65px;
                        animation: ${isWaving ? 'wave 1.5s infinite ease-in-out' : 'none'};
                    }
                    .hover-wave:hover .waving-arm {
                        animation: wave 1.5s infinite ease-in-out;
                    }
                    .robot-body {
                        animation: ${isWaving || isThinking ? 'hov 2s infinite ease-in-out' : 'none'};
                    }
                    .eye {
                        transform-origin: 40px 64px;
                        animation: blink 4s infinite;
                    }
                    .eye-right {
                        transform-origin: 60px 64px;
                        animation: blink 4s infinite;
                    }
                    `}
                </style>
                <linearGradient id="hatGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#EA580C" />
                </linearGradient>
            </defs>

            <g className="hover-wave robot-body">
                {/* Right Arm (Waving Arm) */}
                <g className="waving-arm">
                    <rect x="75" y="60" width="20" height="8" rx="4" fill="#9CA3AF" />
                    <circle cx="95" cy="64" r="5" fill="#4B5563" />
                </g>

                {/* Left Arm */}
                <rect x="5" y="60" width="20" height="8" rx="4" fill="#9CA3AF" />
                <circle cx="5" cy="64" r="5" fill="#4B5563" />

                {/* Head */}
                <rect x="25" y="45" width="50" height="46" rx="12" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2" />

                {/* Ears / Antennas */}
                <rect x="18" y="60" width="7" height="12" rx="3" fill="#9CA3AF" />
                <rect x="75" y="60" width="7" height="12" rx="3" fill="#9CA3AF" />

                {/* Eyes Box (Visor) */}
                <rect x="32" y="54" width="36" height="18" rx="6" fill="#1F2937" />

                {/* Eyes */}
                <circle cx="40" cy="63" r="4" fill="#60A5FA" className={cn("eye", isThinking ? "opacity-70" : "opacity-100")} />
                <circle cx="60" cy="63" r="4" fill="#60A5FA" className={cn("eye-right", isThinking ? "opacity-70" : "opacity-100")} />

                {/* Mouth */}
                {isWaving ? (
                    <path d="M 40 82 Q 50 88 60 82" fill="none" stroke="#4B5563" strokeWidth="3" strokeLinecap="round" />
                ) : isThinking ? (
                    <circle cx="50" cy="84" r="3" fill="#4B5563" />
                ) : (
                    <rect x="42" y="82" width="16" height="3" rx="1.5" fill="#4B5563" />
                )}

                {/* Hard Hat */}
                <path d="M 20 45 Q 20 15 50 15 Q 80 15 80 45 Z" fill="url(#hatGradient)" />
                {/* Hard Hat brim */}
                <rect x="15" y="42" width="70" height="6" rx="3" fill="#EA580C" />
                {/* Hard hat ridge */}
                <rect x="42" y="10" width="16" height="8" rx="4" fill="#C2410C" />

                {/* METHABAU Logo */}
                <g transform="translate(50, 32)">
                    <rect x="-18" y="-6" width="36" height="9" rx="1" fill="#000000" />
                    <text x="0" y="1" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="5px" textAnchor="middle">
                        <tspan fill="#F26A21">METHA</tspan><tspan fill="#FFFFFF">BAU</tspan>
                    </text>
                </g>
            </g>
        </svg>
    );
};
