"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";

interface FilterOption {
  key: string;
  label: string;
  value: string;
}

interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  type?: 'select' | 'checkbox';
}

interface SearchFilterProps {
  onSearch?: (query: string) => void;
  onFilter?: (filters: Record<string, string[]>) => void;
  placeholder?: string;
  filters?: FilterGroup[];
  className?: string;
  showFilters?: boolean;
  searchValue?: string;
  filterValues?: Record<string, string[]>;
}

export function SearchFilter({
  onSearch,
  onFilter,
  placeholder = "Search...",
  filters = [],
  className = "",
  showFilters = true,
  searchValue = "",
  filterValues = {}
}: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState(searchValue);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(filterValues);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleFilterChange = (groupKey: string, optionKey: string, checked: boolean) => {
    const newFilters = { ...activeFilters };
    if (!newFilters[groupKey]) {
      newFilters[groupKey] = [];
    }
    
    if (checked) {
      newFilters[groupKey].push(optionKey);
    } else {
      newFilters[groupKey] = newFilters[groupKey].filter(key => key !== optionKey);
    }
    
    setActiveFilters(newFilters);
    onFilter?.(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    onFilter?.({});
  };

  const getActiveFilterCount = () => {
    return Object.values(activeFilters).reduce((count, values) => count + values.length, 0);
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Search Input */}
      <div className="relative flex-1">
        <div className="relative">
          <MagnifyingGlassIcon 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
            style={{ color: "var(--muted-foreground)" }}
          />
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm transition-colors focus:outline-none"
            style={{
              backgroundColor: "var(--muted)",
              color: "var(--foreground)",
              border: "1px solid var(--border)"
            }}
          />
        </div>
      </div>

      {/* Filter Button */}
      {showFilters && filters.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              getActiveFilterCount() > 0 && "ring-2 ring-orange-500/20"
            )}
            style={{
              backgroundColor: getActiveFilterCount() > 0 ? "var(--accent)" : "var(--muted)",
              color: getActiveFilterCount() > 0 ? "white" : "var(--foreground)"
            }}
          >
            <FunnelIcon className="h-4 w-4" />
            <span>Filters</span>
            {getActiveFilterCount() > 0 && (
              <span className="bg-white text-orange-500 text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {getActiveFilterCount()}
              </span>
            )}
          </button>

          {/* Filter Dropdown */}
          {showFilterDropdown && (
            <div 
              className="absolute right-0 top-full mt-2 w-80 rounded-xl z-50"
              style={{ 
                background: "var(--card)", 
                border: "1px solid var(--border)" 
              }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    Filters
                  </h3>
                  <button
                    onClick={clearAllFilters}
                    className="text-xs hover:underline"
                    style={{ color: "var(--accent)" }}
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-4">
                  {filters.map((group) => (
                    <div key={group.key}>
                      <h4 className="text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>
                        {group.label}
                      </h4>
                      <div className="space-y-2">
                        {group.options.map((option) => (
                          <label key={option.key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={activeFilters[group.key]?.includes(option.key) || false}
                              onChange={(e) => handleFilterChange(group.key, option.key, e.target.checked)}
                              className="rounded border-gray-300"
                              style={{ accentColor: "var(--accent)" }}
                            />
                            <span className="text-sm" style={{ color: "var(--foreground)" }}>
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simple Search Bar (without filters)
interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  value?: string;
}

export function SearchBar({ onSearch, placeholder = "Search...", className = "", value = "" }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState(value);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  return (
    <div className={cn("relative", className)}>
      <MagnifyingGlassIcon 
        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
        style={{ color: "var(--muted-foreground)" }}
      />
      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full pl-10 pr-4 py-2 rounded-lg text-sm transition-colors focus:outline-none"
        style={{
          backgroundColor: "var(--muted)",
          color: "var(--foreground)",
          border: "1px solid var(--border)"
        }}
      />
    </div>
  );
}
