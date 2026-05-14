import type { TournamentData } from "./types"

export const australianOpen2025: TournamentData = {
  name: "Australian Open 2025",
  rounds: [
    {
      name: "Quarterfinals",
      matches: [
        {
          id: "qf1",
          player1: {
            id: "alcaraz",
            name: "Carlos Alcaraz",
            ranking: 1,
            countryCode: "ES",
            photoUrl: "https://www.atptour.com/-/media/alias/player-headshot/A0E2",
          },
          player2: {
            id: "norrie",
            name: "Cameron Norrie",
            ranking: 27,
            countryCode: "GB",
            photoUrl: "https://www.atptour.com/-/media/alias/player-headshot/N771",
          },
          sets: [
            { player1: 6, player2: 3 },
            { player1: 6, player2: 4 },
          ],
          winner: 1,
        },
        {
          id: "qf2",
          player1: {
            id: "draper",
            name: "Jack Draper",
            ranking: 14,
            countryCode: "GB",
            photoUrl: "https://www.atptour.com/-/media/alias/player-headshot/D0BQ",
          },
          player2: {
            id: "medvedev",
            name: "Daniil Medvedev",
            ranking: 11,
            countryCode: "RU",
            photoUrl: "https://www.atptour.com/-/media/alias/player-headshot/MM58",
          },
          sets: [
            { player1: 1, player2: 6 },
            { player1: 5, player2: 7 },
          ],
          winner: 2,
        },
        {
          id: "qf3",
          player1: {
            id: "fils",
            name: "Arthur Fils",
            ranking: 30,
            countryCode: "FR",
            photoUrl: "https://www.atptour.com/-/media/alias/player-headshot/F0BI",
          },
          player2: {
            id: "zverev",
            name: "Alexander Zverev",
            ranking: 4,
            countryCode: "DE",
            photoUrl: "https://www.atptour.com/-/media/alias/player-headshot/Z355",
          },
          sets: [
            { player1: 2, player2: 6 },
            { player1: 3, player2: 6 },
          ],
          winner: 2,
        },
        {
          id: "qf4",
          player1: {
            id: "tien",
            name: "Learner Tien",
            ranking: 25,
            countryCode: "US",
            photoUrl: "https://www.atptour.com/-/media/alias/player-headshot/T0AK",
          },
          player2: {
            id: "sinner",
            name: "Jannik Sinner",
            ranking: 2,
            countryCode: "IT",
            photoUrl: "https://www.atptour.com/-/media/alias/player-headshot/S0AG",
          },
          sets: [
            { player1: 1, player2: 6 },
            { player1: 2, player2: 6 },
          ],
          winner: 2,
        },
      ],
    },
    {
      name: "Semifinals",
      matches: [
        {
          id: "sf1",
          player1: {
            id: "alcaraz",
            name: "Carlos Alcaraz",
            ranking: 1,
            countryCode: "ES",
            photoUrl: "https://www.atptour.com/-/media/alias/player-headshot/A0E2",
          },
          player2: {
            id: "medvedev",
            name: "Daniil Medvedev",
            ranking: 11,
            countryCode: "RU",
            photoUrl: "https://www.atptour.com/-/media/alias/player-headshot/MM58",
          },
          sets: [
            { player1: 3, player2: 6 },
            { player1: 6, player2: 7, tiebreak: 3 },
          ],
          winner: 2,
        },
        {
          id: "sf2",
          player1: {
            id: "zverev",
            name: "Alexander Zverev",
            ranking: 4,
            countryCode: "DE",
            photoUrl: "https://www.atptour.com/-/media/alias/player-headshot/Z355",
          },
          player2: {
            id: "sinner",
            name: "Jannik Sinner",
            ranking: 2,
            countryCode: "IT",
            photoUrl: "https://www.atptour.com/-/media/alias/player-headshot/S0AG",
          },
          sets: [
            { player1: 2, player2: 6 },
            { player1: 4, player2: 6 },
          ],
          winner: 2,
        },
      ],
    },
    {
      name: "Final",
      matches: [
        {
          id: "f1",
          player1: {
            id: "medvedev",
            name: "Daniil Medvedev",
            ranking: 11,
            countryCode: "RU",
            photoUrl: "https://www.atptour.com/-/media/alias/player-headshot/MM58",
          },
          player2: {
            id: "sinner",
            name: "Jannik Sinner",
            ranking: 2,
            countryCode: "IT",
            photoUrl: "https://www.atptour.com/-/media/alias/player-headshot/S0AG",
          },
          sets: [
            { player1: 6, player2: 7, tiebreak: 8 },
            { player1: 6, player2: 7, tiebreak: 4 },
          ],
          winner: 2,
        },
      ],
    },
  ],
}
