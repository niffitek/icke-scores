import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Team } from '@/types/tournament'

const AuswertungTabContent = ({ cupId, teams }: { cupId: string; teams: Team[] }) => {
  const placedTeams = teams
    .filter((team) => team.icke_cup_id === cupId)
    .filter((team) => team.final_place != null && team.final_place !== '')
    .sort((a, b) => Number(a.final_place) - Number(b.final_place))

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
          {placedTeams.map((team) => (
            <TableRow key={team.id}>
              <TableCell>{team.final_place}</TableCell>
              <TableCell>{team.name}</TableCell>
              <TableCell>{team.contact}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default AuswertungTabContent
