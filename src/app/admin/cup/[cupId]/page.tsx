"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
    const [teams, setTeams] = useState<Team[]>([]);
    const [editing, setEditing] = useState(false);
    const [editCup, setEditCup] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [editTeam, setEditTeam] = useState<any>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [teamEditLoading, setTeamEditLoading] = useState(false);
    const [teamEditError, setTeamEditError] = useState("");
    const [teamDeleteLoading, setTeamDeleteLoading] = useState("");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newTeam, setNewTeam] = useState({ name: '', contact: '' });
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');

    useEffect(() => {
        api.get(`?path=cups`).then(res => {
            const cups = res.data;
            setCup(cups.find((c: any) => c.id === cupId));
        });
        api.get(`?path=teams`).then(res => {
            setTeams(res.data);
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

    const handleEditTeam = (team: any) => {
        setEditTeam({ ...team });
        setShowEditDialog(true);
        setTeamEditError("");
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
            setShowEditDialog(false);
            // Refresh teams
            api.get(`?path=teams`).then(res => setTeams(res.data));
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
        try {
            await api.post(`?path=teams`, {
                id: uuidv4(),
                name: newTeam.name,
                contact: newTeam.contact,
                place: teams.length + 1,
                icke_cup_id: cup.id,
            }, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });
            setShowCreateDialog(false);
            setNewTeam({ name: '', contact: '' });
            // Refresh teams
            api.get(`?path=teams`).then(res => setTeams(res.data));
        } catch (e) {
            setCreateError("Fehler beim Anlegen des Teams");
        } finally {
            setCreateLoading(false);
        }
    };

    if (!cup || !editCup) return <div>Lade Cup...</div>;

    return (
        <div className="max-w-xl mx-auto bg-white rounded-md p-4 mt-4">
            <div className="flex flex-row justify-between items-center mb-4">
                <div className="flex flex-row items-center gap-2">
                    <Button variant="ghost" size="icon" className="p-2" onClick={() => router.push('/admin')} aria-label="Zurück zur Übersicht">
                        <FaArrowLeft />
                    </Button>
                    <h1 className="text-xl font-bold">Cup Details</h1>
                </div>
                {!editing && <Button onClick={handleEdit}>Bearbeiten</Button>}
            </div>
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

            <div className="flex flex-row justify-between items-center mb-2">
                <h2 className="text-lg font-semibold mb-2">Teams</h2>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setShowCreateDialog(true)} disabled={teams.filter(t => t.icke_cup_id === cup.id).length >= 16}>
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
                        <TableHead className="w-24 text-right"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {teams.map((team: any) => (
                        <TableRow key={team.id}>
                            <TableCell>{team.name}</TableCell>
                            <TableCell>{team.contact}</TableCell>
                            <TableCell className="text-right">
                                <Dialog open={showEditDialog && editTeam?.id === team.id} onOpenChange={open => { if (!open) setShowEditDialog(false); }}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="icon" className="p-2 mr-2" onClick={() => handleEditTeam(team)}>
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
        </div>
    );
}
