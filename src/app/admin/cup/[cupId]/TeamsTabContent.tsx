import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FaPen, FaTrash } from "react-icons/fa";
import { v4 as uuidv4 } from 'uuid';
import api from "@/lib/api";

export default function TeamsTabContent({ cupId, cup }: { cupId: string, cup: any }) {
    const [teams, setTeams] = useState<any[]>([]);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newTeam, setNewTeam] = useState({ name: '', contact: '' });
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');
    const [editTeam, setEditTeam] = useState<any>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [teamEditLoading, setTeamEditLoading] = useState(false);
    const [teamEditError, setTeamEditError] = useState('');
    const [teamDeleteLoading, setTeamDeleteLoading] = useState('');
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState('A');
    const [editSelectedGroup, setEditSelectedGroup] = useState('A');
    const [groupTeams, setGroupTeams] = useState<any[]>([]);

    useEffect(() => {
        api.get(`?path=tournaments`).then(res => {
            const ts = res.data.filter((t: any) => t.icke_cup_id === cup.id);
            setTournaments(ts);
            api.get(`?path=groups`).then(res2 => {
                setGroups(res2.data.filter((g: any) => ts.some((t: any) => t.id === g.tournament_id)));
            });
        });
        api.get(`?path=teams`).then(res => {
            setTeams(res.data);
        });
        api.get(`?path=group_teams`).then(res => {
            setGroupTeams(res.data);
        });
    }, [cupId]);

    const getTeamGroupName = (teamId: string) => {
        // Find the group assignment for this team in the first tournament
        const gt = groupTeams.find((gt: any) => gt.team_id === teamId);
        if (!gt) return '-';
        const group = groups.find((g: any) => g.id === gt.group_id);
        return group ? group.name : '-';
    };

    const handleSaveTeam = async () => {
        setTeamEditLoading(true);
        setTeamEditError("");
        const token = localStorage.getItem("adminToken");
        try {
            await api.put(`?path=teams`, {
                id: editTeam.id,
                name: editTeam.name,
                contact: editTeam.contact,
            }, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });
            // Remove old group assignments
            await api.delete(`?path=group_teams&team_id=${editTeam.id}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });
            // Assign to group in both tournaments
            for (const t of tournaments) {
                const group = groups.find((g: any) => g.tournament_id === t.id && g.name === editSelectedGroup);
                if (group) {
                    await api.post(`?path=group_teams`, {
                        group_id: group.id,
                        team_id: editTeam.id,
                    }, {
                        headers: {
                            "Authorization": `Bearer ${token}`,
                        },
                    });
                }
            }
            setShowEditDialog(false);
            // Refresh teams and groupTeams
            api.get(`?path=teams`).then(res => setTeams(res.data));
            api.get(`?path=group_teams`).then(res => setGroupTeams(res.data));
        } catch (e) {
            setTeamEditError("Fehler beim Speichern des Teams");
        } finally {
            setTeamEditLoading(false);
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (!window.confirm("Willst du dieses Team wirklich löschen?")) return;
        setTeamDeleteLoading(teamId);
        const token = localStorage.getItem("adminToken");
        try {
            await api.delete(`?path=teams&id=${teamId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });
            // Refresh teams
            api.get(`?path=teams`).then(res => setTeams(res.data));
        } catch (e) {
            alert("Fehler beim Löschen des Teams");
        } finally {
            setTeamDeleteLoading("");
        }
    };

    const handleCreateTeam = async () => {
        setCreateLoading(true);
        setCreateError('');
        const token = localStorage.getItem("adminToken");
        let newId = uuidv4();
        try {
            await api.post(`?path=teams`, {
                id: newId,
                name: newTeam.name,
                contact: newTeam.contact,
                place: teams.length + 1,
                icke_cup_id: cup.id,
            }, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });
            // Assign to group in both tournaments
            for (const t of tournaments) {
                const group = groups.find((g: any) => g.tournament_id === t.id && g.name === selectedGroup);
                if (group) {
                    await api.post(`?path=group_teams`, {
                        group_id: group.id,
                        team_id: newId,
                    }, {
                        headers: {
                            "Authorization": `Bearer ${token}`,
                        },
                    });
                }
            }
            setShowCreateDialog(false);
            setNewTeam({ name: '', contact: '' });
            // Refresh teams and groupTeams
            api.get(`?path=teams`).then(res => setTeams(res.data));
            api.get(`?path=group_teams`).then(res => setGroupTeams(res.data));
        } catch (e) {
            setCreateError("Fehler beim Anlegen des Teams");
        } finally {
            setCreateLoading(false);
        }
    };

    return (
        <>
            <div className="flex flex-row justify-between items-center mb-2">
                <h2 className="text-lg font-semibold mb-2">Teams</h2>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setShowCreateDialog(true)} disabled={teams.filter((t: any) => t.icke_cup_id === cup.id).length >= 16}>
                            Team anlegen
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Neues Team anlegen</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col gap-2">
                            <Input
                                placeholder="Name"
                                value={newTeam.name}
                                onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                            />
                            <Input
                                placeholder="Kontakt"
                                value={newTeam.contact}
                                onChange={e => setNewTeam({ ...newTeam, contact: e.target.value })}
                            />
                            <label className="font-medium">Gruppe
                                <select className="border rounded px-2 py-1 mt-1" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
                                    {['A','B','C','D'].map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </label>
                            {createError && <p className="text-red-500 text-sm">{createError}</p>}
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateTeam} disabled={createLoading || !newTeam.name}>
                                {createLoading ? "Anlegen..." : "Anlegen"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Kontakt</TableHead>
                        <TableHead>Gruppe</TableHead>
                        <TableHead className="w-24 text-right"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {teams
                        .filter((t: any) => t.icke_cup_id === cup.id)
                        .sort((a: any, b: any) => {
                            const groupOrder: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                            const groupA = getTeamGroupName(a.id);
                            const groupB = getTeamGroupName(b.id);
                            const orderA = groupOrder[groupA] !== undefined ? groupOrder[groupA] : 99;
                            const orderB = groupOrder[groupB] !== undefined ? groupOrder[groupB] : 99;
                            if (orderA !== orderB) return orderA - orderB;
                            return a.name.localeCompare(b.name);
                        })
                        .map((team: any) => (
                            <TableRow key={team.id}>
                                <TableCell>{team.name}</TableCell>
                                <TableCell>{team.contact}</TableCell>
                                <TableCell>{getTeamGroupName(team.id)}</TableCell>
                                <TableCell className="text-right">
                                    <Dialog open={showEditDialog && editTeam?.id === team.id} onOpenChange={open => { if (!open) setShowEditDialog(false); }}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="icon" className="p-2 mr-2" onClick={() => { setEditTeam({ ...team }); setShowEditDialog(true); setTeamEditError(""); }}>
                                                <FaPen />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Team bearbeiten</DialogTitle>
                                            </DialogHeader>
                                            <div className="flex flex-col gap-2">
                                                <Input
                                                    placeholder="Name"
                                                    value={editTeam?.name || ""}
                                                    onChange={e => setEditTeam({ ...editTeam, name: e.target.value })}
                                                />
                                                <Input
                                                    placeholder="Kontakt"
                                                    value={editTeam?.contact || ""}
                                                    onChange={e => setEditTeam({ ...editTeam, contact: e.target.value })}
                                                />
                                                <label className="font-medium">Gruppe
                                                    <select className="border rounded px-2 py-1 mt-1" value={editSelectedGroup} onChange={e => setEditSelectedGroup(e.target.value)}>
                                                        {['A','B','C','D'].map(g => <option key={g} value={g}>{g}</option>)}
                                                    </select>
                                                </label>
                                                {teamEditError && <p className="text-red-500 text-sm">{teamEditError}</p>}
                                            </div>
                                            <DialogFooter>
                                                <Button onClick={handleSaveTeam} disabled={teamEditLoading}>
                                                    {teamEditLoading ? "Speichern..." : "Speichern"}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="p-2"
                                        onClick={() => handleDeleteTeam(team.id)}
                                        disabled={teamDeleteLoading === team.id}
                                        aria-label="Löschen"
                                    >
                                        <FaTrash className="text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </>
    );
} 