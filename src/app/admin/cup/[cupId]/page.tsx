"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FaPen, FaTrash, FaArrowLeft } from "react-icons/fa";
import { v4 as uuidv4 } from 'uuid';
import api from "@/lib/api";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TeamsTabContent from "./TeamsTabContent";
import VorrundeTabContent from "./VorrundeTabContent";
import FinalrundeTabContent from "./FinalrundeTabContent";
import AuswertungTabContent from "./AuswertungTabContent";
import { FINALRUNDE_SCHEDULE, VORRUNDE_SCHEDULE } from "@/globals/schedules";

const STATE_OPTIONS = [
    "Bevorstehend",
    "Vorrunde",
    "Finalrunde",
    "Abgeschlossen"
];

type Team = {
    id: string;
    name: string;
    contact: string;
    place: number;
    icke_cup_id: string;
};

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

    useEffect(() => {
        api.get(`?path=cups`).then(res => {
            const cups = res.data;
            setCup(cups.find((c: any) => c.id === cupId));
        });
        // Fetch teams for this cup
        api.get(`?path=teams`).then(res => {
            setTeams(res.data.filter((t: any) => t.icke_cup_id === cupId));
        });
        // Fetch groups and group_teams
        api.get(`?path=groups`).then(res => setGroups(res.data));
        api.get(`?path=group_teams`).then(res => setGroupTeams(res.data));
        api.get(`?path=tournaments`).then(res => {
            setTournaments(res.data.filter((t: any) => t.icke_cup_id === cupId));
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
            await api.put(`?path=cups`, {
                id: editCup.id,
                title: editCup.title,
                address: editCup.address,
                state: editCup.state,
            }, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });
            setSuccess("Erfolgreich gespeichert!");
            setEditing(false);
            // Refresh cup data
            api.get(`?path=cups`).then(res => {
                const cups = res.data;
                setCup(cups.find((c: any) => c.id === cupId));
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
            const grouped = getGroupedTeams();
            // 2. Map group+number to teamId
            const getTeamId = (group: string, num: number) => grouped[group][num - 1]?.id;
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
                    const team1Id = getTeamId(groupL, numL);
                    const team2Id = getTeamId(groupR, numR);
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
            const token = localStorage.getItem("adminToken");
            await Promise.all(games.map(game =>
                api.post(`?path=games`, game, { headers: { "Authorization": `Bearer ${token}` } })
            ));
            // 5. Update cup status
            await api.put(`?path=cups`, { ...cup, state: "Vorrunde" }, { headers: { "Authorization": `Bearer ${token}` } });
            setGameSuccess("Spiele erfolgreich erstellt und Status aktualisiert!");
            setShowStartTimeDialog(false);
            // Refresh cup data
            api.get(`?path=cups`).then(res => {
                const cups = res.data;
                setCup(cups.find((c: any) => c.id === cupId));
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
            const token = localStorage.getItem("adminToken");
            
            // 1. Get all Vorrunde games with their results
            const gamesRes = await api.get(`?path=games`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const vorrundeGames = gamesRes.data.filter((g: any) => g.round === 'Vorrunde');
            
            // 2. Get all teams
            const teamsRes = await api.get(`?path=teams`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const allTeams = teamsRes.data.filter((t: any) => t.icke_cup_id === cupId);
            
            // 3. Evaluate games and calculate team performance
            const teamStats: Record<string, any> = {};
            allTeams.forEach((team: any) => {
                teamStats[team.id] = {
                    id: team.id,
                    name: team.name,
                    roundsWon: 0,
                    totalPoints: 0,
                    gamesPlayed: 0
                };
            });
            
            // Calculate stats for each team
            vorrundeGames.forEach((game: any) => {
                const team1Stats = teamStats[game.team_1_id];
                const team2Stats = teamStats[game.team_2_id];
                
                if (team1Stats && team2Stats) {
                    team1Stats.gamesPlayed++;
                    team2Stats.gamesPlayed++;
                    
                    // Calculate rounds won and total points
                    const round1Team1Won = game.round1_winner === game.team_1_id;
                    const round2Team1Won = game.round2_winner === game.team_1_id;
                    const round1Team2Won = game.round1_winner === game.team_2_id;
                    const round2Team2Won = game.round2_winner === game.team_2_id;
                    
                    if (round1Team1Won) team1Stats.roundsWon++;
                    if (round2Team1Won) team1Stats.roundsWon++;
                    if (round1Team2Won) team2Stats.roundsWon++;
                    if (round2Team2Won) team2Stats.roundsWon++;
                    
                    team1Stats.totalPoints += (parseInt(game.round1_points_team_1) || 0) + (parseInt(game.round2_points_team_1) || 0);
                    team2Stats.totalPoints += (parseInt(game.round1_points_team_2) || 0) + (parseInt(game.round2_points_team_2) || 0);
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
                
                // Sort by rounds won, then by total points
                groupTeamAssignments.sort((a: any, b: any) => {
                    if (a.roundsWon !== b.roundsWon) return b.roundsWon - a.roundsWon;
                    if (a.totalPoints !== b.totalPoints) return b.totalPoints - a.totalPoints;
                    return 0; // Could add head-to-head comparison here
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
                    if (a.roundsWon !== b.roundsWon) return b.roundsWon - a.roundsWon;
                    if (a.totalPoints !== b.totalPoints) return b.totalPoints - a.totalPoints;
                    return 0;
                });
                
                standingGroupResults[group.name] = groupTeamAssignments;
            });
            
            // 5. Calculate points for each team
            const teamPoints: Record<string, number> = {};
            
            // Sitting tournament points: 1st=11, 2nd=9, 3rd=7, 4th=5
            Object.values(sittingGroupResults).forEach(groupTeams => {
                groupTeams.forEach((team: any, index) => {
                    const points = [11, 9, 7, 5][index] || 0;
                    teamPoints[team.id] = (teamPoints[team.id] || 0) + points;
                });
            });
            
            // Standing tournament points: 1st=10, 2nd=8, 3rd=6, 4th=4
            Object.values(standingGroupResults).forEach(groupTeams => {
                groupTeams.forEach((team: any, index) => {
                    const points = [10, 8, 6, 4][index] || 0;
                    teamPoints[team.id] = (teamPoints[team.id] || 0) + points;
                });
            });
            
            // 6. Create final ranking
            const finalRanking = Object.entries(teamPoints)
                .map(([teamId, points]) => ({
                    teamId,
                    points,
                    ...teamStats[teamId]
                }))
                .sort((a, b) => b.points - a.points);
            
            // 7. Create new tournaments for Finalrunde
            const finalrundeSittingTournamentId = uuidv4();
            const finalrundeStandingTournamentId = uuidv4();
            
            await Promise.all([
                api.post(`?path=tournaments`, { 
                    id: finalrundeSittingTournamentId, 
                    icke_cup_id: cupId, 
                    sitting: 1 
                }, { headers: { "Authorization": `Bearer ${token}` } }),
                api.post(`?path=tournaments`, { 
                    id: finalrundeStandingTournamentId, 
                    icke_cup_id: cupId, 
                    sitting: 0 
                }, { headers: { "Authorization": `Bearer ${token}` } })
            ]);
            
            // 8. Create new groups E, F, G, H
            const groupE = finalRanking.slice(0, 4);
            const groupF = finalRanking.slice(4, 8);
            const groupG = finalRanking.slice(8, 12);
            const groupH = finalRanking.slice(12, 16);
            
            // Create groups in database
            const groupEId = uuidv4();
            const groupFId = uuidv4();
            const groupGId = uuidv4();
            const groupHId = uuidv4();
            
            await Promise.all([
                api.post(`?path=groups`, { id: groupEId, tournament_id: finalrundeSittingTournamentId, name: 'E' }, { headers: { "Authorization": `Bearer ${token}` } }),
                api.post(`?path=groups`, { id: groupFId, tournament_id: finalrundeSittingTournamentId, name: 'F' }, { headers: { "Authorization": `Bearer ${token}` } }),
                api.post(`?path=groups`, { id: groupGId, tournament_id: finalrundeStandingTournamentId, name: 'G' }, { headers: { "Authorization": `Bearer ${token}` } }),
                api.post(`?path=groups`, { id: groupHId, tournament_id: finalrundeStandingTournamentId, name: 'H' }, { headers: { "Authorization": `Bearer ${token}` } })
            ]);
            
            // 9. Assign teams to new groups
            const groupAssignments = [
                ...groupE.map(team => ({ group_id: groupEId, team_id: team.teamId })),
                ...groupF.map(team => ({ group_id: groupFId, team_id: team.teamId })),
                ...groupG.map(team => ({ group_id: groupGId, team_id: team.teamId })),
                ...groupH.map(team => ({ group_id: groupHId, team_id: team.teamId }))
            ];
            
            await Promise.all(groupAssignments.map(assignment =>
                api.post(`?path=group_teams`, assignment, { headers: { "Authorization": `Bearer ${token}` } })
            ));
            
            // 10. Create final round games
            const finalGames = [];
            let start = new Date();
            const [h, m] = finalrundeStartTime.split(":");
            start.setHours(Number(h), Number(m), 0, 0);
            
            // Create a mapping of group names to their team assignments
            const groupTeamMap: Record<string, any[]> = {
                'E': groupAssignments.filter(gt => gt.group_id === groupEId),
                'F': groupAssignments.filter(gt => gt.group_id === groupFId),
                'G': groupAssignments.filter(gt => gt.group_id === groupGId),
                'H': groupAssignments.filter(gt => gt.group_id === groupHId)
            };
            
            const getTeamIdFromGroup = (groupName: string, position: number) => {
                const groupTeams = groupTeamMap[groupName];
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
                    
                    const team1Id = getTeamIdFromGroup(groupL, numL);
                    const team2Id = getTeamIdFromGroup(groupR, numR);
                    
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
                api.post(`?path=games`, game, { headers: { "Authorization": `Bearer ${token}` } })
            ));
            
            // 11. Update cup status
            await api.put(`?path=cups`, { ...cup, state: "Finalrunde" }, { headers: { "Authorization": `Bearer ${token}` } });
            
            setGameSuccess("Finalrunde erfolgreich erstellt!");
            setShowFinalrundeDialog(false);
            
            // Refresh cup data
            api.get(`?path=cups`).then(res => {
                const cups = res.data;
                setCup(cups.find((c: any) => c.id === cupId));
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
            const token = localStorage.getItem("adminToken");
            // 1. Get all Vorrunde and Finalrunde games
            const gamesRes = await api.get(`?path=games`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const vorrundeGames = gamesRes.data.filter((g: any) => g.round === 'Vorrunde');
            const finalrundeGames = gamesRes.data.filter((g: any) => g.round === 'Finalrunde');
            // 2. Get all teams
            const teamsRes = await api.get(`?path=teams`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const allTeams = teamsRes.data.filter((t: any) => t.icke_cup_id === cupId);
            // 3. Get all groups and group_teams for Finalrunde
            const groupsRes = await api.get(`?path=groups`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const groupTeamsRes = await api.get(`?path=group_teams`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const finalGroups = groupsRes.data.filter((g: any) => ['E','F','G','H'].includes(g.name));
            const groupTeams = groupTeamsRes.data;
            // 4. Reconstruct Vorrunde ranking (same as in handleCreateFinalrunde)
            const teamStats: Record<string, any> = {};
            allTeams.forEach((team: any) => {
                teamStats[team.id] = {
                    id: team.id,
                    name: team.name,
                    contact: team.contact,
                    roundsWon: 0,
                    totalPoints: 0,
                    gamesPlayed: 0
                };
            });
            vorrundeGames.forEach((game: any) => {
                const team1Stats = teamStats[game.team_1_id];
                const team2Stats = teamStats[game.team_2_id];
                if (team1Stats && team2Stats) {
                    team1Stats.gamesPlayed++;
                    team2Stats.gamesPlayed++;
                    const round1Team1Won = game.round1_winner === game.team_1_id;
                    const round2Team1Won = game.round2_winner === game.team_1_id;
                    const round1Team2Won = game.round1_winner === game.team_2_id;
                    const round2Team2Won = game.round2_winner === game.team_2_id;
                    if (round1Team1Won) team1Stats.roundsWon++;
                    if (round2Team1Won) team1Stats.roundsWon++;
                    if (round1Team2Won) team2Stats.roundsWon++;
                    if (round2Team2Won) team2Stats.roundsWon++;
                    team1Stats.totalPoints += (parseInt(game.round1_points_team_1) || 0) + (parseInt(game.round2_points_team_1) || 0);
                    team2Stats.totalPoints += (parseInt(game.round1_points_team_2) || 0) + (parseInt(game.round2_points_team_2) || 0);
                }
            });
            // Vorrunde ranking
            const vorrundeRanking = Object.values(teamStats)
                .sort((a: any, b: any) => {
                    if (a.roundsWon !== b.roundsWon) return b.roundsWon - a.roundsWon;
                    if (a.totalPoints !== b.totalPoints) return b.totalPoints - a.totalPoints;
                    return 0;
                });
            // Vorrunde group mapping
            const vorrundeGroups: Record<string, string> = {};
            vorrundeRanking.forEach((team: any, idx: number) => {
                if (idx < 4) vorrundeGroups[team.id] = 'E';
                else if (idx < 8) vorrundeGroups[team.id] = 'F';
                else if (idx < 12) vorrundeGroups[team.id] = 'G';
                else vorrundeGroups[team.id] = 'H';
            });
            // 5. Evaluate Finalrunde group results
            const finalTeamStats: Record<string, any> = {};
            allTeams.forEach((team: any) => {
                finalTeamStats[team.id] = {
                    id: team.id,
                    name: team.name,
                    contact: team.contact,
                    roundsWon: 0,
                    totalPoints: 0,
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
                    if (round1Team1Won) team1Stats.roundsWon++;
                    if (round2Team1Won) team1Stats.roundsWon++;
                    if (round1Team2Won) team2Stats.roundsWon++;
                    if (round2Team2Won) team2Stats.roundsWon++;
                    team1Stats.totalPoints += (parseInt(game.round1_points_team_1) || 0) + (parseInt(game.round2_points_team_1) || 0);
                    team2Stats.totalPoints += (parseInt(game.round1_points_team_2) || 0) + (parseInt(game.round2_points_team_2) || 0);
                }
            });
            // 6. For each group, sort by Finalrunde performance and assign final_place offset
            const groupOffsets = { E: 0, F: 4, G: 8, H: 12 };
            const finalPlaceUpdates: any[] = [];
            (['E','F','G','H'] as (keyof typeof groupOffsets)[]).forEach((groupName) => {
                // Get all team ids in this group (from Vorrunde mapping)
                const groupTeamIds = Object.entries(vorrundeGroups)
                    .filter(([teamId, g]) => g === groupName)
                    .map(([teamId]) => teamId);
                // Get stats for these teams
                const groupStats = groupTeamIds.map(id => finalTeamStats[id]);
                // Sort by Finalrunde performance
                groupStats.sort((a: any, b: any) => {
                    if (a.roundsWon !== b.roundsWon) return b.roundsWon - a.roundsWon;
                    if (a.totalPoints !== b.totalPoints) return b.totalPoints - a.totalPoints;
                    return 0;
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
            // 7. Update all teams with their final_place
            await Promise.all(finalPlaceUpdates.map(team =>
                api.put(`?path=teams`, team, {
                    headers: { "Authorization": `Bearer ${token}` }
                })
            ));
            // 8. Update cup status to 'Abgeschlossen'
            await api.put(`?path=cups`, { ...cup, state: "Abgeschlossen" }, { headers: { "Authorization": `Bearer ${token}` } });
            setGameSuccess("Turnier abgeschlossen und Platzierungen gespeichert!");
            // Refresh cup data
            api.get(`?path=cups`).then(res => {
                const cups = res.data;
                setCup(cups.find((c: any) => c.id === cupId));
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
                    <TeamsTabContent cupId={typeof cupId === 'string' ? cupId : ''} cup={cup} />
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
                {/* Add more TabsContent for other tabs as needed */}
            </Tabs>
            {/* Step 1: Proceed to Vorrunde button */}
            
        </div>
    );
}
