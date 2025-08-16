"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import CupsService from "@/services/cups";
import TournamentsService from "@/services/tournaments";
import TeamsService from "@/services/teams";
import GamesService from "@/services/games";

type TeamStats = {
  id: string;
  name: string;
  roundsWon: number;
  roundsLost: number;
  totalPoints: number;
  totalPointsAgainst: number;
  games: Array<{
    opponent: string;
    roundsWon: number;
    roundsLost: number;
    points: number;
    pointsAgainst: number;
  }>;
};

export default function ScoresPage() {
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = async () => {
    try {
      setLoading(true);
      // Filter cups that are in Vorrunde or Finalrunde state
      const activeCup = await CupsService.getActiveCup();

      // Filter tournaments that belong to active cups
      const activeTournaments = await TournamentsService.getTournamentsByCupId(activeCup.id);
      const activeTournamentIds = activeTournaments.map((tournament: any) => tournament.id);

      // Filter teams and games for active tournaments
      const activeTeams = await TeamsService.getTeamsByCupId(activeCup.id);

      let activeGames: any[] = [];
      for (const tournamentId of activeTournamentIds) {
        const games = await GamesService.getGamesByTournamentId(tournamentId);
        activeGames = activeGames.concat(games);
      }

      const finishedGames = activeGames.filter(
        (game: any) =>
          (game.round1_points_team_1 !== null ||
            game.round1_points_team_2 !== null ||
            game.round2_points_team_1 !== null ||
            game.round2_points_team_2 !== null) &&
          (game.round === activeCup.state)
      );

      // Initialize team stats
      const stats: { [teamId: string]: TeamStats } = {};
      activeTeams.forEach((team: any) => {
        stats[team.id] = {
          id: team.id,
          name: team.name,
          roundsWon: 0,
          roundsLost: 0,
          totalPoints: 0,
          totalPointsAgainst: 0,
          games: [],
        };
      });

      // Process each game
      finishedGames.forEach((game: any) => {
        const team1Id = game.team_1_id;
        const team2Id = game.team_2_id;

        // Skip if teams don't exist in our active teams
        if (!stats[team1Id] || !stats[team2Id]) return;

        const round1Team1 = parseInt(game.round1_points_team_1, 10) || 0;
        const round1Team2 = parseInt(game.round1_points_team_2, 10) || 0;
        const round2Team1 = parseInt(game.round2_points_team_1, 10) || 0;
        const round2Team2 = parseInt(game.round2_points_team_2, 10) || 0;

        // Count rounds won/lost
        let team1RoundsWon = 0;
        let team2RoundsWon = 0;

        if (round1Team1 > round1Team2) team1RoundsWon++;
        else if (round1Team2 > round1Team1) team2RoundsWon++;

        if (round2Team1 > round2Team2) team1RoundsWon++;
        else if (round2Team2 > round2Team1) team2RoundsWon++;

        const team1RoundsLost = team2RoundsWon;
        const team2RoundsLost = team1RoundsWon;

        const team1TotalPoints = round1Team1 + round2Team1;
        const team2TotalPoints = round1Team2 + round2Team2;

        // Update team 1 stats
        stats[team1Id].roundsWon += team1RoundsWon;
        stats[team1Id].roundsLost += team1RoundsLost;
        stats[team1Id].totalPoints += team1TotalPoints;
        stats[team1Id].totalPointsAgainst += team2TotalPoints;
        stats[team1Id].games.push({
          opponent: team2Id,
          roundsWon: team1RoundsWon,
          roundsLost: team1RoundsLost,
          points: team1TotalPoints,
          pointsAgainst: team2TotalPoints,
        });

        // Update team 2 stats
        stats[team2Id].roundsWon += team2RoundsWon;
        stats[team2Id].roundsLost += team2RoundsLost;
        stats[team2Id].totalPoints += team2TotalPoints;
        stats[team2Id].totalPointsAgainst += team1TotalPoints;
        stats[team2Id].games.push({
          opponent: team1Id,
          roundsWon: team2RoundsWon,
          roundsLost: team2RoundsLost,
          points: team2TotalPoints,
          pointsAgainst: team1TotalPoints,
        });
      });

      // Convert to array and sort by ranking criteria
      const sortedStats = Object.values(stats).sort((a, b) => {
        // 1. Number of rounds won (descending)
        if (a.roundsWon !== b.roundsWon) {
          return b.roundsWon - a.roundsWon;
        }

        // 2. Total points made (descending)
        if (a.totalPoints !== b.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }

        // 3. Direct comparison (if teams played against each other)
        const aVsB = a.games.find((game) => game.opponent === b.id);
        const bVsA = b.games.find((game) => game.opponent === a.id);

        if (aVsB && bVsA) {
          // They played against each other, compare their head-to-head
          if (aVsB.roundsWon !== aVsB.roundsLost) {
            return aVsB.roundsWon > aVsB.roundsLost ? -1 : 1;
          }
          // If rounds are tied, compare points in their direct match
          if (aVsB.points !== aVsB.pointsAgainst) {
            return aVsB.points > aVsB.pointsAgainst ? -1 : 1;
          }
        }

        // 4. Random (maintain current order)
        return 0;
      });

      setTeamStats(sortedStats);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching scores:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, []);

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchScores();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section>
      <h1 className="text-xl font-semibold mb-4">Team Rankings</h1>

      {loading ? (
        <p>Lade Rangliste...</p>
      ) : teamStats.length === 0 ? (
        <p>Keine Teams oder Spiele gefunden.</p>
      ) : (
        <div className="space-y-2">
          {teamStats.map((team, index) => (
            <div
              key={team.id}
              className="bg-white rounded-lg shadow p-4 flex justify-between items-center"
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-gray-500 w-8">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-medium text-lg">{team.name}</h3>
                  <p className="text-sm text-gray-600">
                    Runden: {team.roundsWon} - {team.roundsLost}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{team.totalPoints} Punkte</p>
                <p className="text-sm text-gray-500">
                  {team.totalPoints - team.totalPointsAgainst > 0 ? "+" : ""}
                  {team.totalPoints - team.totalPointsAgainst} Differenz
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}