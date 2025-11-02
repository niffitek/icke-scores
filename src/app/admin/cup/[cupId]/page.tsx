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

import GamesService from "@/services/games";
import RankingService from "@/services/ranking";


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
            await refreshTeams();
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
                        icke_cup_id: cupId,
                        round: "Vorrunde",
                        sitting: COURT_TYPE[court] ? 1 : 0,
                        court: court + 1
                    });
                }
            }
            console.log(games);
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
            const allGames = await GamesService.getGamesByCupId(cupId as string);
            const vorrundeGames = allGames.filter((g: any) => g.round === 'Vorrunde');
            
            // 2. Get all teams
            const teamsRes = await TeamsService.getTeamsByCupId(cupId as string);
            const allTeams = teamsRes.filter((t: any) => t.icke_cup_id === cupId);
            
            let teamStats: Record<string, any> = RankingService.getAllTeamStats(allTeams, groupTeams);
            
            // 4. Get all groups for this cup and evaluate each group
            const cupGroups = await GroupsService.getGroupsByCupId(cupId as string);

            teamStats = RankingService.fillAllTeamStats(teamStats, vorrundeGames, cupGroups, groupTeams);

            // 7. Create new groups E, F, G, H based on final ranking (Group E: 1st of Groups A/B/C/D, Group F: 2nd of Groups A/B/C/D, Group G: 3rd of Groups A/B/C/D, Group H: 4th of Groups A/B/C/D)
            // First, get the group IDs for A, B, C, D
            const groupA = cupGroups.find((g: any) => g.name === 'A');
            const groupB = cupGroups.find((g: any) => g.name === 'B');
            const groupC = cupGroups.find((g: any) => g.name === 'C');
            const groupD = cupGroups.find((g: any) => g.name === 'D');

            const groupARanking = RankingService.sortTeamStatsByGroup(teamStats, groupTeams, groupA?.id, vorrundeGames);
            const groupBRanking = RankingService.sortTeamStatsByGroup(teamStats, groupTeams, groupB?.id, vorrundeGames);
            const groupCRanking = RankingService.sortTeamStatsByGroup(teamStats, groupTeams, groupC?.id, vorrundeGames);
            const groupDRanking = RankingService.sortTeamStatsByGroup(teamStats, groupTeams, groupD?.id, vorrundeGames);
            console.log(groupARanking, groupBRanking, groupCRanking, groupDRanking);

            const groupE = [groupARanking[0], groupBRanking[0], groupCRanking[0], groupDRanking[0]].filter(Boolean);
            const groupF = [groupARanking[1], groupBRanking[1], groupCRanking[1], groupDRanking[1]].filter(Boolean);
            const groupG = [groupARanking[2], groupBRanking[2], groupCRanking[2], groupDRanking[2]].filter(Boolean);
            const groupH = [groupARanking[3], groupBRanking[3], groupCRanking[3], groupDRanking[3]].filter(Boolean);
            console.log(groupE, groupF, groupG, groupH);

            // Create groups in database
            const groupEId = uuidv4();
            const groupFId = uuidv4();
            const groupGId = uuidv4();
            const groupHId = uuidv4();

            await Promise.all([
                GroupsService.createGroup({ id: groupEId, icke_cup_id: cupId, name: 'E' }),
                GroupsService.createGroup({ id: groupFId, icke_cup_id: cupId, name: 'F' }),
                GroupsService.createGroup({ id: groupGId, icke_cup_id: cupId, name: 'G' }),
                GroupsService.createGroup({ id: groupHId, icke_cup_id: cupId, name: 'H' })
            ]);
            
            // 8. Assign teams to new groups
            const groupAssignments = [
                ...groupE.map((team: any) => ({ group_id: groupEId, team_id: team.id })),
                ...groupF.map((team: any) => ({ group_id: groupFId, team_id: team.id })),
                ...groupG.map((team: any) => ({ group_id: groupGId, team_id: team.id })),
                ...groupH.map((team: any) => ({ group_id: groupHId, team_id: team.id }))
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
                        icke_cup_id: cupId,
                        round: "Finalrunde",
                        sitting: COURT_TYPE[court] ? 1 : 0,
                        court: court + 1
                    });
                }
            }
            
            // Save final games
            // await Promise.all(finalGames.map(game =>
            //     GamesService.createGame(game)
            // ));
            
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
            // 1. Get all Finalrunde games with their results
            const allGames = await GamesService.getGamesByCupId(cupId as string);
            const finalrundeGames = allGames.filter((g: any) => g.round === 'Finalrunde');
            
            // 2. Get all teams
            const teamsRes = await TeamsService.getTeamsByCupId(cupId as string);
            const allTeams = teamsRes.filter((t: any) => t.icke_cup_id === cupId);
            
            let teamStats: Record<string, any> = RankingService.getAllTeamStats(allTeams, groupTeams);
            
            const cupGroups = await GroupsService.getGroupsByCupId(cupId as string);

            teamStats = RankingService.fillAllTeamStats(teamStats, finalrundeGames, cupGroups, groupTeams);

            // First, get the group IDs for E, F, G, H
            const groupE = cupGroups.find((g: any) => g.name === 'E');
            const groupF = cupGroups.find((g: any) => g.name === 'F');
            const groupG = cupGroups.find((g: any) => g.name === 'G');
            const groupH = cupGroups.find((g: any) => g.name === 'H');

            // 3. For each group, sort by Finalrunde performance
            const groupERanking = RankingService.sortTeamStatsByGroup(teamStats, groupTeams, groupE?.id, finalrundeGames);
            const groupFRanking = RankingService.sortTeamStatsByGroup(teamStats, groupTeams, groupF?.id, finalrundeGames);
            const groupGRanking = RankingService.sortTeamStatsByGroup(teamStats, groupTeams, groupG?.id, finalrundeGames);
            const groupHRanking = RankingService.sortTeamStatsByGroup(teamStats, groupTeams, groupH?.id, finalrundeGames);

            const finalPlaceUpdates: any[] = [];

            // Assign final_place based on group rankings
            groupERanking.forEach((team: any, idx: number) => {
                const dbTeam = allTeams.find((t: any) => t.id === team.id);
                finalPlaceUpdates.push({
                    id: team.id,
                    name: dbTeam?.name || team.name,
                    contact: dbTeam?.contact || team.contact,
                    final_place: idx + 1
                });
            });

            groupFRanking.forEach((team: any, idx: number) => {
                const dbTeam = allTeams.find((t: any) => t.id === team.id);
                finalPlaceUpdates.push({
                    id: team.id,
                    name: dbTeam?.name || team.name,
                    contact: dbTeam?.contact || team.contact,
                    final_place: idx + 5
                });
            });

            groupGRanking.forEach((team: any, idx: number) => {
                const dbTeam = allTeams.find((t: any) => t.id === team.id);
                finalPlaceUpdates.push({
                    id: team.id,
                    name: dbTeam?.name || team.name,
                    contact: dbTeam?.contact || team.contact,
                    final_place: idx + 9
                });
            });

            groupHRanking.forEach((team: any, idx: number) => {
                const dbTeam = allTeams.find((t: any) => t.id === team.id);
                finalPlaceUpdates.push({
                    id: team.id,
                    name: dbTeam?.name || team.name,
                    contact: dbTeam?.contact || team.contact,
                    final_place: idx + 13
                });
            });

            console.log("Final Place Updates:", finalPlaceUpdates);

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
            setShowCloseTournamentDialog(false); 
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
                                    <Button variant="destructive" onClick={async () => { await handleEvaluateFinalrunde(); }}>Zur Auswertung</Button>
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
