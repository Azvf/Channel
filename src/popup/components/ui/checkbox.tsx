interface CheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Checkbox({ id, checked, onCheckedChange }: CheckboxProps) {
  return (
    <div className="relative flex items-center justify-center icon-sm">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="absolute opacity-0 cursor-pointer w-full h-full"
      />
      <div
        className="icon-sm rounded border-2 flex items-center justify-center transition-all"
        style={{
          // [Refactor] Tokenized Colors
          borderColor: checked 
            ? 'var(--bg-action-solid)' 
            : 'var(--border-glass-strong)',
          backgroundColor: checked 
            ? 'var(--bg-action-solid)' 
            : 'transparent'
        }}
      >
        {checked && (
          <svg
            width="9"
            height="9"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 6L5 9L10 3"
              stroke="white" // Always white on action color
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

