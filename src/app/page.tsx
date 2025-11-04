"use client"

import { useEffect, useState } from "react";
import CupsService from "@/services/cups";
import TeamsService from "@/services/teams";
import GamesService from "@/services/games";

type Game = {
  id: number;
  court: number;
  team_1_id: number;
  team_2_id: number;
  start_at: string; // ISO string
  round: string;
  icke_cup_id: string;
  team1Name?: string;
  team2Name?: string;
  status?: "upcoming" | "live" | "finished";
  round1_points_team_1?: number;
  round1_points_team_2?: number;
  round2_points_team_1?: number;
  round2_points_team_2?: number;
  round1_winner?: string;
  round2_winner?: string;
};

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState<string>();

  const fetchGames = async () => {
    try {
      setLoading(true);
      
      // Get active cup
      const activeCup = await CupsService.getActiveCup();
      if (!activeCup) {
        setGames([]);
        setLoading(false);
        return;
      }

      // Get all teams for the active cup
      const teamsData = await TeamsService.getTeamsByCupId(activeCup.id);

      // Get all games for the active cup
      const allGames = await GamesService.getGamesByCupId(activeCup.id);

      // Create team name mapping
      const teamMap = Object.fromEntries(
        teamsData.map((team: any) => [team.id, team.name])
      );

      const now = new Date();
      const threeMinutesInMs = 3 * 60 * 1000;
      
      // First try "Vorrunde"
      let currentStateGames = allGames.filter((game: Game) => game.round === "Vorrunde");
      let activeRound = "Vorrunde";
      
      // Filter upcoming games for Vorrunde
      const upcomingVorrunde = currentStateGames.filter((game: Game) => {
        const gameStartTime = new Date(game.start_at);
        const timeDiff = gameStartTime.getTime() - now.getTime();
        return timeDiff > -threeMinutesInMs;
      });
      
      // If no upcoming Vorrunde games, switch to Finalrunde
      if (upcomingVorrunde.length === 0) {
        currentStateGames = allGames.filter((game: Game) => game.round === "Finalrunde");
        activeRound = "Finalrunde";
      }
      
      setCurrentRound(activeRound);
      
      // Filter games that haven't started yet or are within 3 minutes of start time
      const upcomingGames = currentStateGames.filter((game: Game) => {
        const gameStartTime = new Date(game.start_at);
        const timeDiff = gameStartTime.getTime() - now.getTime();
        return timeDiff > -threeMinutesInMs;
      });
      
      // Sort by start time (earliest first), then by court number
      upcomingGames.sort((a: Game, b: Game) => {
        const timeComparison = new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
        if (timeComparison === 0) {
          return a.court - b.court;
        }
        return timeComparison;
      });
      
      // Add team names, status, and take next 6 games
      const gamesWithNames = upcomingGames.slice(0, 6).map((game: Game) => {
        const now = new Date();
        const gameStart = new Date(game.start_at);
        const threeMinutesAfter = new Date(gameStart.getTime() + 3 * 60 * 1000);

        let status: "upcoming" | "live" | "finished";
        if (now < gameStart) {
          status = "upcoming";
        } else if (now <= threeMinutesAfter) {
          status = "live";
        } else {
          status = "finished";
        }

        return {
          ...game,
          team1Name: teamMap[game.team_1_id] || `Team ${game.team_1_id}`,
          team2Name: teamMap[game.team_2_id] || `Team ${game.team_2_id}`,
          status
        };
      });
      
      setGames(gamesWithNames);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching games:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  // Refresh the data every minute to update the game list
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGames();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "text-blue-600";
      case "live":
        return "text-green-600";
      case "finished":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "upcoming":
        return "Anstehend";
      case "live":
        return "Live";
      case "finished":
        return "Beendet";
      default:
        return "Unbekannt";
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-xl font-semibold">
          {currentRound ? `Nächste Runde - ${currentRound}` : "Bald geht's los!"}
        </h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {games.length === 0 && !loading
          ? <p>Rutscht euch schon mal warm!</p>
          : games.map((game) => (
              <div
                key={game.id}
                className="bg-white rounded-lg shadow p-4 relative"
              >
                {/* Top row: Time/Round on left, Status/Court on right */}
                <div className="flex justify-between items-start mb-3">
                  <div className="text-left">
                    <p className="text-sm text-gray-600">
                      {new Date(game.start_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-sm">
                      {game.round}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${getStatusColor(
                        game.status!
                      )}`}
                    >
                      {getStatusText(game.status!)}
                    </p>
                    <p className="text-sm">Feld {game.court} ({game.court < 4 ? "Sitzen" : "Stehen"})</p>
                  </div>
                </div>

                {/* Center: Team names */}
                <div className="text-center mb-3">
                  <p className="font-medium text-2xl">
                    {game.team1Name} vs {game.team2Name}
                  </p>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}
