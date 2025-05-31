"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN;

export default function AdminLogin() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const checkPassword = () => {
        if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
            if (typeof window !== "undefined") {
                localStorage.setItem("adminAuthorized", "true");
                localStorage.setItem("adminToken", ADMIN_TOKEN || "");
            }
            router.replace("/admin");
        } else {
            setError("Falsches Passwort! Probier's nochmal!");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-[50vh]">
            <div className="flex flex-col items-center justify-center w-1/3 bg-white rounded-md p-4 gap-4">
                <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
                <Input
                    type="password"
                    placeholder="Admin Passwort..."
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <Button onClick={checkPassword}>Login</Button>
                {error && <p>{error}</p>}
            </div>
        </div>
    );
} 