interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  focusColor?: 'pink' | 'purple';
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  focusColor = 'pink',
}: FilterSelectProps) {
  const focusRingClass = focusColor === 'pink' 
    ? 'focus:ring-pink-500' 
    : 'focus:ring-purple-500';

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 ${focusRingClass}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

