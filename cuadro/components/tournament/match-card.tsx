"use client"

import { Check } from "lucide-react"
import { CountryFlag } from "./country-flag"
import type { Match, Player, SetScore } from "./types"
import { cn } from "@/lib/utils"

interface PlayerRowProps {
  player: Player
  sets: SetScore[]
  isWinner: boolean
  isPlayer1: boolean
}

function PlayerRow({ player, sets, isWinner, isPlayer1 }: PlayerRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 transition-colors",
        isWinner ? "bg-[#1a2a1a]" : "bg-[#1e1e1e]",
        isPlayer1 ? "rounded-t-xl" : "rounded-b-xl"
      )}
    >
      {/* Player Photo */}
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#2a2a2a]">
        {player.photoUrl ? (
          <img
            src={player.photoUrl}
            alt={player.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            {player.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Flag and Name */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <CountryFlag countryCode={player.countryCode} />
        <span
          className={cn(
            "truncate text-sm font-medium",
            isWinner ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {player.name.split(" ")[0].charAt(0)}. {player.name.split(" ").slice(1).join(" ")}
        </span>
        <span className="text-xs text-muted-foreground">({player.ranking})</span>
      </div>

      {/* Winner Check */}
      {isWinner && (
        <Check className="h-4 w-4 shrink-0 text-emerald-500" />
      )}

      {/* Sets */}
      <div className="flex shrink-0 items-center gap-1.5">
        {sets.map((set, index) => {
          const score = isPlayer1 ? set.player1 : set.player2
          const opponentScore = isPlayer1 ? set.player2 : set.player1
          const wonSet = score > opponentScore
          
          return (
            <div
              key={index}
              className={cn(
                "min-w-[18px] text-center text-sm font-semibold",
                wonSet ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {score}
              {set.tiebreak !== undefined && (
                <sup className="text-[10px] text-muted-foreground">
                  {set.tiebreak}
                </sup>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface MatchCardProps {
  match: Match
  className?: string
}

export function MatchCard({ match, className }: MatchCardProps) {
  return (
    <div
      className={cn(
        "w-[280px] overflow-hidden rounded-xl border border-[#2a2a2a] shadow-lg",
        className
      )}
    >
      <PlayerRow
        player={match.player1}
        sets={match.sets}
        isWinner={match.winner === 1}
        isPlayer1={true}
      />
      <div className="h-px bg-[#2a2a2a]" />
      <PlayerRow
        player={match.player2}
        sets={match.sets}
        isWinner={match.winner === 2}
        isPlayer1={false}
      />
    </div>
  )
}
