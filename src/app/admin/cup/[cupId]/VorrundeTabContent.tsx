import { useEffect, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import api from "@/lib/api";

export default function VorrundeTabContent({ cupId }: { cupId: string }) {
    const [games, setGames] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get(`?path=games`),
            api.get(`?path=teams`)
        ]).then(([gamesRes, teamsRes]) => {
            const teams = teamsRes.data.filter((t: any) => t.icke_cup_id === cupId);
            const teamMap = Object.fromEntries(teams.map((t: any) => [t.id, t.name]));
            // Filter by cupId and Vorrunde
            const filtered = gamesRes.data.filter((g: any) => g.round === 'Vorrunde');
            // Map team IDs to names
            const mapped = filtered.map((g: any) => ({
                ...g,
                teamA: teamMap[g.team_1_id] || g.team_1_id,
                teamB: teamMap[g.team_2_id] || g.team_2_id,
                time: g.start_at ? new Date(g.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
            }));
            // Sort by time ascending
            mapped.sort((a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
            setGames(mapped);
            setTeams(teams);
        }).finally(() => setLoading(false));
    }, [cupId]);
    if (loading) return <div>Lade Spiele...</div>;
    if (games.length === 0) return <div>Keine Vorrundenspiele gefunden.</div>;
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Team A</TableHead>
                    <TableHead>Team B</TableHead>
                    <TableHead>Zeit</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {games.map(game => (
                    <TableRow key={game.id}>
                        <TableCell>{game.teamA}</TableCell>
                        <TableCell>{game.teamB}</TableCell>
                        <TableCell>{game.time}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
} 