"use client";

import { Input } from "antd";
import { Select } from "antd";
import { Search } from "lucide-react";
export type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc";

const sortLabels: Record<SortOption, string> = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  "name-asc": "Name: A to Z",
};

export function ShopToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  resultCount,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  resultCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#e4dac8] pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:border-border">
      <div className="relative w-full sm:max-w-sm">
      
       
        <Input
          id="shop-search"
          type="text"
          size="large"
          allowClear
          prefix={
            <Search
              className="h-4 w-4 text-warm-gray"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          }
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search for tea or blend..."
          aria-label="Search products"
          
        />
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <p
          aria-live="polite"
          className="shrink-0 rounded-full bg-[#eef3ea] px-3 py-1 font-sans text-[12px] font-medium text-green-deep"
        >
          {resultCount} {resultCount === 1 ? "product" : "products"}
        </p>
        <div className="flex items-center gap-2 font-sans text-[13px] text-warm-gray">
          <span className="hidden min-[400px]:inline">Sort by</span>
          <Select<SortOption>
            className="sort-select"
            value={sort}
            onChange={onSortChange}
            options={Object.entries(sortLabels).map(([value, label]) => ({
              value: value as SortOption,
              label,
            }))}
            style={{ minWidth: 170 }}
            aria-label="Sort products"
          />
        </div>
      </div>
    </div>
  );
}
