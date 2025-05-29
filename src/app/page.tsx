export default function Home() {
  return (
    <section>
      <h1 className="text-xl font-semibold mb-4">Nächste Runde 14:15</h1>
      {/* Replace with a grid or list of court cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(6)].map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg shadow p-4 flex flex-col"
          >
            <h2 className="font-medium mb-2">Feld {idx + 1}</h2>
            <p className="text-sm text-gray-600">Next Game: -- vs. --</p>
            <p className="text-xs text-gray-500 mt-auto">Time: --:--</p>
          </div>
        ))}
      </div>
    </section>
  );
}
