import React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface NavigationBarProps {
  currentIndex: number
  totalItems: number
  onNavigate: (index: number) => void
}

export default function NavigationBar({ currentIndex, totalItems, onNavigate }: NavigationBarProps) {
  // Function to determine which buttons to show
  const getPageNumbers = () => {
    // Always show first and last page
    const firstPage = 0;
    const lastPage = totalItems - 1;
    
    // Number of buttons to show around current page
    const maxButtonsToShow = 8;
    
    // Start with first and last page
    const pages = new Set<number>([firstPage, lastPage]);
    
    // Add current page and pages around it
    const startRange = Math.max(firstPage, currentIndex - Math.floor(maxButtonsToShow / 2));
    const endRange = Math.min(lastPage, startRange + maxButtonsToShow);
    
    for (let i = startRange; i <= endRange; i++) {
      pages.add(i);
    }
    
    return Array.from(pages).sort((a, b) => a - b);
  };
  
  const pageNumbers = getPageNumbers();
  
  // Render the navigation bar
  return (
    <div className="flex items-center space-x-2 py-1 w-full">
      {/* First page button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(0)}
        disabled={currentIndex === 0}
        className="h-8 w-8 min-w-0 p-0 flex-shrink-0"
        title="First page"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      
      {/* Previous page button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(Math.max(0, currentIndex - 1))}
        disabled={currentIndex === 0}
        className="h-8 w-8 min-w-0 p-0 flex-shrink-0"
        title="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {/* Page numbers with ellipses */}
      <div className="flex items-center space-x-1 flex-wrap overflow-visible flex-1 justify-center">
        {pageNumbers.map((pageIndex, i) => {
          // Show ellipsis if there's a gap between page numbers
          const showEllipsisBefore = i > 0 && pageIndex > pageNumbers[i - 1] + 1;
          
          return (
            <React.Fragment key={pageIndex}>
              {showEllipsisBefore && (
                <span className="px-1 text-gray-400">...</span>
              )}
              <Button
                variant={pageIndex === currentIndex ? "default" : "outline"}
                onClick={() => onNavigate(pageIndex)}
                className={`h-8 w-8 min-w-0 p-0 ${pageIndex === currentIndex ? 'bg-gray-900 text-white' : ''}`}
                title={`Page ${pageIndex + 1}`}
              >
                {pageIndex + 1}
              </Button>
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Next page button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(Math.min(totalItems - 1, currentIndex + 1))}
        disabled={currentIndex === totalItems - 1}
        className="h-8 w-8 min-w-0 p-0 flex-shrink-0"
        title="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      {/* Last page button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(totalItems - 1)}
        disabled={currentIndex === totalItems - 1}
        className="h-8 w-8 min-w-0 p-0 flex-shrink-0"
        title="Last page"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

