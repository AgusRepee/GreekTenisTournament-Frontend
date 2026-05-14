"use client"

import { MatchCard } from "./match-card"
import type { TournamentData } from "./types"
import { cn } from "@/lib/utils"

interface TournamentBracketProps {
  tournament: TournamentData
  className?: string
}

export function TournamentBracket({ tournament, className }: TournamentBracketProps) {
  const rounds = tournament.rounds
  
  return (
    <div className={cn("min-w-max", className)}>
      {/* Round Headers */}
      <div className="mb-6 flex">
        {rounds.map((round, roundIndex) => (
          <div
            key={round.name}
            className={cn(
              "flex-shrink-0",
              roundIndex === 0 ? "w-[280px]" : "w-[280px]",
              roundIndex > 0 && "ml-16"
            )}
          >
            <h3 className="text-sm font-medium text-muted-foreground">
              {round.name}
            </h3>
          </div>
        ))}
      </div>

      {/* Bracket */}
      <div className="flex items-start">
        {rounds.map((round, roundIndex) => {
          // Calculate vertical spacing based on round
          const matchSpacing = Math.pow(2, roundIndex) * 140 - 140
          
          return (
            <div key={round.name} className="flex items-center">
              {/* Matches Column */}
              <div
                className="flex flex-col"
                style={{
                  gap: `${matchSpacing}px`,
                }}
              >
                {round.matches.map((match, matchIndex) => (
                  <div
                    key={match.id}
                    className="flex items-center"
                    style={{
                      marginTop: matchIndex === 0 && roundIndex > 0 
                        ? `${(Math.pow(2, roundIndex) - 1) * 70}px` 
                        : undefined,
                    }}
                  >
                    <MatchCard match={match} />
                  </div>
                ))}
              </div>

              {/* Connectors */}
              {roundIndex < rounds.length - 1 && (
                <div className="flex flex-col">
                  {round.matches.map((_, matchIndex) => {
                    // Only show connector for every pair of matches
                    if (matchIndex % 2 === 1) return null
                    
                    const spacing = Math.pow(2, roundIndex) * 140
                    const hasNextMatch = matchIndex + 1 < round.matches.length
                    
                    if (!hasNextMatch) {
                      // Single match going to next round
                      return (
                        <div
                          key={matchIndex}
                          className="flex items-center"
                          style={{
                            marginTop: roundIndex > 0 
                              ? `${(Math.pow(2, roundIndex) - 1) * 70}px` 
                              : undefined,
                          }}
                        >
                          <div className="h-px w-16 bg-[#3a3a3a]" />
                        </div>
                      )
                    }
                    
                    return (
                      <div
                        key={matchIndex}
                        className="flex items-center"
                        style={{
                          marginTop: matchIndex === 0 && roundIndex > 0 
                            ? `${(Math.pow(2, roundIndex) - 1) * 70}px` 
                            : matchIndex > 0 ? `${spacing - 140}px` : undefined,
                        }}
                      >
                        {/* Left horizontal line */}
                        <div className="h-px w-6 bg-[#3a3a3a]" />
                        
                        {/* Bracket shape */}
                        <svg
                          width="24"
                          height={spacing}
                          className="shrink-0"
                        >
                          {/* Top horizontal */}
                          <line
                            x1="0"
                            y1="70"
                            x2="12"
                            y2="70"
                            stroke="#3a3a3a"
                            strokeWidth="1"
                          />
                          {/* Vertical line */}
                          <line
                            x1="12"
                            y1="70"
                            x2="12"
                            y2={spacing - 70}
                            stroke="#3a3a3a"
                            strokeWidth="1"
                          />
                          {/* Bottom horizontal */}
                          <line
                            x1="0"
                            y1={spacing - 70}
                            x2="12"
                            y2={spacing - 70}
                            stroke="#3a3a3a"
                            strokeWidth="1"
                          />
                          {/* Right horizontal (middle) */}
                          <line
                            x1="12"
                            y1={spacing / 2}
                            x2="24"
                            y2={spacing / 2}
                            stroke="#3a3a3a"
                            strokeWidth="1"
                          />
                        </svg>
                        
                        {/* Right horizontal line */}
                        <div className="h-px w-6 bg-[#3a3a3a]" />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
