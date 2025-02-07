interface TextDisplayProps {
  text: string
}

export default function TextDisplay({ text }: TextDisplayProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Original Text</h2>
      <p className="text-lg leading-relaxed">{text}</p>
    </div>
  )
}

