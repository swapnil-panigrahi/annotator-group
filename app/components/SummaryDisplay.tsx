import React, { useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";

interface SummaryDisplayProps {
  summary: string;
  onAddLabel?: (label: string, selectedText: string, startIndex: number, endIndex: number) => void;
  onDeleteLabel?: (index: number) => void;
  labels?: Array<{
    text: string;
    type: string;
    startIndex: number;
    endIndex: number;
  }>;
}

interface Label {
  text: string;
  type: string;
  startIndex: number;
  endIndex: number;
}

export default function SummaryDisplay({ summary, onAddLabel, onDeleteLabel, labels = [] }: SummaryDisplayProps) {
  const [selectedText, setSelectedText] = useState("");
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
      // Find the summary-text container by traversing up the DOM
      let container: Node | null = range.startContainer;
      let summaryTextElement: HTMLElement | null = null;

      while (container) {
        if (container instanceof HTMLElement && container.classList.contains('summary-text')) {
          summaryTextElement = container;
          break;
        }
        container = container.parentElement;
      }

      if (summaryTextElement) {
        // Calculate the absolute offset by counting characters before the selection
        const getAbsoluteOffset = (node: Node, offset: number): number => {
          let absoluteOffset = 0;
          const treeWalker = document.createTreeWalker(
            summaryTextElement!,
            NodeFilter.SHOW_TEXT,
            null
          );

          let currentNode = treeWalker.nextNode();
          while (currentNode && currentNode !== node) {
            absoluteOffset += currentNode.textContent?.length || 0;
            currentNode = treeWalker.nextNode();
          }

          return absoluteOffset + offset;
        };

        const startOffset = getAbsoluteOffset(range.startContainer, range.startOffset);
        const endOffset = getAbsoluteOffset(range.endContainer, range.endOffset);

        setSelectedText(text);
      setSelectionIndices({ start: startOffset, end: endOffset });
      }
    }
  };

  const addLabel = (labelType: string) => {
    if (selectedText && selectionIndices) {
      onAddLabel?.(labelType, selectedText, selectionIndices.start, selectionIndices.end);
      setSelectedText("");
      setSelectionIndices(null);
    }
  };

  // Function to render text with highlighted sections
  const renderHighlightedText = () => {
    let lastIndex = 0;
    const textParts = [];

    // Sort labels by start index to ensure proper rendering order
    const sortedLabels = [...labels].sort((a, b) => a.startIndex - b.startIndex);

    sortedLabels.forEach((label, index) => {
      // Add text before the highlight
      if (label.startIndex > lastIndex) {
        textParts.push(
          <span key={`text-${index}`}>
            {summary.slice(lastIndex, label.startIndex)}
          </span>
        );
      }

      // Add highlighted text
      textParts.push(
        <span
          key={`highlight-${index}`}
          className={`${highlightedLabel === index ? 'bg-yellow-200' : ''} transition-colors duration-200`}
        >
          {summary.slice(label.startIndex, label.endIndex)}
        </span>
      );

      lastIndex = label.endIndex;
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
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        <ScrollArea className="h-[calc(100%-2rem)]">
          <div 
            className="summary-text text-lg leading-relaxed p-4 border rounded-lg bg-white"
            onMouseUp={handleSelection}
          >
            {labels.length > 0 ? renderHighlightedText() : summary}
          </div>
        </ScrollArea>

        {selectedText && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg p-4 border w-[600px] z-50">
            <div className="mb-2">
              <span className="font-semibold">Selected text:</span> {selectedText}
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
        <h3 className="font-semibold mb-2">Labels:</h3>
        <ScrollArea className="h-[calc(100%-2rem)]">
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

