import React, { useState, useEffect } from "react";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
}

export default function CurrencyInput({ value, onChange, className = "", ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("");

  const formatNumber = (val: string | number) => {
    if (val === null || val === undefined || val === "") return "";
    const numericString = String(val).replace(/\D/g, "");
    return numericString.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    setDisplayValue(formatNumber(rawValue));
    onChange(rawValue);
  };

  return (
    <div className="relative">
      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant font-medium">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        className={`block w-full pl-10 pr-3 py-2 bg-surface text-on-surface border border-outline rounded-lg focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
