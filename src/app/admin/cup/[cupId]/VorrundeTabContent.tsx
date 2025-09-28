import { useEffect, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FaPen } from "react-icons/fa";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function VorrundeTabContent({ cupId }: { cupId: string }) {
    const [games, setGames] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editGame, setEditGame] = useState<any>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setLoading(true);
        const token = localStorage.getItem("adminToken");
        Promise.all([
            api.get(`?path=games`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            }),
            api.get(`?path=teams`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            })
        ]).then(([gamesRes, teamsRes]) => {
            const teams = teamsRes.data.filter((t: any) => t.icke_cup_id === cupId);
            const teamMap = Object.fromEntries(teams.map((t: any) => [t.id, t.name]));

            // Filter by cupId and Vorrunde
            const filtered = gamesRes.data.filter((g: any) =>
                g.round === 'Vorrunde' && g.icke_cup_id === cupId
            );

            // Map team IDs to names and calculate game results
            const mapped = filtered.map((g: any) => {
                const round1Won = g.round1_winner === g.team_1_id ? 1 : g.round1_winner === g.team_2_id ? 0 : null;
                const round2Won = g.round2_winner === g.team_1_id ? 1 : g.round2_winner === g.team_2_id ? 0 : null;

                // Calculate total points
                const totalPointsTeam1 = (parseInt(g.round1_points_team_1, 10) || 0) + (parseInt(g.round2_points_team_1, 10) || 0);
                const totalPointsTeam2 = (parseInt(g.round1_points_team_2, 10) || 0) + (parseInt(g.round2_points_team_2, 10) || 0);

                // Determine game winner (best of 2 rounds)
                let gameWinner = null;
                if (totalPointsTeam1 === totalPointsTeam2) {
                    gameWinner = null;
                } else {
                    gameWinner = totalPointsTeam1 > totalPointsTeam2 ? g.team_1_id : g.team_2_id;
                }

                return {
                    ...g,
                    teamA: teamMap[g.team_1_id] || g.team_1_id,
                    teamB: teamMap[g.team_2_id] || g.team_2_id,
                    time: g.start_at ? new Date(g.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                    round1Result: `${g.round1_points_team_1 || 0} : ${g.round1_points_team_2 || 0}`,
                    round2Result: `${g.round2_points_team_1 || 0} : ${g.round2_points_team_2 || 0}`,
                    totalResult: `${totalPointsTeam1} : ${totalPointsTeam2}`,
                    gameWinner: gameWinner ? teamMap[gameWinner] : 'Unentschieden',
                    round1Won,
                    round2Won,
                    totalPointsTeam1,
                    totalPointsTeam2
                };
            });
            // Sort by time ascending, then by court number
            mapped.sort((a: any, b: any) => {
                const timeA = new Date(a.start_at).getTime();
                const timeB = new Date(b.start_at).getTime();
                if (timeA !== timeB) {
                    return timeA - timeB;
                }
                // If times are equal, sort by court number
                return (a.court || 0) - (b.court || 0);
            });
            setGames(mapped);
            setTeams(teams);
        }).finally(() => setLoading(false));
    }, [cupId]);

    const handleEditGame = (game: any) => {
        setEditGame({
            ...game,
            round1_points_team_1: game.round1_points_team_1 || 0,
            round1_points_team_2: game.round1_points_team_2 || 0,
            round2_points_team_1: game.round2_points_team_1 || 0,
            round2_points_team_2: game.round2_points_team_2 || 0
        });
        setShowEditDialog(true);
    };

    const handleSaveGame = async () => {
        if (!editGame) return;

        setSaving(true);
        try {
            const token = localStorage.getItem("adminToken");

            // Get the rounds for this game
            const roundsRes = await api.get(`?path=rounds&game_id=${editGame.id}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });
            const rounds = roundsRes.data;

            // Update round 1
            if (rounds[0]) {
                await api.put(`?path=rounds`, {
                    id: rounds[0].id,
                    points_team_1: editGame.round1_points_team_1,
                    points_team_2: editGame.round1_points_team_2
                }, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                });
            }

            // Update round 2
            if (rounds[1]) {
                await api.put(`?path=rounds`, {
                    id: rounds[1].id,
                    points_team_1: editGame.round2_points_team_1,
                    points_team_2: editGame.round2_points_team_2
                }, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                });
            }

            setShowEditDialog(false);
            setEditGame(null);

            // Refresh games data
            const [gamesRes, teamsRes] = await Promise.all([
                api.get(`?path=games`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                }),
                api.get(`?path=teams`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                })
            ]);

            const teams = teamsRes.data.filter((t: any) => t.icke_cup_id === cupId);
            const teamMap = Object.fromEntries(teams.map((t: any) => [t.id, t.name]));

            const filtered = gamesRes.data.filter((g: any) =>
                g.round === 'Vorrunde' && g.icke_cup_id === cupId
            );

            const mapped = filtered.map((g: any) => {
                const round1Won = g.round1_winner === g.team_1_id ? 1 : g.round1_winner === g.team_2_id ? 0 : null;
                const round2Won = g.round2_winner === g.team_1_id ? 1 : g.round2_winner === g.team_2_id ? 0 : null;
                const totalPointsTeam1 = (parseInt(g.round1_points_team_1, 10) || 0) + (parseInt(g.round2_points_team_1, 10) || 0);
                const totalPointsTeam2 = (parseInt(g.round1_points_team_2, 10) || 0) + (parseInt(g.round2_points_team_2, 10) || 0);

                let gameWinner = null;
                if (totalPointsTeam1 === totalPointsTeam2) {
                    gameWinner = null;
                } else {
                    gameWinner = totalPointsTeam1 > totalPointsTeam2 ? g.team_1_id : g.team_2_id;
                }

                return {
                    ...g,
                    teamA: teamMap[g.team_1_id] || g.team_1_id,
                    teamB: teamMap[g.team_2_id] || g.team_2_id,
                    time: g.start_at ? new Date(g.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                    round1Result: `${g.round1_points_team_1 || 0} : ${g.round1_points_team_2 || 0}`,
                    round2Result: `${g.round2_points_team_1 || 0} : ${g.round2_points_team_2 || 0}`,
                    totalResult: `${totalPointsTeam1} : ${totalPointsTeam2}`,
                    gameWinner: gameWinner ? teamMap[gameWinner] : 'Unentschieden',
                    round1Won,
                    round2Won,
                    totalPointsTeam1,
                    totalPointsTeam2
                };
            });
            mapped.sort((a: any, b: any) => {
                const timeA = new Date(a.start_at).getTime();
                const timeB = new Date(b.start_at).getTime();
                if (timeA !== timeB) {
                    return timeA - timeB;
                }
                // If times are equal, sort by court number
                return (a.court || 0) - (b.court || 0);
            });
            setGames(mapped);
        } catch (error) {
            console.error('Error saving game:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Lade Spiele...</div>;
    if (games.length === 0) return <div>Keine Vorrundenspiele gefunden.</div>;

    return (
        <>
            <div className="flex flex-row justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Vorrundenspiele</h2>
            </div>

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Spiel auswerten</DialogTitle>
                    </DialogHeader>
                    {editGame && (
                        <div className="flex flex-col gap-4">
                            <div className="text-center font-medium mb-2">
                                {editGame.teamA} vs {editGame.teamB}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Runde 1</label>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            type="number"
                                            min="0"
                                            value={editGame.round1_points_team_1}
                                            onChange={e => setEditGame({
                                                ...editGame,
                                                round1_points_team_1: parseInt(e.target.value) || 0
                                            })}
                                            className="w-20"
                                        />
                                        <span className="text-sm">:</span>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={editGame.round1_points_team_2}
                                            onChange={e => setEditGame({
                                                ...editGame,
                                                round1_points_team_2: parseInt(e.target.value) || 0
                                            })}
                                            className="w-20"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Runde 2</label>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            type="number"
                                            min="0"
                                            value={editGame.round2_points_team_1}
                                            onChange={e => setEditGame({
                                                ...editGame,
                                                round2_points_team_1: parseInt(e.target.value) || 0
                                            })}
                                            className="w-20"
                                        />
                                        <span className="text-sm">:</span>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={editGame.round2_points_team_2}
                                            onChange={e => setEditGame({
                                                ...editGame,
                                                round2_points_team_2: parseInt(e.target.value) || 0
                                            })}
                                            className="w-20"
                                        />
                                    </div>
                                </div>

                                <div className="text-center text-sm text-gray-600">
                                    Gesamt: {parseInt(editGame.round1_points_team_1, 10) + parseInt(editGame.round2_points_team_1, 10)} : {parseInt(editGame.round1_points_team_2, 10) + parseInt(editGame.round2_points_team_2, 10)}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={saving}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleSaveGame} disabled={saving}>
                            {saving ? "Speichern..." : "Speichern"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Team A</TableHead>
                        <TableHead>Team B</TableHead>
                        <TableHead>Zeit</TableHead>
                        <TableHead>Feld</TableHead>
                        <TableHead>Runde 1</TableHead>
                        <TableHead>Runde 2</TableHead>
                        <TableHead>Gesamt</TableHead>
                        <TableHead>Gewinner</TableHead>
                        <TableHead className="w-12 text-right"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {games.map(game => (
                        <TableRow key={game.id}>
                            <TableCell>{game.teamA}</TableCell>
                            <TableCell>{game.teamB}</TableCell>
                            <TableCell>{game.time}</TableCell>
                            <TableCell>{game.court || '-'}</TableCell>
                            <TableCell>{game.round1Result}</TableCell>
                            <TableCell>{game.round2Result}</TableCell>
                            <TableCell>{game.totalResult}</TableCell>
                            <TableCell>{game.gameWinner}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="p-2"
                                    onClick={() => handleEditGame(game)}
                                >
                                    <FaPen />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </>
    );
}