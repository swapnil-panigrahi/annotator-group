interface SummaryDisplayProps {
  summary: string
}

export default function SummaryDisplay({ summary }: SummaryDisplayProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Summary</h2>
      <p className="text-lg leading-relaxed">{summary}</p>
    </div>
  )
}

