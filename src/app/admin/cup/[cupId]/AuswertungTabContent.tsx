import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errorMessage } from '@/lib/api'
import { buildCupSheets, downloadCupXlsx } from '@/services/export'
import { getGamesByCupId } from '@/services/games'
import { getGroupsByCupId } from '@/services/groups'
import { getGroupTeams } from '@/services/groupTeams'
import { getTeamsByCupId } from '@/services/teams'
import type { Cup, Team } from '@/types/tournament'

const AuswertungTabContent = ({ cup, teams }: { cup: Cup; teams: Team[] }) => {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const placedTeams = teams
    .filter((team) => team.icke_cup_id === cup.id)
    .filter((team) => team.final_place != null && team.final_place !== '')
    .sort((a, b) => Number(a.final_place) - Number(b.final_place))

  // Fetches fresh data so the export never lags behind the tab's state
  const handleExport = async () => {
    setExporting(true)
    setExportError('')
    try {
      const [allTeams, games, groups, groupTeams] = await Promise.all([
        getTeamsByCupId(cup.id),
        getGamesByCupId(cup.id),
        getGroupsByCupId(cup.id),
        getGroupTeams(),
      ])
      downloadCupXlsx(cup, buildCupSheets(allTeams, games, groups, groupTeams))
    } catch (err) {
      setExportError(errorMessage(err, 'Export fehlgeschlagen'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Endplatzierungen</h2>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exportiere…' : 'Excel-Export'}
        </Button>
      </div>
      {exportError && <p className="text-red-500 text-sm mb-2">{exportError}</p>}
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
