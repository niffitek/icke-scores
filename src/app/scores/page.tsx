"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import CupsService from "@/services/cups";
import TeamsService from "@/services/teams";
import GamesService from "@/services/games";
import GroupsService from "@/services/groups";
import GroupTeamsService from "@/services/groupTeams";
import RankingService from "@/services/ranking";

type TeamStats = {
  id: string;
  name: string;
  group: string;
  roundsWonSitting: number;
  roundsWonStanding: number;
  totalPointsSitting: number;
  totalPointsStanding: number;
  totalPointsAgainstSitting: number;
  totalPointsAgainstStanding: number;
  finalScore: number;
};

type GroupStats = {
  name: string;
  teams: TeamStats[];
};

export default function ScoresPage() {
  const [groupStats, setGroupStats] = useState<GroupStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cupState, setCupState] = useState<string>("");

  const fetchScores = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      // Get active cup
      const activeCup = await CupsService.getActiveCup();
      setCupState(activeCup.state);
      // Determine which groups are relevant based on cup state
      const relevantGroups = activeCup.state === "Finalrunde" ? ['E', 'F', 'G', 'H'] : ['A', 'B', 'C', 'D'];
      const relevantRound = activeCup.state === "Finalrunde" ? "Finalrunde" : "Vorrunde";

      // Get all groups for this cup and filter for relevant ones
      const groups = await GroupsService.getGroupsByCupId(activeCup.id);
      const filteredGroups = groups.filter((group: any) => 
        relevantGroups.includes(group.name)
      );

      // Get all teams for this cup
      const activeTeams = await TeamsService.getTeamsByCupId(activeCup.id);

      // Get group-team assignments
      const groupTeams = await GroupTeamsService.getGroupTeams();

      // Get all games for this cup
      const activeGames = await GamesService.getGamesByCupId(activeCup.id);

      // Filter games for the current round and that have some scores
      const finishedGames = activeGames.filter(
        (game: any) =>
          (game.round1_points_team_1 !== null ||
            game.round1_points_team_2 !== null ||
            game.round2_points_team_1 !== null ||
            game.round2_points_team_2 !== null) &&
          (game.round === relevantRound)
      );

      // Use RankingService to calculate team stats
      let teamStats = RankingService.getAllTeamStats(activeTeams, groupTeams);

      // Fill team stats using RankingService
      teamStats = RankingService.fillAllTeamStats(teamStats, finishedGames, filteredGroups, groupTeams);

      // Create group stats structure and sort teams using RankingService
      const groupStatsMap: { [groupName: string]: GroupStats } = {};
      
      // Initialize groups
      relevantGroups.forEach(groupName => {
        groupStatsMap[groupName] = {
          name: groupName,
          teams: []
        };
      });

      // Populate groups with teams
      for (const group of filteredGroups) {
        const sortedTeams = RankingService.sortTeamStatsByGroup(teamStats, groupTeams, group.id);
        
        if (groupStatsMap[group.name]) {
          groupStatsMap[group.name].teams = sortedTeams;
        }
      }

      // Create final group stats array, filtering out empty groups
      const sortedGroupStats = relevantGroups.map(groupName => ({
        name: groupName,
        teams: groupStatsMap[groupName]?.teams || []
      })).filter(group => group.teams.length > 0);

      console.log("Sorted Group Stats:", sortedGroupStats);

      setGroupStats(sortedGroupStats);
      if (isInitial) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    } catch (error) {
      console.error("Error fetching scores:", error);
      if (isInitial) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchScores(true);
  }, []);

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchScores(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="h-full flex flex-col">
      <div className="flex items-center justify-center gap-2 mb-2 flex-shrink-0">
        <h1 className="text-xl font-semibold text-center">
          Team Ranglisten {cupState && `- ${cupState}`}
        </h1>
      </div>

      {groupStats.length === 0 && !loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p>Keine Teams oder Spiele gefunden.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 h-full max-w-7xl mx-auto">
            {groupStats.map((group) => (
              <div key={group.name} className="bg-gray-50 rounded-lg p-3 flex flex-col min-h-0">
                <h2 className="text-lg font-bold mb-1 text-gray-800 text-center flex-shrink-0">
                  Gruppe {group.name}
                </h2>
                <div className="flex-1 overflow-auto space-y-1 min-h-0">
                  {group.teams.map((team, index) => {
                    const sittingPointDiff = team.totalPointsSitting - team.totalPointsAgainstSitting;
                    const standingPointDiff = team.totalPointsStanding - team.totalPointsAgainstStanding;
                    
                    return (
                      <div
                        key={team.id}
                        className="bg-white rounded-lg shadow px-3 py-2 flex-shrink-0"
                      >
                        {/* Mobile Layout - Stack vertically on small screens */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          {/* Top row: Place and Team Name */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="text-xl sm:text-2xl font-bold text-gray-500 w-6 sm:w-8 text-center flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-base sm:text-lg truncate">{team.name}</h3>
                            </div>
                          </div>
                          
                          {/* Stats row - horizontal on mobile, stays in line on desktop */}
                          <div className="flex justify-between sm:justify-end gap-2 sm:gap-4">
                            {/* Sitting Stats */}
                            <div className="text-center min-w-0 flex-1 sm:flex-initial sm:min-w-20">
                              <div className="text-xs sm:text-sm font-semibold text-gray-700">Sitzen</div>
                              <div className="text-sm sm:text-lg font-bold">
                                {team.roundsWonSitting} Siege
                              </div>
                              <div className="text-xs sm:text-sm font-medium text-gray-600">
                                {sittingPointDiff > 0 ? '+' : ''}{sittingPointDiff}
                              </div>
                            </div>
                            
                            {/* Standing Stats */}
                            <div className="text-center min-w-0 flex-1 sm:flex-initial sm:min-w-20">
                              <div className="text-xs sm:text-sm font-semibold text-gray-700">Stehen</div>
                              <div className="text-sm sm:text-lg font-bold">
                                {team.roundsWonStanding} Siege
                              </div>
                              <div className="text-xs sm:text-sm font-medium text-gray-600">
                                {standingPointDiff > 0 ? '+' : ''}{standingPointDiff}
                              </div>
                            </div>
                            
                            
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}