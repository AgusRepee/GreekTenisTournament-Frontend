import { TournamentBracket } from "@/components/tournament/tournament-bracket"
import { australianOpen2025 } from "@/components/tournament/sample-data"

export default function Page() {
  return (
    <main className="min-h-screen bg-[#121212] p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            {australianOpen2025.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {"Men's Singles Draw"}
          </p>
        </div>

        {/* Bracket Container */}
        <div className="overflow-x-auto rounded-2xl bg-[#1a1a1a] p-6 md:p-8">
          <TournamentBracket tournament={australianOpen2025} />
        </div>
      </div>
    </main>
  )
}
