"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

export default function MigrationPage() {
    const [result, setResult] = useState<any>(null);
    const [isRunning, setIsRunning] = useState(false);

    const runMigration = useMutation(api.migrations.migrateVRanksToBRanks);

    const handleMigrate = async () => {
        setIsRunning(true);
        try {
            const res = await runMigration({});
            setResult(res);
        } catch (error: any) {
            setResult({ success: false, error: error.message });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Database Migration</h1>

                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">V-Rank → B-Rank Migration</h2>
                    <p className="text-slate-400 mb-6">
                        This will update all existing data in the database:
                    </p>
                    <ul className="text-slate-400 mb-6 space-y-2">
                        <li>• Convert all user ranks (V0→B0, V1→B1, etc.)</li>
                        <li>• Update rank rules configuration</li>
                        <li>• Update required rank references</li>
                    </ul>

                    <button
                        onClick={handleMigrate}
                        disabled={isRunning}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isRunning ? "Running Migration..." : "Run Migration"}
                    </button>
                </div>

                {result && (
                    <div className={`bg-slate-900 rounded-2xl border ${result.success ? 'border-green-500' : 'border-red-500'} p-6`}>
                        <h3 className="text-lg font-bold mb-4">
                            {result.success ? "✅ Migration Complete!" : "❌ Migration Failed"}
                        </h3>

                        {result.success ? (
                            <div className="space-y-2 text-slate-300">
                                <p>• Users updated: <strong>{result.usersUpdated}</strong></p>
                                <p>• Configs updated: <strong>{result.configsUpdated}</strong></p>
                                <p>• Execution time: <strong>{result.executionTimeMs}ms</strong></p>
                                <p className="text-green-400 mt-4">{result.message}</p>
                            </div>
                        ) : (
                            <p className="text-red-400">{result.error}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
