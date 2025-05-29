export default function GamesPage() {
    return (
      <section>
        <h1 className="text-xl font-semibold mb-4">All Games</h1>
        {/* Replace with list or table of games, filterable by status */}
        <div className="space-y-2">
          {/* {games.map(game => ( ... ))} */}
          <div className="bg-white rounded-lg shadow p-4 flex justify-between">
            <div>
              <p className="font-medium">Team A vs Team B</p>
              <p className="text-sm text-gray-600">Date & Time</p>
            </div>
            <div className="text-right">
              <p className="text-sm">Status: Upcoming</p>
              <p className="text-xs text-gray-500">Court 1</p>
            </div>
          </div>
        </div>
      </section>
    );
  }