import type { SVGProps } from "react";

export function CashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20 4H4c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h16c1.11 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm0 14H4v-2h16v2zm0-6H4V8h16v4z" />
      <circle cx="12" cy="11" r="2" fill="#4caf50" />
    </svg>
  );
}

export function KnetIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 24" className={className} aria-hidden="true">
      <rect width="60" height="24" rx="4" fill="#009639" />
      <text
        x="30"
        y="16.5"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="13"
        fill="#fff"
        letterSpacing="0.5"
      >
        KNET
      </text>
    </svg>
  );
}

export function VisaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 24" className={className} aria-hidden="true">
      <rect width="60" height="24" rx="4" fill="#fff" stroke="#e0e0e0" />
      <text
        x="30"
        y="17"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontStyle="italic"
        fontSize="16"
        fill="#1A1F71"
      >
        VISA
      </text>
    </svg>
  );
}

export function MastercardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 24" className={className} aria-hidden="true">
      <rect width="60" height="24" rx="4" fill="#fff" stroke="#e0e0e0" />
      <circle cx="27" cy="12" r="8" fill="#EB001B" />
      <circle cx="36" cy="12" r="8" fill="#F79E1B" opacity="0.9" />
    </svg>
  );
}

export function ApplePayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 24" className={className} aria-hidden="true">
      <rect width="60" height="24" rx="4" fill="#000" />
      <text
        x="30"
        y="16.5"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="600"
        fontSize="13"
        fill="#fff"
      >
        Pay
      </text>
    </svg>
  );
}
