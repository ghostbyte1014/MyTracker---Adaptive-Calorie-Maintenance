'use client';

interface SignatureProps {
  className?: string;
}

export function Signature({ className = '' }: SignatureProps) {
  return (
    <div 
      className={`
        fixed bottom-6 right-6 z-40
        pointer-events-none
        ${className}
      `}
    >
      <span 
        className="
          text-xs
          text-orange-500/40
          hover:text-orange-500/60
          transition-opacity duration-300
          font-medium
          tracking-wide
        "
      >
        Built by: ghostbyte1014
      </span>
    </div>
  );
}
