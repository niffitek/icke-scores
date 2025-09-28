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
  const [currentRound, setCurrentRound] = useState<string>("Vorrunde");

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

  const hasScores = (game: Game) => {
    return (game.round1_points_team_1 !== null && game.round1_points_team_1 !== undefined) ||
           (game.round1_points_team_2 !== null && game.round1_points_team_2 !== undefined) ||
           (game.round2_points_team_1 !== null && game.round2_points_team_1 !== undefined) ||
           (game.round2_points_team_2 !== null && game.round2_points_team_2 !== undefined);
  };

  return (
    <section>
      <h1 className="text-xl font-semibold mb-4">
        Nächste Runde - {currentRound}
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading
          ? <p>Lade Spiele...</p>
          : games.length === 0
          ? <p>Keine anstehenden Spiele gefunden.</p>
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
                    <p className="text-xs text-gray-500">
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
                    <p className="text-xs text-gray-500">Feld {game.court}</p>
                  </div>
                </div>

                {/* Center: Team names */}
                <div className="text-center mb-3">
                  <p className="font-medium text-lg">
                    {game.team1Name} vs {game.team2Name}
                  </p>
                </div>

                {/* Center: Scores below team names */}
                {hasScores(game) && (
                  <div className="text-center space-y-1">
                    {(game.round1_points_team_1 !== null && game.round1_points_team_1 !== undefined) && (
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Runde 1:</span> {game.round1_points_team_1} - {game.round1_points_team_2}
                      </div>
                    )}
                    {(game.round2_points_team_1 !== null && game.round2_points_team_1 !== undefined) && (
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Runde 2:</span> {game.round2_points_team_1} - {game.round2_points_team_2}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
      </div>
    </section>
  );
}
