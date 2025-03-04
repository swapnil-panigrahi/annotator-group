interface TextDisplayProps {
  text: string
}

export default function TextDisplay({ text }: TextDisplayProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Original Text</h2>
      <div className="text-lg leading-relaxed p-4 border rounded-lg bg-white min-h-[200px]">
        {text}
      </div>
    </div>
  )
}

