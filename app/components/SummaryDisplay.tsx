import React, { useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";

interface SummaryDisplayProps {
  summary: string;
  pmid?: string;
  level?: string;
  onAddLabel?: (label: string, selectedText: string, startIndex: number, endIndex: number, correctedText: string) => void;
  onDeleteLabel?: (index: number) => void;
  labels?: Array<{
    text: string;
    type: string;
    startIndex: number;
    endIndex: number;
    correctedText?: string;
  }>;
}

interface Label {
  text: string;
  type: string;
  startIndex: number;
  endIndex: number;
  correctedText?: string;
}

export default function SummaryDisplay({ summary, pmid, level, onAddLabel, onDeleteLabel, labels = [] }: SummaryDisplayProps) {
  const [selectedText, setSelectedText] = useState("");
  const [correctedText, setCorrectedText] = useState("");
  const [selectionIndices, setSelectionIndices] = useState<{ start: number; end: number } | null>(null);
  const [highlightedLabel, setHighlightedLabel] = useState<number | null>(null);
  // Store original text separately
  const originalText = summary;

  const labelTypes = [
    "Incorrect definitions",
    "Incorrect synonyms", 
    "Entity errors",
    "Contradiction",
    "Omission",
    "Jumping to conclusions",
    "Misinterpretation",
    "Structural Error",
    "Hallucination",
    "Grammatical Error",
    "Feedback"
  ];

  // A simple, direct approach to handle selection
  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectedText("");
      setSelectionIndices(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    
    try {
      // Get the element that contains the selection
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      
      // Try to find the closest span element that has data attributes
      let current: Node | null = node;
      let startSpan: HTMLElement | null = null;
      
      // Walk up the DOM to find a span with data attributes
      while (current && current !== document.body) {
        if (current.nodeType === Node.ELEMENT_NODE && 
            (current as HTMLElement).tagName === 'SPAN' && 
            (current as HTMLElement).dataset.originalStart) {
          startSpan = current as HTMLElement;
          break;
        }
        current = current.parentNode;
      }
      
      if (!startSpan) {
        console.log('Could not find a span with data attributes');
        return;
      }
      
      // Get the original text offsets from the data attributes
      const originalStart = parseInt(startSpan.dataset.originalStart || '0', 10);
      
      // Calculate the offset within the span
      let offsetInSpan = 0;
      
      // If the selection starts in a text node, calculate its offset
      if (node.nodeType === Node.TEXT_NODE) {
        // Find the offset within this text node
        offsetInSpan = range.startOffset;
        
        // If the node isn't the first child, add lengths of previous text nodes
        let prevNode = node.previousSibling;
        while (prevNode) {
          if (prevNode.nodeType === Node.TEXT_NODE) {
            offsetInSpan += prevNode.textContent?.length || 0;
          }
          prevNode = prevNode.previousSibling;
        }
      }
      
      // Calculate the final position in the original text
      const originalStartIndex = originalStart + offsetInSpan;
      const originalEndIndex = originalStartIndex + selectedText.length;
      
      // Verify we've got the right text by comparing with the original
      const textFromOriginal = originalText.substring(originalStartIndex, originalEndIndex);
      
      console.log('Selection details:', {
        selectedText,
        originalStartIndex,
        originalEndIndex,
        textFromOriginal,
        match: textFromOriginal === selectedText
      });
      
      // Set the state with our selection info
      setSelectedText(selectedText);
      setCorrectedText(selectedText);
      setSelectionIndices({
        start: originalStartIndex,
        end: originalEndIndex
      });
      
    } catch (error) {
      console.error('Error during text selection:', error);
    }
  };

  const addLabel = (labelType: string) => {
    if (selectedText && selectionIndices) {
      onAddLabel?.(labelType, selectedText, selectionIndices.start, selectionIndices.end, correctedText);
      setSelectedText("");
      setCorrectedText("");
      setSelectionIndices(null);
    }
  };

  // Improved rendering function that uses data attributes to store original positions
  const renderHighlightedText = () => {
    // Build a map of highlights indexed by position
    const highlightMap = new Map<number, Array<{
      type: string;
      text: string;
      endIndex: number;
      correctedText?: string;
    }>>();
    
    // Process all labels plus current selection
    const allHighlights = [...labels];
    
    // Add current selection if it exists
    if (selectionIndices && selectedText) {
      allHighlights.push({
        text: selectedText,
        type: 'current-selection',
        startIndex: selectionIndices.start,
        endIndex: selectionIndices.end,
        correctedText
      });
    }
    
    // Group highlights by start index
    allHighlights.forEach((highlight, index) => {
      if (!highlightMap.has(highlight.startIndex)) {
        highlightMap.set(highlight.startIndex, []);
      }
      highlightMap.get(highlight.startIndex)?.push({
        type: highlight.type,
        text: highlight.text,
        endIndex: highlight.endIndex,
        correctedText: highlight.correctedText
      });
    });
    
    // Sort start positions
    const startPositions = Array.from(highlightMap.keys()).sort((a, b) => a - b);
    
    // Build segments for rendering
    const segments: JSX.Element[] = [];
    let lastIndex = 0;
    
    // Create each text segment
    for (let i = 0; i < startPositions.length; i++) {
      const position = startPositions[i];
      const highlights = highlightMap.get(position) || [];
      
      // Add text before this highlight if any
      if (position > lastIndex) {
        segments.push(
          <span
            key={`text-${i}`}
            data-original-start={lastIndex}
            data-original-end={position}
          >
            {originalText.substring(lastIndex, position)}
          </span>
        );
      }
      
      // Process all highlights at this position
      for (let j = 0; j < highlights.length; j++) {
        const highlight = highlights[j];
        const highlightIndex = labels.findIndex(l => 
          l.startIndex === position && 
          l.endIndex === highlight.endIndex &&
          l.type === highlight.type
        );
        
        // Determine highlight style
        let highlightClass = '';
        if (highlight.type === 'current-selection') {
          highlightClass = 'bg-blue-200 border-b-2 border-blue-400';
        } else {
          highlightClass = `${highlightedLabel === highlightIndex ? 'bg-yellow-200' : 'bg-yellow-100'} transition-colors duration-200`;
          
          if (highlight.correctedText && highlight.correctedText !== highlight.text) {
            highlightClass = `${highlightedLabel === highlightIndex ? 'bg-green-200' : 'bg-green-100'} border-b-2 border-green-400 transition-colors duration-200`;
          }
        }
        
        segments.push(
          <React.Fragment key={`highlight-${i}-${j}`}>
            <span
              className={highlightClass}
              data-original-start={position}
              data-original-end={highlight.endIndex}
              data-highlight-index={highlightIndex}
              data-highlight-type={highlight.type}
              title={highlight.correctedText && highlight.correctedText !== highlight.text ? 
                `Correction: "${highlight.correctedText}"` : undefined}
              onMouseEnter={() => highlightIndex >= 0 && setHighlightedLabel(highlightIndex)}
              onMouseLeave={() => setHighlightedLabel(null)}
            >
              {originalText.substring(position, highlight.endIndex)}
            </span>
            
            {highlight.correctedText && highlight.correctedText !== highlight.text && (
              <span className="text-green-600 ml-1 text-xs font-medium inline-block correction-marker">
                → "{highlight.correctedText}"
              </span>
            )}
          </React.Fragment>
        );
        
        // Update lastIndex if this highlight extends furthest
        lastIndex = Math.max(lastIndex, highlight.endIndex);
      }
    }
    
    // Add remaining text
    if (lastIndex < originalText.length) {
      segments.push(
        <span
          key="text-end"
          data-original-start={lastIndex}
          data-original-end={originalText.length}
        >
          {originalText.substring(lastIndex)}
        </span>
      );
    }
    
    return segments;
  };

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1">
        <ScrollArea className="h-[calc(100%-1.5rem)]">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Summary</h2>
          {level && (
            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Level: {level}
            </div>
          )}
        </div>
          <div 
            className="summary-text text-base leading-relaxed p-3 border rounded-lg bg-white"
            onMouseUp={handleSelection}
          >
            {renderHighlightedText()}
          </div>
        </ScrollArea>

        {selectedText && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg p-4 border w-[600px] z-50">
            <div className="mb-2">
              <span className="font-semibold">Selected text:</span> {selectedText}
            </div>
            <div className="mb-3">
              <label htmlFor="corrected-text" className="block text-sm font-medium mb-1">
                Suggested correction:
              </label>
              <textarea
                id="corrected-text"
                className="w-full p-2 border rounded-md text-sm"
                rows={2}
                value={correctedText}
                onChange={(e) => setCorrectedText(e.target.value)}
                placeholder="Enter the corrected version of the text..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {labelTypes.map((labelType) => (
                <button
                  key={labelType}
                  onClick={() => addLabel(labelType)}
                  className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
                >
                  {labelType}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-64">
        <h3 className="text-sm font-semibold mb-2">Labels:</h3>
        <ScrollArea className="h-[calc(100%-1.5rem)]">
          <div className="pr-4 space-y-2">
            {labels.map((label, index) => (
              <div 
                key={index}
                className="flex flex-col p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                onMouseEnter={() => setHighlightedLabel(index)}
                onMouseLeave={() => setHighlightedLabel(null)}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="px-2 py-1 bg-blue-100 rounded text-sm overflow-hidden text-ellipsis">{label.type}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLabel?.(index);
                    }}
                    className="text-red-500 hover:text-red-700 p-1 ml-1 flex-shrink-0"
                    title="Delete label"
                  >
                    ×
                  </button>
                </div>
                <div className="text-sm break-words w-full">"{label.text}"</div>
                {label.correctedText && label.correctedText !== label.text && (
                  <div className="mt-1 text-sm break-words w-full text-green-600 bg-green-50 p-1 rounded">
                    <span className="font-medium">Correction:</span> "{label.correctedText}"
                  </div>
                )}
              </div>
            ))}
            {labels.length === 0 && (
              <div className="text-gray-500 text-sm italic">No labels added yet</div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

