import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface NavigationBarProps {
  currentIndex: number
  totalItems: number
  onNavigate: (index: number) => void
}

export default function NavigationBar({ currentIndex, totalItems, onNavigate }: NavigationBarProps) {
  // Responsive state to track screen size
  const [windowWidth, setWindowWidth] = useState<number>(0);
  // State for page jump input
  const [pageInput, setPageInput] = useState<string>("");
  
  // Update page input when current index changes
  useEffect(() => {
    setPageInput((currentIndex + 1).toString());
  }, [currentIndex]);
  
  // Set up window resize listener
  useEffect(() => {
    // Initialize window width
    setWindowWidth(window.innerWidth);
    
    // Add event listener for window resize
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Function to determine which buttons to show, adjusting for window size
  const getPageNumbers = () => {
    const firstPage = 0;
    const lastPage = totalItems - 1;
    let maxButtonsToShow = 8;
    if (windowWidth < 640) {
      maxButtonsToShow = 1;
    } else if (windowWidth < 768) {
      maxButtonsToShow = 3;
    } else if (windowWidth < 1024) {
      maxButtonsToShow = 5;
    }
    const pages = [];
    if (totalItems <= maxButtonsToShow) {
      for (let i = 0; i < totalItems; i++) pages.push(i);
    } else {
      pages.push(firstPage);
      let start = Math.max(currentIndex - Math.floor((maxButtonsToShow - 3) / 2), 1);
      let end = Math.min(start + maxButtonsToShow - 3, lastPage - 1);
      if (end - start < maxButtonsToShow - 3) {
        start = Math.max(end - (maxButtonsToShow - 3), 1);
      }
      if (start > 1) pages.push(-1); // -1 for ellipsis
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < lastPage - 1) pages.push(-1);
      pages.push(lastPage);
    }
    return pages;
  };

  // Handle page input change
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, "");
    setPageInput(val);
  };

  // Handle page input submission
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNumber = parseInt(pageInput, 10);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalItems) {
      onNavigate(pageNumber - 1);
    } else {
      setPageInput((currentIndex + 1).toString());
    }
  };

  // Handle dropdown selection
  const handleSelectChange = (value: string) => {
    const pageNumber = parseInt(value, 10);
    if (!isNaN(pageNumber)) {
      onNavigate(pageNumber - 1);
    }
  };

  const pageNumbers = getPageNumbers();
  const dropdownOptions = Array.from({ length: totalItems }, (_, i) => i + 1);

  return (
    <nav className="flex items-center gap-1 py-1 w-full overflow-hidden" aria-label="Pagination">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(0)}
        disabled={currentIndex === 0}
        className="h-8 w-8 min-w-8 p-0 flex-shrink-0 hidden sm:flex items-center justify-center"
        title="First page"
        aria-label="First page"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(Math.max(0, currentIndex - 1))}
        disabled={currentIndex === 0}
        className="h-8 w-8 min-w-8 p-0 flex-shrink-0 flex items-center justify-center"
        title="Previous page"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {/* Page numbers with ellipsis for large sets, visible on md+ screens */}
      <ul className="hidden md:flex items-center gap-1" role="list">
        {pageNumbers.map((num, idx) =>
          num === -1 ? (
            <li key={"ellipsis-" + idx} className="px-1 text-gray-400 select-none">…</li>
          ) : (
            <li key={num}>
              <Button
                variant={num === currentIndex ? "default" : "ghost"}
                size="sm"
                className={`h-8 w-8 min-w-8 p-0 flex-shrink-0 items-center justify-center ${num === currentIndex ? "font-bold border border-primary" : ""}`}
                onClick={() => onNavigate(num)}
                aria-current={num === currentIndex ? "page" : undefined}
                aria-label={`Go to page ${num + 1}`}
                tabIndex={0}
              >
                {num + 1}
              </Button>
            </li>
          )
        )}
      </ul>
      <span className="text-xs text-gray-500 whitespace-nowrap mx-1" aria-live="polite">
        of {totalItems}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(Math.min(totalItems - 1, currentIndex + 1))}
        disabled={currentIndex === totalItems - 1}
        className="h-8 w-8 min-w-8 p-0 flex-shrink-0 flex items-center justify-center"
        title="Next page"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(totalItems - 1)}
        disabled={currentIndex === totalItems - 1}
        className="h-8 w-8 min-w-8 p-0 flex-shrink-0 hidden sm:flex items-center justify-center"
        title="Last page"
        aria-label="Last page"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
      {/* Move direct page input/dropdown to the right of the arrows */}
      <div className="flex items-center gap-1 ml-2">
        {/* Page input for direct jump - show on larger screens */}
        <form onSubmit={handlePageInputSubmit} className="hidden md:flex items-center gap-1">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pageInput}
            onChange={handlePageInputChange}
            onFocus={e => e.target.select()}
            className="w-12 h-7 text-center text-xs rounded-md border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary px-2"
            style={{ minWidth: '2.75rem', maxWidth: '3rem' }}
            title="Enter page number and press Enter"
            aria-label="Jump to page"
          />
          <Button
            type="submit"
            size="sm"
            className="h-7 px-2 text-xs rounded-md"
            style={{ minWidth: '2.25rem' }}
            disabled={
              !pageInput ||
              isNaN(Number(pageInput)) ||
              Number(pageInput) < 1 ||
              Number(pageInput) > totalItems
            }
            title="Go to page"
            aria-label="Go to page"
          >
            Go
          </Button>
        </form>
        {/* Dropdown for page selection - show on smaller screens */}
        <div className="md:hidden flex items-center gap-1">
          <Select
            value={(currentIndex + 1).toString()}
            onValueChange={handleSelectChange}
          >
            <SelectTrigger className="h-7 w-12 text-xs rounded-md" aria-label="Select page">
              <SelectValue placeholder={(currentIndex + 1).toString()} />
            </SelectTrigger>
            <SelectContent>
              {dropdownOptions.length <= 100 ? (
                dropdownOptions.map((page) => (
                  <SelectItem key={page} value={page.toString()} aria-label={`Go to page ${page}`}
                    className="text-xs h-7 min-h-0">
                    {page}
                  </SelectItem>
                ))
              ) : (
                [
                  ...dropdownOptions.slice(0, 5),
                  ...dropdownOptions.slice(
                    Math.max(0, currentIndex - 2),
                    Math.min(dropdownOptions.length, currentIndex + 3)
                  ),
                  ...dropdownOptions.slice(dropdownOptions.length - 5)
                ]
                  .filter((value, index, self) => self.indexOf(value) === index)
                  .sort((a, b) => a - b)
                  .map((page) => (
                    <SelectItem key={page} value={page.toString()} aria-label={`Go to page ${page}`}
                      className="text-xs h-7 min-h-0">
                      {page}
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-7 px-2 text-xs rounded-md"
            style={{ minWidth: '2.25rem' }}
            onClick={() => handleSelectChange((currentIndex + 1).toString())}
            title="Go to page"
            aria-label="Go to page"
          >
            Go
          </Button>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap ml-1" aria-live="polite">
          of {totalItems}
        </span>
      </div>
    </nav>
  )
}

