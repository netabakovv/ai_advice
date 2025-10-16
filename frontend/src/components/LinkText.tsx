export interface LinkTextProps {
  label: string;
  onClick?: () => void;
  href?: string;
}

export function LinkText({ label, onClick, href }: LinkTextProps) {
  if (href) {
    return (
      <a
        href={href}
        className="text-sm text-[#4A6CF7] hover:text-[#3A5CE7] hover:underline"
      >
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-[#4A6CF7] hover:text-[#3A5CE7] hover:underline"
    >
      {label}
    </button>
  );
}
