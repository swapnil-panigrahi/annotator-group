import React, { useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";

interface SummaryDisplayProps {
  summary: string;
  pmid?: string;
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

export default function SummaryDisplay({ summary, pmid, onAddLabel, onDeleteLabel, labels = [] }: SummaryDisplayProps) {
  const [selectedText, setSelectedText] = useState("");
  const [correctedText, setCorrectedText] = useState("");
  const [selectionIndices, setSelectionIndices] = useState<{ start: number; end: number } | null>(null);
  const [highlightedLabel, setHighlightedLabel] = useState<number | null>(null);

  const labelTypes = [
    "Incorrect definitions",
    "Incorrect synonyms", 
    "Entity errors",
    "Contradiction",
    "Omission",
    "Jumping to conclusions",
    "Misinterpretation"
  ];

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectedText("");
      setSelectionIndices(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const text = range.toString().trim();
    
    if (text) {
      try {
        // Get the summary text element
        const summaryTextElement = document.querySelector('.summary-text');
        if (!summaryTextElement) return;
        
        // Create a temporary range to find text position in the summary
        const tempRange = document.createRange();
        tempRange.setStart(summaryTextElement, 0);
        tempRange.setEnd(range.startContainer, range.startOffset);
        
        // Calculate the start offset by counting characters in the temporary range
        let startOffset = 0;
        const walker = document.createTreeWalker(
          tempRange.commonAncestorContainer,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let node;
        while ((node = walker.nextNode())) {
          if (node === range.startContainer) {
            startOffset += range.startOffset;
            break;
          }
          startOffset += node.textContent?.length || 0;
        }
        
        const endOffset = startOffset + text.length;
        
        console.log('Selection found:', {
          text,
          startOffset,
          endOffset,
          textAtOffset: summary.substring(startOffset, endOffset)
        });
        
        setSelectedText(text);
        setCorrectedText(text); // Initialize corrected text with the selected text
        setSelectionIndices({ start: startOffset, end: endOffset });
      } catch (error) {
        console.error('Error during text selection:', error);
      }
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

  // Function to render text with highlighted sections
  const renderHighlightedText = () => {
    let lastIndex = 0;
    const textParts = [];

    // Add current selection highlight if available
    let allHighlights = [...labels];
    
    // Add the current selection as a temporary highlight if it exists
    if (selectionIndices && selectedText) {
      allHighlights = [
        ...allHighlights,
        {
          text: selectedText,
          type: 'current-selection',
          startIndex: selectionIndices.start,
          endIndex: selectionIndices.end,
          correctedText: correctedText
        }
      ];
    }

    // Sort all highlights by start index to ensure proper rendering order
    const sortedHighlights = [...allHighlights].sort((a, b) => a.startIndex - b.startIndex);
    
    sortedHighlights.forEach((highlight, index) => {
      // Add text before the highlight
      if (highlight.startIndex > lastIndex) {
        textParts.push(
          <span key={`text-${index}`}>
            {summary.slice(lastIndex, highlight.startIndex)}
          </span>
        );
      }

      // Determine the highlight style based on the type
      let highlightClass = '';
      
      if (highlight.type === 'current-selection') {
        // Style for currently selected text
        highlightClass = 'bg-blue-200 border-b-2 border-blue-400';
      } else {
        // Style for labeled text
        highlightClass = `${highlightedLabel === index ? 'bg-yellow-200' : 'bg-yellow-100'} transition-colors duration-200`;
        
        // Add different style if there's a correction
        if (highlight.correctedText && highlight.correctedText !== highlight.text) {
          highlightClass = `${highlightedLabel === index ? 'bg-green-200' : 'bg-green-100'} border-b-2 border-green-400 transition-colors duration-200`;
        }
      }

      // Add highlighted text
      textParts.push(
        <span
          key={`highlight-${index}`}
          className={highlightClass}
          title={highlight.correctedText && highlight.correctedText !== highlight.text ? 
            `Correction: "${highlight.correctedText}"` : undefined}
        >
          {summary.slice(highlight.startIndex, highlight.endIndex)}
          {highlight.correctedText && highlight.correctedText !== highlight.text && (
            <span className="text-green-600 ml-1 text-xs font-medium inline-block">
              → "{highlight.correctedText}"
            </span>
          )}
        </span>
      );

      lastIndex = highlight.endIndex;
    });

    // Add remaining text
    if (lastIndex < summary.length) {
      textParts.push(
        <span key="text-end">
          {summary.slice(lastIndex)}
        </span>
      );
    }

    return textParts;
  };

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1">
        <ScrollArea className="h-[calc(100%-1.5rem)]">
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

