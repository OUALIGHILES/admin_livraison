import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface SearchableSelectProps<T> {
  items: T[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  displayField: keyof T;
  valueField: keyof T;
  filterFields?: (keyof T)[];
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect<T>({
  items,
  value,
  onChange,
  placeholder,
  displayField,
  valueField,
  filterFields = [],
  className = '',
  disabled = false
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<T[]>(items);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter items based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = items.filter(item => {
      // Check if the term matches the display field
      const displayValue = String(item[displayField]).toLowerCase();
      if (displayValue.includes(term)) {
        return true;
      }

      // Check additional filter fields
      for (const field of filterFields) {
        const fieldValue = String(item[field]).toLowerCase();
        if (fieldValue.includes(term)) {
          return true;
        }
      }

      return false;
    });

    setFilteredItems(filtered);
  }, [searchTerm, items, displayField, filterFields]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = items.find(item => String(item[valueField]) === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        className={`flex items-center justify-between px-4 py-2 border rounded-lg cursor-pointer ${
          disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white hover:bg-slate-50'
        } ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-300'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`${selectedOption ? 'text-slate-900' : 'text-slate-500'}`}>
          {selectedOption ? String(selectedOption[displayField]) : placeholder}
        </span>
        <Search className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} size={20} />
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b border-slate-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>
          
          <div className="max-h-40 overflow-y-auto">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => (
                <div
                  key={String(item[valueField])}
                  className={`px-4 py-2 cursor-pointer hover:bg-slate-100 ${
                    String(item[valueField]) === value ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => {
                    onChange(String(item[valueField]));
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {String(item[displayField])}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-slate-500">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}