"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FaArrowLeft } from "react-icons/fa";
import { v4 as uuidv4 } from 'uuid';
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TeamsTabContent from "./TeamsTabContent";
import VorrundeTabContent from "./VorrundeTabContent";
import FinalrundeTabContent from "./FinalrundeTabContent";
import AuswertungTabContent from "./AuswertungTabContent";
import { FINALRUNDE_SCHEDULE, VORRUNDE_SCHEDULE } from "@/globals/schedules";
import { STATE_OPTIONS } from "@/globals/states";
import CupsService from "@/services/cups";
import TeamsService from "@/services/teams";
import GroupsService from "@/services/groups";
import GroupTeamsService from "@/services/groupTeams";
import TournamentsService from "@/services/tournaments";
import GamesService from "@/services/games";


export default function CupDetails() {
    useAdminAuth();
    const { cupId } = useParams();
    const router = useRouter();
    const [cup, setCup] = useState<any>(null);
    const [editing, setEditing] = useState(false);
    const [editCup, setEditCup] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [tab, setTab] = useState('teams');
    const [teams, setTeams] = useState<any[]>([]);
    const [showStartTimeDialog, setShowStartTimeDialog] = useState(false);
    const [startTime, setStartTime] = useState("09:00");
    const [savingGames, setSavingGames] = useState(false);
    const [gameError, setGameError] = useState("");
    const [gameSuccess, setGameSuccess] = useState("");
    const [groups, setGroups] = useState<any[]>([]);
    const [groupTeams, setGroupTeams] = useState<any[]>([]);
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [showFinalrundeDialog, setShowFinalrundeDialog] = useState(false);
    const [finalrundeStartTime, setFinalrundeStartTime] = useState("13:30");
    const [showCloseTournamentDialog, setShowCloseTournamentDialog] = useState(false);

    // Function to refresh teams data
    const refreshTeams = async () => {
        try {
            const res = await TeamsService.getTeamsByCupId(cupId as string);
            setTeams(res);
        } catch (error) {
            console.error('Error refreshing teams:', error);
        }
    };

    useEffect(() => {
        CupsService.getCup(cupId as string).then(res => {
            setCup(res);
        });
        // Fetch teams for this cup
        refreshTeams();
        // Fetch groups and group_teams
        GroupsService.getGroups().then(res => setGroups(res));
        GroupTeamsService.getGroupTeams().then(res => setGroupTeams(res));
        TournamentsService.getTournamentsByCupId(cupId as string).then(res => {
            setTournaments(res);
        });
    }, [cupId]);

    useEffect(() => {
        if (cup) setEditCup({ ...cup });
    }, [cup]);

    const handleEdit = () => {
        setEditCup({ ...cup });
        setEditing(true);
        setError("");
        setSuccess("");
    };

    const handleCancel = () => {
        setEditCup({ ...cup });
        setEditing(false);
        setError("");
        setSuccess("");
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccess("");
        const token = localStorage.getItem("adminToken");
        try {
            await CupsService.updateCup(editCup.id, {
                title: editCup.title,
                address: editCup.address,
                state: editCup.state,
            });
            setSuccess("Erfolgreich gespeichert!");
            setEditing(false);
            // Refresh cup data
            CupsService.getCup(cupId as string).then(res => {
                setCup(res);
            });
        } catch (e) {
            setError("Fehler beim Speichern");
        } finally {
            setSaving(false);
        }
    };

    // Helper: group teams by group and assign numbers 1-4
    const getGroupedTeams = () => {
        const grouped: Record<string, any[]> = { A: [], B: [], C: [], D: [] };
        teams.forEach(team => {
            // Find group assignment for this team
            const gt = groupTeams.find((gt: any) => gt.team_id === team.id);
            if (!gt) return;
            const group = groups.find((g: any) => g.id === gt.group_id);
            if (group && grouped[group.name]) grouped[group.name].push(team);
        });
        // Sort each group by name for consistent numbering
        Object.keys(grouped).forEach(g => grouped[g].sort((a, b) => a.name.localeCompare(b.name)));
        return grouped;
    };
    // Court 1-3: sitzen, 4-6: stand
    const COURT_TYPE = [true, true, true, false, false, false];

    const handleCreateGames = async () => {
        setSavingGames(true);
        setGameError("");
        setGameSuccess("");
        try {
            // 1. Group teams
            const sittingGrouped = getGroupedTeams();
            const standingGrouped = getGroupedTeams();
            // 2. Map group+number to teamId
            const getSittingTeamId = (group: string, num: number) => sittingGrouped[group][num - 1]?.id;
            const getStandingTeamId = (group: string, num: number) => standingGrouped[group][num - 1]?.id;
            // 3. Generate games
            const games = [];
            let start = new Date();
            const [h, m] = startTime.split(":");
            start.setHours(Number(h), Number(m), 0, 0);
            for (let round = 0; round < VORRUNDE_SCHEDULE.length; round++) {
                const roundTime = new Date(start.getTime() + round * 30 * 60000);
                for (let court = 0; court < 6; court++) {
                    const match = VORRUNDE_SCHEDULE[round][court];
                    const [left, right] = match.split("-");
                    const groupL = left[0], numL = Number(left[1]);
                    const groupR = right[0], numR = Number(right[1]);
                    const team1Id = COURT_TYPE[court] ? getSittingTeamId(groupL, numL) : getStandingTeamId(groupL, numL);
                    const team2Id = COURT_TYPE[court] ? getSittingTeamId(groupR, numR) : getStandingTeamId(groupR, numR);
                    if (!team1Id || !team2Id) continue; // skip if mapping fails
                    const sittingTournament = tournaments.find(t => t.sitting === '1');
                    const standingTournament = tournaments.find(t => t.sitting === '0');
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    const localDateString = `${roundTime.getFullYear()}-${pad(roundTime.getMonth() + 1)}-${pad(roundTime.getDate())}T${pad(roundTime.getHours())}:${pad(roundTime.getMinutes())}:00`;
                    games.push({
                        id: uuidv4(),
                        team_1_id: team1Id,
                        team_2_id: team2Id,
                        ref_team_id: null,
                        points_team_1: 0,
                        points_team_2: 0,
                        start_at: localDateString,
                        tournament_id: COURT_TYPE[court] ? sittingTournament?.id : standingTournament?.id,
                        round: "Vorrunde",
                        sitting: COURT_TYPE[court] ? 1 : 0,
                        court: court + 1
                    });
                }
            }
            // 4. Save games (bulk insert if supported, else one by one)
            await GamesService.createMultipleGames(games);
            // 5. Update cup status
            await CupsService.updateCup(cup.id, { ...cup, state: "Vorrunde" });
            setGameSuccess("Spiele erfolgreich erstellt und Status aktualisiert!");
            setShowStartTimeDialog(false);
            // Refresh cup data
            CupsService.getCup(cupId as string).then(res => {
                const cups = res;
                setCup(cups);
            });
        } catch (e) {
            setGameError("Fehler beim Erstellen der Spiele oder Aktualisieren des Status.");
        } finally {
            setSavingGames(false);
        }
    };

    const handleCreateFinalrunde = async () => {
        setSavingGames(true);
        setGameError("");
        setGameSuccess("");
        try {

            // 1. Get all Vorrunde games with their results
            const gamesRes = [];
            for (const tournament of tournaments) {
                const games = await GamesService.getGamesByTournamentId(tournament.id);
                gamesRes.push(...games);
            }
            const vorrundeGames = gamesRes.filter((g: any) => g.round === 'Vorrunde');
            
            // 2. Get all teams
            const teamsRes = await TeamsService.getTeamsByCupId(cupId as string);
            const allTeams = teamsRes.filter((t: any) => t.icke_cup_id === cupId);
            
            // 3. Evaluate games and calculate team performance
            const teamStats: Record<string, any> = {};
            allTeams.forEach((team: any) => {
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
            
            // Calculate stats for each team
            vorrundeGames.forEach((game: any) => {
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
            
            // 4. Group teams by tournament and evaluate each group
            const sittingTournament = tournaments.find(t => t.sitting === '1');
            const standingTournament = tournaments.find(t => t.sitting === '0');
            
            // Get groups for each tournament
            const sittingGroups = groups.filter(g => g.tournament_id === sittingTournament?.id);
            const standingGroups = groups.filter(g => g.tournament_id === standingTournament?.id);
            
            // Evaluate sitting tournament groups
            const sittingGroupResults: Record<string, any[]> = {};
            sittingGroups.forEach(group => {
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

                sittingGroupResults[group.name] = groupTeamAssignments;
            });

            // Evaluate standing tournament groups
            const standingGroupResults: Record<string, any[]> = {};
            standingGroups.forEach(group => {
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
                
                standingGroupResults[group.name] = groupTeamAssignments;
            });
            
            // 5. Finally sort allteams by their final scores, rounds won and point difference
            const finalRanking = Object.values(teamStats).sort((a: any, b: any) => {
                if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
                if (b.roundsWonSitting + b.roundsWonStanding !== a.roundsWonSitting + a.roundsWonStanding) {
                    return b.roundsWonSitting + b.roundsWonStanding - (a.roundsWonSitting + a.roundsWonStanding);
                }
                const pointDiffA = (a.totalPointsSitting + a.totalPointsStanding) - (a.totalPointsAgainstSitting + a.totalPointsAgainstStanding);
                const pointDiffB = (b.totalPointsSitting + b.totalPointsStanding) - (b.totalPointsAgainstSitting + b.totalPointsAgainstStanding);
                return pointDiffB - pointDiffA;
            });

            // 6. Create new tournaments for Finalrunde
            const finalrundeSittingTournamentId = uuidv4();
            const finalrundeStandingTournamentId = uuidv4();
            
            await Promise.all([
                TournamentsService.createTournament({ 
                    id: finalrundeSittingTournamentId, 
                    icke_cup_id: cupId, 
                    sitting: 1 
                }),
                TournamentsService.createTournament({ 
                    id: finalrundeStandingTournamentId, 
                    icke_cup_id: cupId, 
                    sitting: 0 
                })
            ]);
            
            // 7. Create new groups E, F, G, H based on final ranking (Group E: 1st of Groups A/B/C/D, Group F: 2nd of Groups A/B/C/D, Group G: 3rd of Groups A/B/C/D, Group H: 4th of Groups A/B/C/D)
            // First, get the group IDs for A, B, C, D
            const groupA = groups.find(g => g.name === 'A');
            const groupB = groups.find(g => g.name === 'B');
            const groupC = groups.find(g => g.name === 'C');
            const groupD = groups.find(g => g.name === 'D');

            // Get teams for each group and sort them by their performance in that group
            const getGroupRanking = (groupId: string) => {
                const groupTeamIds = groupTeams.filter((gt: any) => gt.group_id === groupId).map((gt: any) => gt.team_id);
                return groupTeamIds.map(teamId => teamStats[teamId]).filter(Boolean).sort((a: any, b: any) => {
                    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
                    if (b.roundsWonSitting + b.roundsWonStanding !== a.roundsWonSitting + a.roundsWonStanding) {
                        return b.roundsWonSitting + b.roundsWonStanding - (a.roundsWonSitting + a.roundsWonStanding);
                    }
                    const pointDiffA = (a.totalPointsSitting + a.totalPointsStanding) - (a.totalPointsAgainstSitting + a.totalPointsAgainstStanding);
                    const pointDiffB = (b.totalPointsSitting + b.totalPointsStanding) - (b.totalPointsAgainstSitting + b.totalPointsAgainstStanding);
                    return pointDiffB - pointDiffA;
                });
            };

            const groupARanking = getGroupRanking(groupA?.id);
            const groupBRanking = getGroupRanking(groupB?.id);
            const groupCRanking = getGroupRanking(groupC?.id);
            const groupDRanking = getGroupRanking(groupD?.id);
            console.log(groupARanking, groupBRanking, groupCRanking, groupDRanking);

            const groupE = [groupARanking[0], groupBRanking[0], groupCRanking[0], groupDRanking[0]].filter(Boolean);
            const groupF = [groupARanking[1], groupBRanking[1], groupCRanking[1], groupDRanking[1]].filter(Boolean);
            const groupG = [groupARanking[2], groupBRanking[2], groupCRanking[2], groupDRanking[2]].filter(Boolean);
            const groupH = [groupARanking[3], groupBRanking[3], groupCRanking[3], groupDRanking[3]].filter(Boolean);
            console.log(groupE, groupF, groupG, groupH);

            // Create groups in database
            const groupEIdSitting = uuidv4();
            const groupFIdSitting = uuidv4();
            const groupGIdSitting = uuidv4();
            const groupHIdSitting = uuidv4();
            const groupEIdStanding = uuidv4();
            const groupFIdStanding = uuidv4();
            const groupGIdStanding = uuidv4();
            const groupHIdStanding = uuidv4();

            await Promise.all([
                GroupsService.createGroup({ id: groupEIdSitting, tournament_id: finalrundeSittingTournamentId, name: 'E' }),
                GroupsService.createGroup({ id: groupFIdSitting, tournament_id: finalrundeSittingTournamentId, name: 'F' }),
                GroupsService.createGroup({ id: groupGIdSitting, tournament_id: finalrundeSittingTournamentId, name: 'G' }),
                GroupsService.createGroup({ id: groupHIdSitting, tournament_id: finalrundeSittingTournamentId, name: 'H' }),
                GroupsService.createGroup({ id: groupEIdStanding, tournament_id: finalrundeStandingTournamentId, name: 'E' }),
                GroupsService.createGroup({ id: groupFIdStanding, tournament_id: finalrundeStandingTournamentId, name: 'F' }),
                GroupsService.createGroup({ id: groupGIdStanding, tournament_id: finalrundeStandingTournamentId, name: 'G' }),
                GroupsService.createGroup({ id: groupHIdStanding, tournament_id: finalrundeStandingTournamentId, name: 'H' })
            ]);
            
            // 8. Assign teams to new groups
            const groupAssignments = [
                ...groupE.map((team: any) => ({ group_id: groupEIdSitting, team_id: team.id })),
                ...groupF.map((team: any) => ({ group_id: groupFIdSitting, team_id: team.id })),
                ...groupG.map((team: any) => ({ group_id: groupGIdSitting, team_id: team.id })),
                ...groupH.map((team: any) => ({ group_id: groupHIdSitting, team_id: team.id })),
                ...groupE.map((team: any) => ({ group_id: groupEIdStanding, team_id: team.id })),
                ...groupF.map((team: any) => ({ group_id: groupFIdStanding, team_id: team.id })),
                ...groupG.map((team: any) => ({ group_id: groupGIdStanding, team_id: team.id })),
                ...groupH.map((team: any) => ({ group_id: groupHIdStanding, team_id: team.id }))
            ];

            await Promise.all(groupAssignments.map(assignment =>
                GroupTeamsService.createGroupTeam(assignment)
            ));
            
            // 9. Create final round games
            const finalGames = [];
            let start = new Date();
            const [h, m] = finalrundeStartTime.split(":");
            start.setHours(Number(h), Number(m), 0, 0);
            
            // Create a mapping of group names to their team assignments
            const groupTeamMapSitting: Record<string, any[]> = {
                'E': groupAssignments.filter(gt => gt.group_id === groupEIdSitting),
                'F': groupAssignments.filter(gt => gt.group_id === groupFIdSitting),
                'G': groupAssignments.filter(gt => gt.group_id === groupGIdSitting),
                'H': groupAssignments.filter(gt => gt.group_id === groupHIdSitting)
            };

            const groupTeamMapStanding: Record<string, any[]> = {
                'E': groupAssignments.filter(gt => gt.group_id === groupEIdStanding),
                'F': groupAssignments.filter(gt => gt.group_id === groupFIdStanding),
                'G': groupAssignments.filter(gt => gt.group_id === groupGIdStanding),
                'H': groupAssignments.filter(gt => gt.group_id === groupHIdStanding)
            };
            
            const getTeamIdFromSittingGroup = (groupName: string, position: number) => {
                const groupTeams = groupTeamMapSitting[groupName];
                if (!groupTeams || position < 1 || position > groupTeams.length) return null;
                return groupTeams[position - 1]?.team_id;
            };

            const getTeamIdFromStandingGroup = (groupName: string, position: number) => {
                const groupTeams = groupTeamMapStanding[groupName];
                if (!groupTeams || position < 1 || position > groupTeams.length) return null;
                return groupTeams[position - 1]?.team_id;
            };
            
            for (let round = 0; round < FINALRUNDE_SCHEDULE.length; round++) {
                const roundTime = new Date(start.getTime() + round * 30 * 60000);
                for (let court = 0; court < 6; court++) {
                    const match = FINALRUNDE_SCHEDULE[round][court];
                    if (!match) continue;
                    
                    const [left, right] = match.split("-");
                    const groupL = left[0], numL = Number(left[1]);
                    const groupR = right[0], numR = Number(right[1]);

                    const team1Id = COURT_TYPE[court] ? getTeamIdFromSittingGroup(groupL, numL) : getTeamIdFromStandingGroup(groupL, numL);
                    const team2Id = COURT_TYPE[court] ? getTeamIdFromSittingGroup(groupR, numR) : getTeamIdFromStandingGroup(groupR, numR);

                    if (!team1Id || !team2Id) continue;
                    
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    const localDateString = `${roundTime.getFullYear()}-${pad(roundTime.getMonth() + 1)}-${pad(roundTime.getDate())}T${pad(roundTime.getHours())}:${pad(roundTime.getMinutes())}:00`;
                    
                    finalGames.push({
                        id: uuidv4(),
                        team_1_id: team1Id,
                        team_2_id: team2Id,
                        ref_team_id: null,
                        points_team_1: 0,
                        points_team_2: 0,
                        start_at: localDateString,
                        tournament_id: COURT_TYPE[court] ? finalrundeSittingTournamentId : finalrundeStandingTournamentId,
                        round: "Finalrunde",
                        sitting: COURT_TYPE[court] ? 1 : 0,
                        court: court + 1
                    });
                }
            }
            
            // Save final games
            await Promise.all(finalGames.map(game =>
                GamesService.createGame(game)
            ));
            
            // 10. Update cup status
            await CupsService.updateCup(cup.id, { ...cup, state: "Finalrunde" });
            
            setGameSuccess("Finalrunde erfolgreich erstellt!");
            setShowFinalrundeDialog(false);
            
            // Refresh cup data
            CupsService.getCup(cupId as string).then(res => {
                const cups = res;
                setCup(cups);
            });
            
        } catch (e) {
            setGameError("Fehler beim Erstellen der Finalrunde.");
            console.error(e);
        } finally {
            setSavingGames(false);
        }
    };

    // Evaluation logic for Finalrunde
    const handleEvaluateFinalrunde = async () => {
        setSavingGames(true);
        setGameError("");
        setGameSuccess("");
        try {
            // 1. Get all games (both Vorrunde and Finalrunde)
            const gamesRes = [];
            for (const tournament of tournaments) {
                const games = await GamesService.getGamesByTournamentId(tournament.id);
                gamesRes.push(...games);
            }
            const finalrundeGames = gamesRes.filter((g: any) => g.round === 'Finalrunde');
            
            // 2. Get all teams
            const teamsRes = await TeamsService.getTeamsByCupId(cupId as string);
            const allTeams = teamsRes.filter((t: any) => t.icke_cup_id === cupId);
            
            // 3. Get all groups and group_teams for Finalrunde
            const groupsRes = await GroupsService.getGroups();
            const groupTeamsRes = await GroupTeamsService.getGroupTeams();
            const finalGroups = groupsRes.filter((g: any) => ['E','F','G','H'].includes(g.name));
            const groupTeams = groupTeamsRes;
            
            // 4. Evaluate Finalrunde group results using same logic as Vorrunde
            const finalTeamStats: Record<string, any> = {};
            allTeams.forEach((team: any) => {
                finalTeamStats[team.id] = {
                    id: team.id,
                    name: team.name,
                    contact: team.contact,
                    roundsWonSitting: 0,
                    roundsWonStanding: 0,
                    totalPointsSitting: 0,
                    totalPointsStanding: 0,
                    totalPointsAgainstSitting: 0,
                    totalPointsAgainstStanding: 0,
                    gamesPlayed: 0
                };
            });
            
            finalrundeGames.forEach((game: any) => {
                const team1Stats = finalTeamStats[game.team_1_id];
                const team2Stats = finalTeamStats[game.team_2_id];
                if (team1Stats && team2Stats) {
                    team1Stats.gamesPlayed++;
                    team2Stats.gamesPlayed++;
                    const round1Team1Won = game.round1_winner === game.team_1_id;
                    const round2Team1Won = game.round2_winner === game.team_1_id;
                    const round1Team2Won = game.round1_winner === game.team_2_id;
                    const round2Team2Won = game.round2_winner === game.team_2_id;
                    
                    if (game.sitting === '1') {
                        if (round1Team1Won) team1Stats.roundsWonSitting++;
                        if (round2Team1Won) team1Stats.roundsWonSitting++;
                        if (round1Team2Won) team2Stats.roundsWonSitting++;
                        if (round2Team2Won) team2Stats.roundsWonSitting++;
                        
                        team1Stats.totalPointsSitting += (parseInt(game.round1_points_team_1) || 0) + (parseInt(game.round2_points_team_1) || 0);
                        team2Stats.totalPointsSitting += (parseInt(game.round1_points_team_2) || 0) + (parseInt(game.round2_points_team_2) || 0);
                        team1Stats.totalPointsAgainstSitting += (parseInt(game.round1_points_team_2) || 0) + (parseInt(game.round2_points_team_2) || 0);
                        team2Stats.totalPointsAgainstSitting += (parseInt(game.round1_points_team_1) || 0) + (parseInt(game.round2_points_team_1) || 0);
                    } else if (game.sitting === '0') {
                        if (round1Team1Won) team1Stats.roundsWonStanding++;
                        if (round2Team1Won) team1Stats.roundsWonStanding++;
                        if (round1Team2Won) team2Stats.roundsWonStanding++;
                        if (round2Team2Won) team2Stats.roundsWonStanding++;
                        
                        team1Stats.totalPointsStanding += (parseInt(game.round1_points_team_1) || 0) + (parseInt(game.round2_points_team_1) || 0);
                        team2Stats.totalPointsStanding += (parseInt(game.round1_points_team_2) || 0) + (parseInt(game.round2_points_team_2) || 0);
                        team1Stats.totalPointsAgainstStanding += (parseInt(game.round1_points_team_2) || 0) + (parseInt(game.round2_points_team_2) || 0);
                        team2Stats.totalPointsAgainstStanding += (parseInt(game.round1_points_team_1) || 0) + (parseInt(game.round2_points_team_1) || 0);
                    }
                }
            });
            // 5. For each group, sort by Finalrunde performance using same logic as Vorrunde
            const groupOffsets = { E: 0, F: 4, G: 8, H: 12 };
            const finalPlaceUpdates: any[] = [];
            
            // Get finalrunde groups
            const finalrundeGroups = await GroupsService.getGroups();
            const finalrundeGroupTeams = await GroupTeamsService.getGroupTeams();
            
            const finalrundeGroupE = finalrundeGroups.find((g: any) => g.name === 'E');
            const finalrundeGroupF = finalrundeGroups.find((g: any) => g.name === 'F');
            const finalrundeGroupG = finalrundeGroups.find((g: any) => g.name === 'G');
            const finalrundeGroupH = finalrundeGroups.find((g: any) => g.name === 'H');
            
            (['E','F','G','H'] as (keyof typeof groupOffsets)[]).forEach((groupName) => {
                let groupId: string | undefined;
                switch(groupName) {
                    case 'E': groupId = finalrundeGroupE?.id; break;
                    case 'F': groupId = finalrundeGroupF?.id; break;
                    case 'G': groupId = finalrundeGroupG?.id; break;
                    case 'H': groupId = finalrundeGroupH?.id; break;
                }
                
                if (!groupId) return;
                
                // Get all team ids in this group
                const groupTeamIds = finalrundeGroupTeams
                    .filter((gt: any) => gt.group_id === groupId)
                    .map((gt: any) => gt.team_id);
                    
                // Get stats for these teams
                const groupStats = groupTeamIds.map((id: any) => finalTeamStats[id]).filter(Boolean);
                
                // Sort by Finalrunde performance using same logic as Vorrunde: combined rounds won first, then combined point difference
                groupStats.sort((a: any, b: any) => {
                    // Primary: Combined rounds won (sitting + standing)
                    const totalRoundsA = a.roundsWonSitting + a.roundsWonStanding;
                    const totalRoundsB = b.roundsWonSitting + b.roundsWonStanding;
                    if (totalRoundsA !== totalRoundsB) return totalRoundsB - totalRoundsA;
                    
                    // Tiebreaker: Combined point difference (sitting + standing)
                    const pointDiffA = (a.totalPointsSitting + a.totalPointsStanding) - (a.totalPointsAgainstSitting + a.totalPointsAgainstStanding);
                    const pointDiffB = (b.totalPointsSitting + b.totalPointsStanding) - (b.totalPointsAgainstSitting + b.totalPointsAgainstStanding);
                    return pointDiffB - pointDiffA;
                });
                
                // Assign final_place
                groupStats.forEach((team: any, idx: number) => {
                    const dbTeam = allTeams.find((t: any) => t.id === team.id);
                    finalPlaceUpdates.push({
                        id: team.id,
                        name: dbTeam?.name || team.name,
                        contact: dbTeam?.contact || team.contact,
                        final_place: groupOffsets[groupName] + idx + 1
                    });
                });
            });
            // 6. Update all teams with their final_place
            await Promise.all(finalPlaceUpdates.map(team =>
                TeamsService.updateTeam(team.id, team)
            ));
            // 7. Update cup status to 'Abgeschlossen'
            await CupsService.updateCup(cup.id, { ...cup, state: "Abgeschlossen" });
            setGameSuccess("Turnier abgeschlossen und Platzierungen gespeichert!");
            // Refresh cup data
            CupsService.getCup(cupId as string).then(res => {
                const cups = res;
                setCup(cups);
            });
        } catch (e) {
            setGameError("Fehler bei der Auswertung der Finalrunde.");
            console.error(e);
        } finally {
            setSavingGames(false);
        }
    };

    if (!cup || !editCup) return <div>Lade Cup...</div>;

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-md p-4 mt-4">
            <div className="flex flex-row justify-between items-center mb-4">
                <div className="flex flex-row items-center gap-2">
                    <Button variant="ghost" size="icon" className="p-2" onClick={() => router.push('/admin')} aria-label="Zurück zur Übersicht">
                        <FaArrowLeft />
                    </Button>
                    <h1 className="text-xl font-bold">Cup Details</h1>
                </div>
                <div className="flex flex-row items-center gap-2">
                    { ["Bevorstehend"].includes(cup.state) && (
                        <Dialog open={showStartTimeDialog} onOpenChange={setShowStartTimeDialog}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="default"
                                    disabled={!(teams.length === 16 && ["Bevorstehend"].includes(cup.state))}
                                    title={teams.length !== 16 ? "Es müssen genau 16 Teams angelegt sein." : cup.state !== "Bevorstehend" ? "Status muss 'Bevorstehend' sein." : ""}
                                    onClick={() => setShowStartTimeDialog(true)}
                                >
                                    Zur Vorrunde fortfahren
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Startzeit der Vorrunde festlegen</DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-col gap-4 mt-2">
                                    <label className="font-medium">Startzeit
                                        <input
                                            type="time"
                                            className="border rounded px-2 py-1 mt-1"
                                            value={startTime}
                                            onChange={e => setStartTime(e.target.value)}
                                        />
                                    </label>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowStartTimeDialog(false)} disabled={savingGames}>Abbrechen</Button>
                                    <Button onClick={handleCreateGames} disabled={savingGames}>{savingGames ? "Speichern..." : "Bestätigen"}</Button>
                                </DialogFooter>
                                {gameError && <p className="text-red-500 text-sm mt-2">{gameError}</p>}
                                {gameSuccess && <p className="text-green-600 text-sm mt-2">{gameSuccess}</p>}
                            </DialogContent>
                        </Dialog>
                    )}
                    {cup.state === "Vorrunde" && (
                        <Dialog open={showFinalrundeDialog} onOpenChange={setShowFinalrundeDialog}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="default"
                                    onClick={() => setShowFinalrundeDialog(true)}
                                >
                                    Zur Finalrunde fortfahren
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Finalrunde starten</DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-col gap-4 mt-2">
                                    <p>Bitte bestätigen Sie, dass alle Vorrundenspiele korrekt ausgefüllt sind.</p>
                                    <label className="font-medium">Startzeit der Finalrunde
                                        <input
                                            type="time"
                                            className="border rounded px-2 py-1 mt-1"
                                            value={finalrundeStartTime}
                                            onChange={e => setFinalrundeStartTime(e.target.value)}
                                        />
                                    </label>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowFinalrundeDialog(false)} disabled={savingGames}>Abbrechen</Button>
                                    <Button onClick={handleCreateFinalrunde} disabled={savingGames}>{savingGames ? "Erstellen..." : "Bestätigen"}</Button>
                                </DialogFooter>
                                {gameError && <p className="text-red-500 text-sm mt-2">{gameError}</p>}
                                {gameSuccess && <p className="text-green-600 text-sm mt-2">{gameSuccess}</p>}
                            </DialogContent>
                        </Dialog>
                    )}
                    {cup.state === "Finalrunde" && (
                        <Dialog open={showCloseTournamentDialog} onOpenChange={setShowCloseTournamentDialog}>
                            <DialogTrigger asChild>
                                <Button variant="destructive" onClick={() => setShowCloseTournamentDialog(true)}>
                                    Turnier abschließen
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Turnier abschließen</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">Sind Sie sicher, dass Sie zur Auswertung fortfahren möchten? Diese Aktion kann nicht rückgängig gemacht werden.</div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowCloseTournamentDialog(false)}>Abbrechen</Button>
                                    <Button variant="destructive" onClick={async () => { setShowCloseTournamentDialog(false); await handleEvaluateFinalrunde(); }}>Zur Auswertung</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                    {!editing && <Button onClick={handleEdit}>Bearbeiten</Button>}
                </div>
            </div>
            {/* Navigation Menu */}
            
            {editing ? (
                <div className="flex flex-col gap-2 mb-4">
                    <label className="font-medium">Titel
                        <Input
                            value={editCup.title}
                            onChange={e => setEditCup({ ...editCup, title: e.target.value })}
                        />
                    </label>
                    <label className="font-medium">Adresse
                        <Input
                            value={editCup.address}
                            onChange={e => setEditCup({ ...editCup, address: e.target.value })}
                        />
                    </label>
                    <label className="font-medium">Status
                        <Select value={editCup.state} onValueChange={val => setEditCup({ ...editCup, state: val })}>
                            <SelectTrigger className="mt-1 w-full">
                                <SelectValue placeholder="Status wählen..." />
                            </SelectTrigger>
                            <SelectContent>
                                {STATE_OPTIONS.map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </label>
                    <div className="flex gap-2 mt-2">
                        <Button onClick={handleSave} disabled={saving}>{saving ? "Speichern..." : "Speichern"}</Button>
                        <Button variant="outline" onClick={handleCancel} disabled={saving}>Abbrechen</Button>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    {success && <p className="text-green-600 text-sm">{success}</p>}
                </div>
            ) : (
                <div className="mb-4">
                    <p><span className="font-medium">Titel:</span> {cup.title}</p>
                    <p><span className="font-medium">Adresse:</span> {cup.address}</p>
                    <p><span className="font-medium">Status:</span> {cup.state}</p>
                </div>
            )}
            <Tabs value={tab} className="mb-6" onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="teams">Teams</TabsTrigger>
                    <TabsTrigger value="vorrunde">Vorrunde</TabsTrigger>
                    <TabsTrigger value="finalrunde">Finalrunde</TabsTrigger>
                    <TabsTrigger value="auswertung">Auswertung</TabsTrigger>
                </TabsList>
                <TabsContent value="teams">
                    <TeamsTabContent 
                        cupId={typeof cupId === 'string' ? cupId : ''} 
                        cup={cup} 
                        onTeamsChange={refreshTeams}
                    />
                </TabsContent>
                <TabsContent value="vorrunde">
                    <VorrundeTabContent cupId={typeof cupId === 'string' ? cupId : ''} />
                </TabsContent>
                <TabsContent value="finalrunde">
                    <FinalrundeTabContent cupId={typeof cupId === 'string' ? cupId : ''} />
                </TabsContent>
                <TabsContent value="auswertung">
                    <AuswertungTabContent cupId={typeof cupId === 'string' ? cupId : ''} teams={teams} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
