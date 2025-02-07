import { Button } from "@/components/ui/button"

interface NavigationBarProps {
  currentIndex: number
  totalItems: number
  onNavigate: (index: number) => void
}

export default function NavigationBar({ currentIndex, totalItems, onNavigate }: NavigationBarProps) {
  return (
    <div className="flex justify-center space-x-2 overflow-x-auto py-2">
      {Array.from({ length: totalItems }, (_, i) => (
        <Button
          key={i}
          variant={i === currentIndex ? "default" : "outline"}
          onClick={() => onNavigate(i)}
          className="min-w-[2.5rem]"
        >
          {i + 1}
        </Button>
      ))}
    </div>
  )
}

