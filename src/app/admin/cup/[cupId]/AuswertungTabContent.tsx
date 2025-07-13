import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default function AuswertungTabContent({ cupId, teams }: { cupId: string, teams: any[] }) {
    console.log(teams);
    return (
        <div className="mb-4">
            <h2 className="text-lg font-semibold">Endplatzierungen</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Platz</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Kontakt</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {teams
                        .filter((t: any) => t.icke_cup_id === cupId)
                        .filter((t: any) => t.final_place != null && t.final_place !== '')
                        .sort((a: any, b: any) => Number(a.final_place) - Number(b.final_place))
                        .map((team: any) => (
                            <TableRow key={team.id}>
                                <TableCell>{team.final_place}</TableCell>
                                <TableCell>{team.name}</TableCell>
                                <TableCell>{team.contact}</TableCell>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </div>
    );
} 