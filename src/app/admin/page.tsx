"use client";

import AdminPanel from "@/components/AdminPanel";
import { useState } from "react";

export default function AdminPage() {
    const [authorized, setAuthorized] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const checkPassword = () => {
        if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
            setAuthorized(true);
        } else {
            setError("Falsches Passwort! Probier's nochmal!");
        }
    }

    if (!authorized) {
        return (
            <div>
                <h1>Admin Login</h1>
                <input 
                    type="password"
                    placeholder="Admin Passwort..."
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className=""/>
                <button onClick={checkPassword} className="">
                    Login
                </button>
                {error && <p className="">{error}</p>}
            </div>
        );
    }

    return <AdminPanel />
}