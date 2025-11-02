class RankingService {
    getAllTeamStats(teams: any[], groupTeams: any[]) {
        const teamStats: Record<string, any> = {};
        teams.forEach((team: any) => {
                teamStats[team.id] = {
                    id: team.id,
                    name: team.name,
                    group: groupTeams.find((gt: any) => gt.team_id === team.id)?.group_id,
                    roundsWonSitting: 0,
                    roundsWonStanding: 0,
                    totalPointsSitting: 0,
                    totalPointsStanding: 0,
                    totalPointsAgainstSitting: 0,
                    totalPointsAgainstStanding: 0,
                    finalScore: 0,
                };
            });
        return teamStats;
    }

    fillAllTeamStats(teamStats: Record<string, any>, games: any[], groups: any[], groupTeams: any[]) {
        console.log("groups", groups);
        games.forEach((game: any) => {
                const team1Stats = teamStats[game.team_1_id];
                const team2Stats = teamStats[game.team_2_id];
                
                if (team1Stats && team2Stats) {
                    // Calculate rounds won and total points
                    const round1Team1Won = game.round1_winner === game.team_1_id;
                    const round2Team1Won = game.round2_winner === game.team_1_id;
                    const round1Team2Won = game.round1_winner === game.team_2_id;
                    const round2Team2Won = game.round2_winner === game.team_2_id;

                    if (game.sitting === '1') {
                        if (round1Team1Won) team1Stats.roundsWonSitting++;
                        if (round2Team1Won) team1Stats.roundsWonSitting++;
                        if (round1Team2Won) team2Stats.roundsWonSitting++;
                        if (round2Team2Won) team2Stats.roundsWonSitting++;

                        team1Stats.totalPointsSitting += (parseInt(game.round1_points_team_1, 10) || 0) + (parseInt(game.round2_points_team_1, 10) || 0);
                        team2Stats.totalPointsSitting += (parseInt(game.round1_points_team_2, 10) || 0) + (parseInt(game.round2_points_team_2, 10) || 0);
                        
                        team1Stats.totalPointsAgainstSitting += (parseInt(game.round1_points_team_2, 10) || 0) + (parseInt(game.round2_points_team_2, 10) || 0);
                        team2Stats.totalPointsAgainstSitting += (parseInt(game.round1_points_team_1, 10) || 0) + (parseInt(game.round2_points_team_1, 10) || 0);
                    } else if (game.sitting === '0') {
                        if (round1Team1Won) team1Stats.roundsWonStanding++;
                        if (round2Team1Won) team1Stats.roundsWonStanding++;
                        if (round1Team2Won) team2Stats.roundsWonStanding++;
                        if (round2Team2Won) team2Stats.roundsWonStanding++;

                        team1Stats.totalPointsStanding += (parseInt(game.round1_points_team_1, 10) || 0) + (parseInt(game.round2_points_team_1, 10) || 0);
                        team2Stats.totalPointsStanding += (parseInt(game.round1_points_team_2, 10) || 0) + (parseInt(game.round2_points_team_2, 10) || 0);
                        
                        team1Stats.totalPointsAgainstStanding += (parseInt(game.round1_points_team_2, 10) || 0) + (parseInt(game.round2_points_team_2, 10) || 0);
                        team2Stats.totalPointsAgainstStanding += (parseInt(game.round1_points_team_1, 10) || 0) + (parseInt(game.round2_points_team_1, 10) || 0);
                    }
                }
            });

        const groupResults: Record<string, any[]> = {};
        groups.forEach(group => {
            const groupTeamAssignments = groupTeams.filter((gt: any) => gt.group_id === group.id)
                .map((gt: any) => teamStats[gt.team_id])
                .filter(Boolean);
            
            // Sort by rounds won, then by point difference
            groupTeamAssignments.sort((a: any, b: any) => {
                if (a.roundsWonSitting !== b.roundsWonSitting) return b.roundsWonSitting - a.roundsWonSitting;
                const pointDiffA = a.totalPointsSitting - a.totalPointsAgainstSitting;
                const pointDiffB = b.totalPointsSitting - b.totalPointsAgainstSitting;
                if (pointDiffA !== pointDiffB) return pointDiffB - pointDiffA;
                return 0; // Could add head-to-head comparison here
            });

            // Assign final score (1st=11, 2nd=9, 3rd=7, 4th=5)
            groupTeamAssignments.forEach((team: any, index: number) => {
                const finalScore = [11, 9, 7, 5][index] || 0;
                team.finalScore += finalScore;
            });

            groupResults[group.name] = groupTeamAssignments;
        });

        groups.forEach(group => {
            const groupTeamAssignments = groupTeams.filter((gt: any) => gt.group_id === group.id)
                .map((gt: any) => teamStats[gt.team_id])
                .filter(Boolean);
            
            groupTeamAssignments.sort((a: any, b: any) => {
                if (a.roundsWonStanding !== b.roundsWonStanding) return b.roundsWonStanding - a.roundsWonStanding;
                const pointDiffA = a.totalPointsStanding - a.totalPointsAgainstStanding;
                const pointDiffB = b.totalPointsStanding - b.totalPointsAgainstStanding;
                if (pointDiffA !== pointDiffB) return pointDiffB - pointDiffA;
                return 0;
            });

            // Assign final score (1st=10, 2nd=8, 3rd=6, 4th=4)
            groupTeamAssignments.forEach((team: any, index: number) => {
                const finalScore = [10, 8, 6, 4][index] || 0;
                team.finalScore += finalScore;
            });

            groupResults[group.name] = groupTeamAssignments;
        });

        return teamStats;
    }

    sortTeamStatsByGroup(teamStats: Record<string, any>, groupTeams: any[], groupId: string, games?: any[]) {
        const groupTeamIds = groupTeams.filter((gt: any) => gt.group_id === groupId).map((gt: any) => gt.team_id);
                return groupTeamIds.map(teamId => teamStats[teamId]).filter(Boolean).sort((a: any, b: any) => {
                    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
                    if (b.roundsWonSitting + b.roundsWonStanding !== a.roundsWonSitting + a.roundsWonStanding) {
                        return b.roundsWonSitting + b.roundsWonStanding - (a.roundsWonSitting + a.roundsWonStanding);
                    }
                    const pointDiffA = (a.totalPointsSitting + a.totalPointsStanding) - (a.totalPointsAgainstSitting + a.totalPointsAgainstStanding);
                    const pointDiffB = (b.totalPointsSitting + b.totalPointsStanding) - (b.totalPointsAgainstSitting + b.totalPointsAgainstStanding);
                    if (pointDiffA !== pointDiffB) {
                        return pointDiffB - pointDiffA;
                    }
                    
                    // Head-to-head comparison: find the sitting game between teams a and b
                    if (games) {
                        const headToHeadGame = games.find((game: any) => 
                            game.sitting === '1' && // sitting game
                            ((game.team_1_id === a.id && game.team_2_id === b.id) || 
                             (game.team_1_id === b.id && game.team_2_id === a.id))
                        );
                        
                        if (headToHeadGame) {
                            const team1TotalPoints = (parseInt(headToHeadGame.round1_points_team_1, 10) || 0) + (parseInt(headToHeadGame.round2_points_team_1, 10) || 0);
                            const team2TotalPoints = (parseInt(headToHeadGame.round1_points_team_2, 10) || 0) + (parseInt(headToHeadGame.round2_points_team_2, 10) || 0);
                            
                            let gameWinner = null;
                            if (team1TotalPoints !== team2TotalPoints) {
                                gameWinner = team1TotalPoints > team2TotalPoints ? headToHeadGame.team_1_id : headToHeadGame.team_2_id;
                            }
                            
                            // If there's a clear winner, rank the winner higher
                            if (gameWinner) {
                                console.log(`Head-to-head: ${a.name} vs ${b.name}, winner: ${gameWinner === a.id ? a.name : b.name}`);
                                if (gameWinner === a.id) return -1; // a wins, a comes first
                                if (gameWinner === b.id) return 1;  // b wins, b comes first
                            }
                        }
                    }
                    
                    return 0;
                });
    }
}

export default new RankingService();