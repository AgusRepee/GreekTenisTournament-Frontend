"use client"

interface BracketConnectorProps {
  matchCount: number
  className?: string
}

export function BracketConnector({ matchCount, className = "" }: BracketConnectorProps) {
  if (matchCount === 0) return null

  return (
    <div className={`flex flex-col justify-around ${className}`}>
      {Array.from({ length: matchCount }).map((_, index) => (
        <div key={index} className="flex items-center">
          {/* Horizontal line from match */}
          <div className="h-px w-8 bg-[#3a3a3a]" />
          
          {/* Vertical bracket */}
          <div className="relative h-[120px] w-px bg-[#3a3a3a]">
            {/* Top horizontal */}
            <div className="absolute left-0 top-0 h-px w-8 bg-[#3a3a3a]" />
            {/* Bottom horizontal */}
            <div className="absolute bottom-0 left-0 h-px w-8 bg-[#3a3a3a]" />
          </div>
          
          {/* Horizontal line to next match */}
          <div className="h-px w-8 bg-[#3a3a3a]" />
        </div>
      ))}
    </div>
  )
}

interface SingleConnectorProps {
  direction: "left" | "right"
}

export function SingleConnector({ direction }: SingleConnectorProps) {
  return (
    <div className="flex items-center">
      <div className="h-px w-12 bg-[#3a3a3a]" />
    </div>
  )
}
