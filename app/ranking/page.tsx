"use client"

import NavigationBar from "../components/NavigationBar"
import { useState } from "react"
import { Button } from "@/components/ui/button"

// Dummy data for demonstration
const dummyData = [
  {
    id: "1",
    summary: "Summary for item 1.",
    abstract: "Abstract for item 1.",
    pmid: "12345",
    level: "Layman",
    assigned_at: new Date().toISOString(),
  },
  {
    id: "2",
    summary: "Summary for item 2.",
    abstract: "Abstract for item 2.",
    pmid: "67890",
    level: "Expert",
    assigned_at: new Date().toISOString(),
  },
  {
    id: "3",
    summary: "Summary for item 3.",
    abstract: "Abstract for item 3.",
    pmid: "54321",
    level: "Intermediate",
    assigned_at: new Date().toISOString(),
  },
  {
    id: "4",
    summary: "Summary for item 4.",
    abstract: "Abstract for item 4.",
    pmid: "11111",
    level: "Layman",
    assigned_at: new Date().toISOString(),
  },
  {
    id: "5",
    summary: "Summary for item 5.",
    abstract: "Abstract for item 5.",
    pmid: "22222",
    level: "Expert",
    assigned_at: new Date().toISOString(),
  },
  {
    id: "6",
    summary: "Summary for item 6.",
    abstract: "Abstract for item 6.",
    pmid: "33333",
    level: "Intermediate",
    assigned_at: new Date().toISOString(),
  },
]

const PAGE_SIZE = 3

export default function RankingPage() {
  const [pageIndex, setPageIndex] = useState(0)
  const [isAbstractOpen, setIsAbstractOpen] = useState(false)
  const [summaries] = useState(dummyData.map(item => item.summary))
  const [radioValues, setRadioValues] = useState(Array(dummyData.length).fill(null))
  const totalPages = Math.ceil(dummyData.length / PAGE_SIZE)
  const startIdx = pageIndex * PAGE_SIZE
  const visibleSummaries = dummyData.slice(startIdx, startIdx + PAGE_SIZE)

  const handleNavigate = (idx: number) => {
    if (idx >= 0 && idx < totalPages) {
      setPageIndex(idx)
    }
  }

  // Assigned info for the first summary in the current page
  const first = visibleSummaries[0]

  const handleLogout = () => {
    alert("Logged out!")
    // TODO: Connect to real logout logic
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-gray-100 py-2 px-4 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-grow">
            {/* Menu toggle button on the left */}
            <button
              className="mr-4 p-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 focus:outline-none"
              onClick={() => setIsAbstractOpen(true)}
              aria-label="Show Abstract"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="9"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
                <line x1="9" y1="12" x2="15" y2="12"></line>
              </svg>
            </button>
            <h1 className="text-lg font-bold whitespace-nowrap flex-shrink-0">Ranking Page</h1>
            <div className="flex-grow max-w-[calc(100%-350px)]">
              <NavigationBar
                currentIndex={pageIndex}
                totalItems={totalPages}
                onNavigate={handleNavigate}
              />
            </div>
          </div>
          {/* Logout button on the top right */}
          <Button
            onClick={handleLogout}
            size="sm"
            className="ml-4"
          >
            Logout
          </Button>
        </div>
      </header>
      {/* Assigned on and Level info only above the left column */}
      <div className="bg-gray-50 px-4 py-2 border-b flex gap-4 items-center">
        {first && (
          <div className="flex flex-col gap-1">
            <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              Assigned on: {new Date(first.assigned_at).toLocaleDateString()}
            </div>
            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Level: {first.level}
            </div>
          </div>
        )}
      </div>
      <main className="flex-grow overflow-hidden flex flex-col lg:flex-row">
        {visibleSummaries.map((item, idx) => (
          <div key={item.id} className="lg:w-1/3 h-full overflow-y-auto p-4 border-r:last:border-r-0 flex flex-col">
            <label className="mb-2 text-sm font-semibold">Summary</label>
            <textarea
              className="border rounded-lg p-3 min-h-[200px] flex-1 bg-white"
              value={summaries[startIdx + idx]}
              readOnly
            />
            {/* Radio buttons group */}
            <div className="mt-4 flex gap-4 items-center">
              {[1, 2, 3].map((val) => (
                <label key={val} className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={`radio-${startIdx + idx}`}
                    value={val}
                    checked={radioValues[startIdx + idx] === val}
                    onChange={() => {
                      setRadioValues(prev => prev.map((v, i) => i === startIdx + idx ? val : v))
                    }}
                  />
                  <span>{val}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </main>
      {/* Sticky footer with submit button */}
      <footer className="bg-gray-100 pt-2 pb-3 px-4 sticky bottom-0 z-10 flex justify-end">
        <Button
          type="button"
          className="w-full"
          disabled={visibleSummaries.some((_, idx) => !radioValues[startIdx + idx])}
          onClick={() => {
            const selected = visibleSummaries.map((_, idx) => radioValues[startIdx + idx])
            alert(`Submitted values: ${selected.join(", ")}`)
          }}
        >
          Submit
        </Button>
      </footer>
      {/* Sliding abstract drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ${isAbstractOpen ? 'translate-x-0' : '-translate-x-full'} w-full max-w-md bg-white shadow-lg border-r flex flex-col`} style={{ pointerEvents: isAbstractOpen ? 'auto' : 'none' }}>
        <div className="relative p-6 flex flex-col h-full">
          <button
            className="absolute top-2 right-2 p-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700"
            onClick={() => setIsAbstractOpen(false)}
            aria-label="Close Abstract"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <h2 className="text-lg font-semibold mb-2">Abstract</h2>
          <textarea
            className="border rounded-lg p-3 min-h-[200px] bg-gray-50 resize-none flex-1"
            value={first?.abstract || ''}
            readOnly
          />
        </div>
      </div>
    </div>
  )
} 