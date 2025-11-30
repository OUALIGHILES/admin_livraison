import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps<T> {
  items: T[];
  placeholder?: string;
  onSearch: (items: T[]) => void;
  searchFields: string[];
  className?: string;
}

export function SearchBar<T>({
  items,
  placeholder = 'Search...',
  onSearch,
  searchFields,
  className = ''
}: SearchBarProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  };

  useEffect(() => {
    if (!searchTerm.trim()) {
      onSearch(items);
      return;
    }

    const filteredItems = items.filter((item) => {
      return searchFields.some((field) => {
        const value = getNestedValue(item, field);
        return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
      });
    });

    onSearch(filteredItems);
  }, [searchTerm, items, searchFields, onSearch]);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-slate-400" />
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}