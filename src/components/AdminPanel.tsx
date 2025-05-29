'use client';

import { useEffect, useState } from "react";

interface MatchResult {
    matchId: string;
    scoreA: number;
    scoreB: number;
}

export default function AdminPanel() {
    const [results, setResults] = useState<MatchResult[]>([]);
    const [round, setRound] = useState<number>(1);

    useEffect(() => {
        // TODO: fetch state
    }, [])

    const handleChange = (matchId: string, field: 'scoreA' | 'scoreB', value: number) => {
        setResults(rs => rs.map(r => r.matchId === matchId ? { ...r, [field]: value } : r))
    }

    const doAction = async (path: string, body?: any) => {
        await fetch(`/api/admin/${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''
          },
          body: body ? JSON.stringify(body) : undefined
        });
      };
    
    return (
    <div className="p-4">
        <h1 className="text-2xl mb-4">Admin Ansicht - Runde {round}</h1>
        {results.map(r => (
        <div key={r.matchId} className="flex items-center mb-2">
            <span className="w-24">Match {r.matchId}</span>
            <input
            type="number"
            value={r.scoreA}
            onChange={e => handleChange(r.matchId, 'scoreA', +e.target.value)}
            className="border px-2 py-1 mr-2"
            />
            <span>vs</span>
            <input
            type="number"
            value={r.scoreB}
            onChange={e => handleChange(r.matchId, 'scoreB', +e.target.value)}
            className="border px-2 py-1 ml-2"
            />
        </div>
        ))}
        <button onClick={() => doAction('results', { round, results })} className="bg-blue-500 text-white px-4 py-2 rounded mr-2">
        Save Results
        </button>
        <button onClick={() => doAction('next')} className="bg-green-500 text-white px-4 py-2 rounded mr-2">
        Start Next Round
        </button>
        <button onClick={() => doAction('end')} className="bg-red-500 text-white px-4 py-2 rounded">
        End Tournament
        </button>
    </div>
    );
}