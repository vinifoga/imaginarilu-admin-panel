// components/PercentageInput.tsx
'use client';

import { useEffect, useState } from 'react';

interface PercentageInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  max?: number;
  decimalPlaces?: number;
}

export function PercentageInput({
  value,
  onChange,
  className = '',
  max = 100,
  decimalPlaces = 2
}: PercentageInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused && value !== undefined && value !== null) {
      const formatted = value.toFixed(decimalPlaces).replace('.', ',');
      setDisplayValue(formatted);
    }
  }, [value, decimalPlaces, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    let rawValue = inputValue
      .replace(/%/g, '')
      .replace(/[^0-9,]/g, '')
      .replace(/(,.*?),/g, '$1');

    if (rawValue.startsWith(',')) {
      rawValue = '0' + rawValue;
    }

    const commaIndex = rawValue.indexOf(',');
    if (commaIndex > -1) {
      rawValue = rawValue.substring(0, commaIndex + 1) +
        rawValue.substring(commaIndex + 1).replace(/,/g, '');
    }

    if (commaIndex > -1) {
      const decimalPart = rawValue.substring(commaIndex + 1);
      if (decimalPart.length > decimalPlaces) {
        rawValue = rawValue.substring(0, commaIndex + 1 + decimalPlaces);
      }
    }

    setDisplayValue(rawValue);

    if (rawValue === '' || rawValue === ',') {
      onChange(0);
    } else {
      const numberValue = parseFloat(rawValue.replace(',', '.')) || 0;
      const clampedValue = Math.min(numberValue, max);
      onChange(clampedValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (displayValue.endsWith(',00')) {
      setDisplayValue(displayValue.replace(',00', ''));
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numberValue = parseFloat(displayValue.replace(',', '.')) || 0;
    const clampedValue = Math.min(numberValue, max);
    const formatted = clampedValue.toFixed(decimalPlaces).replace('.', ',');
    setDisplayValue(formatted);
    onChange(clampedValue);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`pr-8 ${className}`}
      />
      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
    </div>
  );
}