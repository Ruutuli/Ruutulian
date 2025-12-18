interface FilterInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  focusColor?: 'pink' | 'purple';
}

export function FilterInput({
  label,
  value,
  onChange,
  placeholder,
  focusColor = 'pink',
}: FilterInputProps) {
  const focusRingClass = focusColor === 'pink' 
    ? 'focus:ring-pink-500' 
    : 'focus:ring-purple-500';

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 ${focusRingClass}`}
      />
    </div>
  );
}

