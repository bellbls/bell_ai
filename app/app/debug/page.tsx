"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DebugPage() {
    const networks = useQuery(api.networkManagement.getAllNetworks, {});
    const alerts = useQuery(api.adminAlerts.getAllAlerts, { limit: 10 });

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Debug Info</h1>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">Networks ({networks?.length || 0})</h2>
                <pre className="bg-gray-100 p-4 rounded overflow-auto">
                    {JSON.stringify(networks, null, 2)}
                </pre>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Alerts ({alerts?.length || 0})</h2>
                <pre className="bg-gray-100 p-4 rounded overflow-auto">
                    {JSON.stringify(alerts, null, 2)}
                </pre>
            </div>
        </div>
    );
}
