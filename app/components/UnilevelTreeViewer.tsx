"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface UnilevelTreeViewerProps {
  userId: Id<"users">;
}

export function UnilevelTreeViewer({ userId }: UnilevelTreeViewerProps) {
  const [expandedLevels, setExpandedLevels] = useState<number>(3);

  // Fetch user data only if not admin context
  const user = userId !== ("admin" as any)
    ? useQuery(api.users.getProfile, { userId })
    : null;

  // For admin view, show example data
  const unlockedLevels = user?.unlockedLevels || 0;
  const activeDirects = user?.activeDirectReferrals || 0;
  const isAdminView = userId === ("admin" as any);

  return (
    <div className="unilevel-tree-viewer">
      <div className="tree-header">
        <h2>Unilevel Network Tree</h2>
        {isAdminView && (
          <div className="admin-note">
            <span style={{ fontSize: '14px', color: '#666' }}>
              📊 System Overview - Select a user to view their tree
            </span>
          </div>
        )}
        {!isAdminView && (
          <div className="tree-stats">
            <div className="stat">
              <span className="stat-label">Active Directs:</span>
              <span className="stat-value">{activeDirects}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Unlocked Levels:</span>
              <span className="stat-value">{unlockedLevels}/10</span>
            </div>
          </div>
        )}
      </div>

      {/* Level Unlock Visualization */}
      <div className="level-unlock-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
          const isUnlocked = level <= unlockedLevels;
          const rate = getCommissionRate(level);

          return (
            <div
              key={level}
              className={`level-box ${isUnlocked ? "unlocked" : "locked"}`}
            >
              <div className="level-number">L{level}</div>
              <div className="level-rate">{(rate * 100).toFixed(0)}%</div>
              <div className="level-status">
                {isUnlocked ? "✓ Unlocked" : "🔒 Locked"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unlock Requirements */}
      <div className="unlock-requirements">
        <h3>Unlock Requirements</h3>
        <div className="requirements-grid">
          <div className="requirement">
            <span className="req-levels">L1-L2</span>
            <span className="req-directs">1 Active Direct</span>
            <span className={`req-status ${activeDirects >= 1 ? "met" : "unmet"}`}>
              {activeDirects >= 1 ? "✓" : "✗"}
            </span>
          </div>
          <div className="requirement">
            <span className="req-levels">L3-L4</span>
            <span className="req-directs">2 Active Directs</span>
            <span className={`req-status ${activeDirects >= 2 ? "met" : "unmet"}`}>
              {activeDirects >= 2 ? "✓" : "✗"}
            </span>
          </div>
          <div className="requirement">
            <span className="req-levels">L5-L6</span>
            <span className="req-directs">3 Active Directs</span>
            <span className={`req-status ${activeDirects >= 3 ? "met" : "unmet"}`}>
              {activeDirects >= 3 ? "✓" : "✗"}
            </span>
          </div>
          <div className="requirement">
            <span className="req-levels">L7-L8</span>
            <span className="req-directs">4 Active Directs</span>
            <span className={`req-status ${activeDirects >= 4 ? "met" : "unmet"}`}>
              {activeDirects >= 4 ? "✓" : "✗"}
            </span>
          </div>
          <div className="requirement">
            <span className="req-levels">L9-L10</span>
            <span className="req-directs">5 Active Directs</span>
            <span className={`req-status ${activeDirects >= 5 ? "met" : "unmet"}`}>
              {activeDirects >= 5 ? "✓" : "✗"}
            </span>
          </div>
        </div>
      </div>

      {/* Commission Rates Table */}
      <div className="rates-table">
        <h3>Commission Rates</h3>
        <table>
          <thead>
            <tr>
              <th>Level</th>
              <th>Rate</th>
              <th>Status</th>
              <th>Example (on $20 yield)</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
              const isUnlocked = level <= unlockedLevels;
              const rate = getCommissionRate(level);
              const example = 20 * rate;

              return (
                <tr key={level} className={isUnlocked ? "unlocked-row" : "locked-row"}>
                  <td>
                    <span className="level-badge">L{level}</span>
                  </td>
                  <td className="rate-cell">{(rate * 100).toFixed(1)}%</td>
                  <td>
                    <span className={`status-badge ${isUnlocked ? "unlocked" : "locked"}`}>
                      {isUnlocked ? "Unlocked" : "Locked"}
                    </span>
                  </td>
                  <td className="example-cell">
                    {isUnlocked ? `$${example.toFixed(2)}` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .unilevel-tree-viewer {
          background: white;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .tree-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f0f0f0;
        }

        .tree-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }

        .tree-stats {
          display: flex;
          gap: 24px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .stat-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #4caf50;
        }

        .level-unlock-grid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 12px;
          margin-bottom: 32px;
        }

        .level-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 8px;
          border-radius: 8px;
          border: 2px solid #e0e0e0;
          transition: all 0.3s;
        }

        .level-box.unlocked {
          background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
          color: white;
          border-color: #4caf50;
        }

        .level-box.locked {
          background: #f5f5f5;
          color: #999;
          border-color: #e0e0e0;
        }

        .level-number {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .level-rate {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .level-status {
          font-size: 10px;
          font-weight: 600;
        }

        .unlock-requirements {
          margin-bottom: 32px;
        }

        .unlock-requirements h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .requirements-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }

        .requirement {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          background: #f9f9f9;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }

        .req-levels {
          font-size: 14px;
          font-weight: 700;
          color: #333;
          margin-bottom: 8px;
        }

        .req-directs {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }

        .req-status {
          font-size: 20px;
          font-weight: 700;
        }

        .req-status.met {
          color: #4caf50;
        }

        .req-status.unmet {
          color: #f44336;
        }

        .rates-table {
          margin-top: 32px;
        }

        .rates-table h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #f5f5f5;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          color: #333;
          border-bottom: 2px solid #e0e0e0;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
        }

        .unlocked-row {
          background: #f0f8f0;
        }

        .locked-row {
          background: #fafafa;
          opacity: 0.6;
        }

        .level-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 700;
          background: #667eea;
          color: white;
        }

        .rate-cell {
          font-weight: 700;
          color: #4caf50;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .status-badge.unlocked {
          background: #d1e7dd;
          color: #0f5132;
        }

        .status-badge.locked {
          background: #f8d7da;
          color: #842029;
        }

        .example-cell {
          font-weight: 600;
          color: #333;
        }
      `}</style>
    </div>
  );
}

function getCommissionRate(level: number): number {
  const rates: Record<number, number> = {
    1: 0.03, 2: 0.02, 3: 0.01, 4: 0.01, 5: 0.01,
    6: 0.01, 7: 0.01, 8: 0.01, 9: 0.02, 10: 0.03,
  };
  return rates[level] || 0;
}
