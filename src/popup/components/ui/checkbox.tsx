interface CheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Checkbox({ id, checked, onCheckedChange }: CheckboxProps) {
  return (
    <div className="relative flex items-center justify-center w-3.5 h-3.5">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="absolute opacity-0 cursor-pointer w-full h-full"
      />
      <div
        className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all ${
          checked 
            ? "border-color: 'var(--c-action)' bg-color: 'var(--c-action)'" 
            : "border-color-mix(in srgb, var(--c-content) 30%, transparent)"
        }`}
        style={{
          borderColor: checked 
            ? 'var(--c-action)' 
            : 'color-mix(in srgb, var(--c-content) 30%, transparent)',
          backgroundColor: checked 
            ? 'var(--c-action)' 
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
              stroke="white"
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

