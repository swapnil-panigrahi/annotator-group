interface TextDisplayProps {
  text: string
}

export default function TextDisplay({ text }: TextDisplayProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Abstract</h2>
      <div className="text-base leading-relaxed p-3 border rounded-lg bg-white min-h-[200px]">
        {text}
      </div>
    </div>
  )
}

