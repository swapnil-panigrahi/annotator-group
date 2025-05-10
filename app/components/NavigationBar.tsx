import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface NavigationBarProps {
  currentIndex: number
  totalItems: number
  onNavigate: (index: number) => void
}

export default function NavigationBar({ currentIndex, totalItems, onNavigate }: NavigationBarProps) {
  // Responsive state to track screen size
  const [windowWidth, setWindowWidth] = useState<number>(0);
  
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
    // Always show first and last page
    const firstPage = 0;
    const lastPage = totalItems - 1;
    
    // Adjust number of buttons based on screen width
    let maxButtonsToShow = 8;
    if (windowWidth < 640) {
      maxButtonsToShow = 1; // Just show current page on smallest screens
    } else if (windowWidth < 768) {
      maxButtonsToShow = 3; // Show fewer pages on small screens
    } else if (windowWidth < 1024) {
      maxButtonsToShow = 5; // Medium screens
    }
    
    // Start with first and last page
    const pages = new Set<number>([firstPage, lastPage]);
    
    // Always add current page
    pages.add(currentIndex);
    
    // Add pages around current
    const halfRange = Math.floor((maxButtonsToShow - 1) / 2);
    const startRange = Math.max(firstPage + 1, currentIndex - halfRange);
    const endRange = Math.min(lastPage - 1, startRange + maxButtonsToShow - 2);
    
    for (let i = startRange; i <= endRange; i++) {
      pages.add(i);
    }
    
    return Array.from(pages).sort((a, b) => a - b);
  };
  
  const pageNumbers = getPageNumbers();
  
  // Render the navigation bar
  return (
    <div className="flex items-center gap-1 py-1 w-full overflow-hidden">
      {/* First page button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(0)}
        disabled={currentIndex === 0}
        className="h-8 w-8 min-w-8 p-0 flex-shrink-0 hidden sm:flex items-center justify-center"
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
        className="h-8 w-8 min-w-8 p-0 flex-shrink-0 flex items-center justify-center"
        title="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {/* Page numbers with ellipses */}
      <div className="flex items-center gap-1 overflow-hidden flex-nowrap justify-center">
        {pageNumbers.map((pageIndex, i) => {
          // Show ellipsis if there's a gap between page numbers
          const showEllipsisBefore = i > 0 && pageIndex > pageNumbers[i - 1] + 1;
          
          return (
            <React.Fragment key={pageIndex}>
              {showEllipsisBefore && (
                <span className="px-1 text-gray-400 flex-shrink-0">...</span>
              )}
              <Button
                variant={pageIndex === currentIndex ? "default" : "outline"}
                onClick={() => onNavigate(pageIndex)}
                className={`h-8 w-8 min-w-8 p-0 flex-shrink-0 flex items-center justify-center ${
                  pageIndex === currentIndex ? 'bg-gray-900 text-white' : ''
                }`}
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
        className="h-8 w-8 min-w-8 p-0 flex-shrink-0 flex items-center justify-center"
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
        className="h-8 w-8 min-w-8 p-0 flex-shrink-0 hidden sm:flex items-center justify-center"
        title="Last page"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

