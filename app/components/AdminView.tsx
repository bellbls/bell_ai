import { useState } from "react";
import {
    LayoutDashboard, Users, Shield, FileText,
    Settings, Activity, DollarSign
} from "lucide-react";
import { AdminPresalePanel } from "./AdminPresalePanel";
// Import other admin components as they are created or moved

export function AdminView() {
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <div className="space-y-6">
            {/* Admin Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <AdminTab
                    id="overview"
                    label="Overview"
                    icon={<LayoutDashboard className="w-4 h-4" />}
                    active={activeTab === "overview"}
                    onClick={setActiveTab}
                />
                <AdminTab
                    id="presale"
                    label="Presale"
                    icon={<Shield className="w-4 h-4" />}
                    active={activeTab === "presale"}
                    onClick={setActiveTab}
                />
                <AdminTab
                    id="users"
                    label="User Management"
                    icon={<Users className="w-4 h-4" />}
                    active={activeTab === "users"}
                    onClick={setActiveTab}
                />
                <AdminTab
                    id="finance"
                    label="Finance"
                    icon={<DollarSign className="w-4 h-4" />}
                    active={activeTab === "finance"}
                    onClick={setActiveTab}
                />
                <AdminTab
                    id="reports"
                    label="Reports"
                    icon={<FileText className="w-4 h-4" />}
                    active={activeTab === "reports"}
                    onClick={setActiveTab}
                />
            </div>

            {/* Tab Content */}
            <div className="bg-slate-900/30 rounded-3xl min-h-[600px]">
                {activeTab === "overview" && (
                    <div className="p-8 text-center text-slate-500">
                        <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <h3 className="text-xl font-bold text-slate-400">System Overview</h3>
                        <p>General system stats will appear here.</p>
                    </div>
                )}

                {activeTab === "presale" && (
                    <AdminPresalePanel />
                )}

                {activeTab === "users" && (
                    <div className="p-8 text-center text-slate-500">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <h3 className="text-xl font-bold text-slate-400">User Management</h3>
                        <p>User list and controls will appear here.</p>
                    </div>
                )}

                {activeTab === "finance" && (
                    <div className="p-8 text-center text-slate-500">
                        <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <h3 className="text-xl font-bold text-slate-400">Financial Overview</h3>
                        <p>Withdrawals and deposit management will appear here.</p>
                    </div>
                )}

                {activeTab === "reports" && (
                    <div className="p-8 text-center text-slate-500">
                        <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <h3 className="text-xl font-bold text-slate-400">System Reports</h3>
                        <p>Detailed reports will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function AdminTab({ id, label, icon, active, onClick }: any) {
    return (
        <button
            onClick={() => onClick(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${active
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                    : "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
        >
            {icon}
            {label}
        </button>
    );
}
