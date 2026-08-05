interface NavIconProps {
  className?: string;
}

export function NavIconHome({ className = "h-5 w-5" }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NavIconSales({ className = "h-5 w-5" }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 7h10l-1.2 7H8.2L7 7Zm2-3h6l1 3H8l1-3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="18" r="1.25" fill="currentColor" />
      <circle cx="16" cy="18" r="1.25" fill="currentColor" />
    </svg>
  );
}

export function NavIconTables({ className = "h-5 w-5" }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 10h16M9 5v12M15 5v12" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function NavIconMore({ className = "h-5 w-5" }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="18" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
