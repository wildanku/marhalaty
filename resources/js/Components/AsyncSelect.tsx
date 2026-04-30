import { useState, useEffect, useRef } from "react";

interface Option {
  id: string | number;
  label: string;
}

interface AsyncSelectProps {
  endpoint: string;
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
}

export default function AsyncSelect({ endpoint, value, onChange, placeholder = "Search...", className = "" }: AsyncSelectProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        if (selectedLabel) {
            setQuery(selectedLabel);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedLabel]);

  const fetchOptions = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${endpoint}?search=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setOptions(data);
      }
    } catch (error) {
      console.error("Error fetching async options:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setOpen(true);
    
    if (value) {
        onChange("");
        setSelectedLabel("");
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      fetchOptions(newQuery);
    }, 300);
  };

  const handleSelect = (option: Option) => {
    onChange(option.id);
    setSelectedLabel(option.label);
    setQuery(option.label);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
          <span className="material-symbols-outlined">search</span>
        </span>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { setOpen(true); fetchOptions(query); }}
          placeholder={placeholder}
          className="block w-full pl-12 pr-10 py-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors hover:bg-surface-container-highest"
        />
        {loading && (
            <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-outline">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </span>
        )}
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-surface-container-highest rounded-md shadow-lg border border-outline-variant/20 max-h-60 overflow-auto">
          {options.length === 0 && !loading ? (
            <div className="p-4 text-center text-sm text-on-surface-variant font-label">No results found.</div>
          ) : (
            <ul className="py-1">
              {options.map((option) => (
                <li
                  key={option.id}
                  onClick={() => handleSelect(option)}
                  className={`px-4 py-3 text-sm cursor-pointer hover:bg-primary hover:text-on-primary transition-colors font-body ${value === option.id ? 'bg-primary/10 text-primary font-medium' : 'text-on-surface'}`}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
