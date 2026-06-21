import { ReactNode } from "react";
import { Input } from "./Form";

export function SearchFilterBar({
  search,
  onSearchChange,
  placeholder = "Search...",
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[200px]">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Search"
        />
      </div>
      {children}
    </div>
  );
}
