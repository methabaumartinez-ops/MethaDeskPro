import { cn } from '@/lib/utils';
import { getKSColorClasses, ksValueToLabel, getKSFromAbteilung } from '@/lib/config/ksConfig';

interface KSBadgeProps {
  ks?: string | null;
  /** Pass abteilung if KS is undefined to auto-calculate it for display */
  abteilungFallback?: string | null;
  className?: string;
  showIcon?: boolean;
}

export function KSBadge({ ks, abteilungFallback, className, showIcon = false }: KSBadgeProps) {
  // Resolve KS: use explicit value, or derive from Abteilung as fallback
  const rawKS = ks || (abteilungFallback ? getKSFromAbteilung(abteilungFallback) : '');
  const displayKS = ksValueToLabel(rawKS);

  if (displayKS === 'Kein KS' || !displayKS) return null;

  const icon =
    displayKS === 'KS 1 Baumeister' ? '🏗️' :
    displayKS === 'KS 2 Produktion'  ? '🏭' :
    displayKS === 'KS 3 Andere'      ? '📦' : null;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border',
        getKSColorClasses(rawKS),
        className
      )}
    >
      {showIcon && icon && (
        <span className="mr-1 opacity-70">{icon}</span>
      )}
      {displayKS}
    </span>
  );
}
