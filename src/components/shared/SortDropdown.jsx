import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SortDropdown({ value, onChange, options, storageKey }) {
  const handleChange = (v) => {
    onChange(v);
    if (storageKey) localStorage.setItem(storageKey, v);
  };
  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-40 bg-white/[0.03] border-white/[0.08] text-white text-xs h-8">
        <ArrowUpDown className="w-3 h-3 mr-1" />
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent className="bg-card border-white/10">
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}