"use client";

import { useEffect, useState } from "react";
import CupsService from "@/services/cups";

import TeamsService from "@/services/teams";
import GamesService from "@/services/games";

type Game = {
  id: number;
  court: number;
  team_1_id: number;
  team_2_id: number;
  start_at: string;
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

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "finished">(
    "all"
  );

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

      // Add team names and status to games
      const processedGames = allGames.map((game: Game) => {
        const now = new Date();
        const gameStart = new Date(game.start_at);
        const threeMinutesAfter = new Date(
          gameStart.getTime() + 3 * 60 * 1000
        );

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
          status,
        };
      }).sort((a: Game, b: Game) => {
        // First sort by time
        const timeComparison = new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
        // If same time, sort by court number
        if (timeComparison === 0) {
          return a.court - b.court;
        }
        return timeComparison;
      });

      setGames(processedGames);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching games:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGames();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const filteredGames = games.filter((game) => {
    if (filter === "all") return true;
    return game.status === filter;
  });

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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Alle Spiele</h1>

        {/* Filter buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded text-sm ${
              filter === "all"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter("upcoming")}
            className={`px-3 py-1 rounded text-sm ${
              filter === "upcoming"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Anstehend
          </button>
          <button
            onClick={() => setFilter("finished")}
            className={`px-3 py-1 rounded text-sm ${
              filter === "finished"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Beendet
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <p>Lade Spiele...</p>
        ) : filteredGames.length === 0 ? (
          <p>Keine Spiele gefunden.</p>
        ) : (
          filteredGames.map((game) => (
            <div
              key={game.id}
              className="bg-white rounded-lg shadow p-4 relative"
            >
              {/* Top row: Time/Round on left, Status/Court on right */}
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <p className="text-sm text-gray-600" suppressHydrationWarning>
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
          ))
        )}
      </div>
    </section>
  );
}