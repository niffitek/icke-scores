"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { FaPen, FaTrash } from "react-icons/fa";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";

export default function AdminPage() {
    const [loading, setLoading] = useState(true);
    const [cups, setCups] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newCup, setNewCup] = useState({ title: "", address: "" });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");
    const titleRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useAdminAuth();

    useEffect(() => {
        // Only for SSR hydration flicker prevention
        setLoading(false);
        api.get("?path=cups").then(res => setCups(res.data));
    }, []);

    const handleCreateCup = async () => {
        setCreating(true);
        setCreateError("");
        const token = localStorage.getItem("adminToken");
        const id = uuidv4();
        const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const body = { id, created_at, ...newCup, state: "Bevorstehend" };
        try {
            await api.post("?path=cups", body, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });
            setShowCreate(false);
            setNewCup({ title: "", address: "" });
            // Refresh cups
            api.get("?path=cups").then(res => setCups(res.data));
        } catch (e) {
            setCreateError("Fehler beim Anlegen des Cups");
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteCup = async (cupId: string) => {
        if (!window.confirm("Willst du diesen Cup wirklich löschen? Alle zugehörigen Daten werden entfernt!")) return;
        setCreating(true);
        setCreateError("");
        const token = localStorage.getItem("adminToken");
        try {
            await api.delete(`?path=cups&id=${cupId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });
            // Refresh cups
            api.get("?path=cups").then(res => setCups(res.data));
        } catch (e) {
            setCreateError("Fehler beim Löschen des Cups");
        } finally {
            setCreating(false);
        }
    };

    if (loading) return null;

    return (
        <div className="flex flex-col items-center justify-center bg-white rounded-md p-4 gap-4">
            <div className="flex flex-row justify-between w-full items-center">
                <h1 className="text-xl font-bold">Alle Cups</h1>
                <Button className="self-end mb-2" onClick={() => setShowCreate(true)}>
                    Neuen Cup anlegen
                </Button>
            </div>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Neuen Cup anlegen</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-2">
                        <Input
                            ref={titleRef}
                            placeholder="Titel"
                            value={newCup.title}
                            onChange={e => setNewCup({ ...newCup, title: e.target.value })}
                        />
                        <Input
                            placeholder="Adresse"
                            value={newCup.address}
                            onChange={e => setNewCup({ ...newCup, address: e.target.value })}
                        />
                        {createError && <p className="text-red-500 text-sm">{createError}</p>}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreateCup} disabled={creating || !newCup.title || !newCup.address}>
                            {creating ? "Anlegen..." : "Anlegen"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Titel</TableHead>
                        <TableHead>Adresse</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12 text-right"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {cups.map((cup: any) => (
                        <TableRow key={cup.id}>
                            <TableCell>{cup.title}</TableCell>
                            <TableCell>{cup.address}</TableCell>
                            <TableCell>{cup.state}</TableCell>
                            <TableCell className="text-right">
                                <Link href={`/admin/cup/${cup.id}`}>
                                    <Button variant="outline" size="icon" className="p-2 mr-2">
                                        <FaPen />
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="p-2"
                                    onClick={() => handleDeleteCup(cup.id)}
                                    disabled={creating}
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