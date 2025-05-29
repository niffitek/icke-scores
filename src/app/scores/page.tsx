export default function ScoresPage() {
    return (
      <section>
        <h1 className="text-xl font-semibold mb-4">Team Standings</h1>
        {/* Replace with table or list of team scores */}
        <ul className="space-y-2">
          {/* {teams.map(team => ( ... ))} */}
          <li className="bg-white rounded-lg shadow p-4 flex justify-between">
            <span>Team Name</span>
            <span>Wins - Losses</span>
          </li>
        </ul>
      </section>
    );
  }