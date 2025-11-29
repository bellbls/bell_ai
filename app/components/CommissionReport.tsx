"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface CommissionReportProps {
  userId?: Id<"users">;
}

export function CommissionReport({ userId }: CommissionReportProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month" | "year" | undefined>();
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year" | "all">("month");

  // Fetch commission summary
  const summary = useQuery(
    (api as any)["reports/commissionReports"].getCommissionSummary,
    userId ? { userId, period } : "skip"
  );

  // Fetch detailed report
  const report = useQuery(
    (api as any)["reports/commissionReports"].getCommissionReport,
    { userId, startDate: startDate || undefined, endDate: endDate || undefined, groupBy }
  );

  // Export action
  const exportReport = useAction((api as any)["reports/exportService"].exportCommissionReport);

  // Auto-fill dates when period changes
  const handlePeriodChange = (newPeriod: typeof period) => {
    setPeriod(newPeriod);

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    switch (newPeriod) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setStartDate(weekAgo.toISOString().split('T')[0]);
        setEndDate(today);
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        setStartDate(monthAgo.toISOString().split('T')[0]);
        setEndDate(today);
        break;
      case 'year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        setStartDate(yearAgo.toISOString().split('T')[0]);
        setEndDate(today);
        break;
      case 'all':
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  const handleExport = async () => {
    try {
      const result = await exportReport({
        userId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      // Create download link
      const blob = new Blob([result.data], { type: result.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export report");
    }
  };

  return (
    <div className="commission-report">
      <div className="report-header">
        <h2>Unilevel Commission Report</h2>
        <button onClick={handleExport} className="btn-export">
          Export to CSV
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-label">Total Commissions</div>
            <div className="card-value">${summary.totalCommission.toFixed(2)}</div>
            <div className="card-subtitle">{summary.commissionCount} transactions</div>
          </div>

          {/* Level Breakdown */}
          <div className="level-breakdown">
            <h3>By Level</h3>
            <div className="level-grid">
              {Object.entries(summary.byLevel).map(([level, amount]) => (
                <div key={level} className="level-item">
                  <span className="level-label">L{level}</span>
                  <span className="level-amount">${(amount as number).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Period</label>
          <select value={period} onChange={(e) => handlePeriodChange(e.target.value as any)}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Group By</label>
          <select value={groupBy || ""} onChange={(e) => setGroupBy(e.target.value as any || undefined)}>
            <option value="">None</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>
      </div>

      {/* Report Table */}
      {report && Array.isArray(report) && (
        <div className="report-table">
          <table>
            <thead>
              <tr>
                {groupBy ? (
                  <>
                    <th>Period</th>
                    <th>Total Commission</th>
                    <th>Count</th>
                    <th>By Level</th>
                  </>
                ) : (
                  <>
                    <th>Date</th>
                    <th>Level</th>
                    <th>Rate</th>
                    <th>Yield</th>
                    <th>Commission</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {groupBy ? (
                // Grouped view
                report.map((group: any, idx) => (
                  <tr key={idx}>
                    <td>{group.period}</td>
                    <td>${group.totalCommission.toFixed(2)}</td>
                    <td>{group.count}</td>
                    <td>
                      {Object.entries(group.byLevel).map(([level, amount]) => (
                        <span key={level} className="level-badge">
                          L{level}: ${(amount as number).toFixed(2)}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))
              ) : (
                // Detailed view
                report.slice(0, 100).map((commission: any) => (
                  <tr key={commission._id}>
                    <td>{commission.date}</td>
                    <td>
                      <span className={`level-badge level-${commission.level}`}>
                        L{commission.level}
                      </span>
                    </td>
                    <td>{(commission.rate * 100).toFixed(1)}%</td>
                    <td>${commission.yieldAmount.toFixed(2)}</td>
                    <td className="commission-amount">
                      ${commission.commissionAmount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .commission-report {
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(148, 163, 184, 0.1);
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .report-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: white;
        }

        .btn-export {
          padding: 10px 20px;
          background: #7c3aed;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-export:hover {
          background: #6d28d9;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          border-radius: 8px;
        }

        .card-label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .card-value {
          font-size: 36px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .card-subtitle {
          font-size: 12px;
          opacity: 0.8;
        }

        .level-breakdown {
          background: rgba(30, 41, 59, 0.5);
          padding: 20px;
          border-radius: 8px;
        }

        .level-breakdown h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: white;
        }

        .level-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }

        .level-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px;
          background: rgba(51, 65, 85, 0.5);
          border-radius: 6px;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .level-label {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .level-amount {
          font-size: 14px;
          font-weight: 700;
          color: white;
        }

        .filters {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
          padding: 20px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 8px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
        }

        .filter-group label {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 6px;
        }

        .filter-group input,
        .filter-group select {
          padding: 8px 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 4px;
          font-size: 14px;
          background: rgba(51, 65, 85, 0.5);
          color: white;
        }

        .filter-group input:focus,
        .filter-group select:focus {
          outline: none;
          border-color: #7c3aed;
          ring: 2px solid rgba(124, 58, 237, 0.2);
        }

        .report-table {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: rgba(30, 41, 59, 0.5);
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          color: #94a3b8;
          border-bottom: 2px solid rgba(148, 163, 184, 0.2);
        }

        td {
          padding: 12px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          font-size: 14px;
          color: #e2e8f0;
        }

        tr:hover {
          background: rgba(51, 65, 85, 0.3);
        }

        .level-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          margin-right: 4px;
        }

        .level-badge.level-1,
        .level-badge.level-10 {
          background: #4caf50;
          color: white;
        }

        .level-badge.level-2,
        .level-badge.level-9 {
          background: #2196f3;
          color: white;
        }

        .level-badge.level-3,
        .level-badge.level-4,
        .level-badge.level-5,
        .level-badge.level-6,
        .level-badge.level-7,
        .level-badge.level-8 {
          background: #ff9800;
          color: white;
        }

        .commission-amount {
          font-weight: 700;
          color: #10b981;
        }
      `}</style>
    </div>
  );
}
