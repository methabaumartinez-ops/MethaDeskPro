import { cn } from '@/lib/utils';
import { getKSColorClasses, KSCategory, getKSFromAbteilung } from '@/lib/config/ksConfig';

interface KSBadgeProps {
  ks?: string | KSCategory | null;
  /** Pass abteilung if KS is undefined to auto-calculate it for display */
  abteilungFallback?: string | null;
  className?: string;
  showIcon?: boolean;
}

export function KSBadge({ ks, abteilungFallback, className, showIcon = false }: KSBadgeProps) {
  // If no explicit KS is provided, try to derive it from the Abteilung if available
  const displayKS = ks || (abteilungFallback ? getKSFromAbteilung(abteilungFallback) : 'Kein KS');

  if (displayKS === 'Kein KS' || !displayKS) return null; // Don't show badge if there is no KS

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border',
        getKSColorClasses(displayKS),
        className
      )}
    >
      {showIcon && (
        <span className="mr-1 opacity-70">
          {displayKS === 'KS 1 Baumeister' ? '🏗️' : '🏭'}
        </span>
      )}
      {displayKS}
    </span>
  );
}
