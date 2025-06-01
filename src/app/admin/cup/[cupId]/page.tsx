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

const STATE_OPTIONS = [
    "Bevorstehend",
    "Vorrunde",
    "Endrunde",
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

    // Schedule as per your table
    const SCHEDULE = [
        ["A1-A4", "B2-B3", "C1-C2", "D1-D2", "C3-C4", "A2-A3"],
        ["D1-D3", "A2-A3", "B1-B4", "B2-B3", "D2-D4", "C1-C3"],
        ["C1-C3", "D2-D3", "A3-A4", "A1-A2", "B1-B4", "C2-C4"],
        ["B2-B4", "D2-D4", "C3-C4", "B1-B3", "D1-D3", "A1-A4"],
        ["A1-A3", "B1-B3", "C2-C4", "B2-B4", "A2-A4", "D1-D4"],
        ["D1-D2", "A1-A2", "B1-B2", "D3-D4", "C1-C2", "B3-B4"],
        ["C1-C4", "D3-D4", "A2-A4", "A1-A3", "B1-B2", "C2-C3"],
        ["D1-D4", "C2-C3", "B3-B4", "D2-D3", "C1-C4", "A3-A4"]
    ];
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
            for (let round = 0; round < SCHEDULE.length; round++) {
                const roundTime = new Date(start.getTime() + round * 30 * 60000);
                for (let court = 0; court < 6; court++) {
                    const match = SCHEDULE[round][court];
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
                {/* Add more TabsContent for other tabs as needed */}
            </Tabs>
            {/* Step 1: Proceed to Vorrunde button */}
            
        </div>
    );
}
