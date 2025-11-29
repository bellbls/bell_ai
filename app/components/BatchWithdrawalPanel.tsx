import React, { useState } from 'react';
import { useWithdrawalExecution, ExecutionResult } from '../hooks/useWithdrawalExecution';

interface Withdrawal {
    _id: string;
    userId: string;
    amount: number;
    address: string;
    network: string;
    status: string;
    userEmail?: string;
}

interface BatchWithdrawalPanelProps {
    withdrawals: Withdrawal[];
    onRefresh: () => void;
}

export function BatchWithdrawalPanel({ withdrawals, onRefresh }: BatchWithdrawalPanelProps) {
    const [selected, setSelected] = useState<string[]>([]);
    const [results, setResults] = useState<ExecutionResult[]>([]);
    const { executeBatch, executing, progress } = useWithdrawalExecution();

    // Toggle selection for a withdrawal
    const toggleSelect = (id: string) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Select all pending withdrawals
    const selectAll = () => {
        const allIds = withdrawals.filter(w => w.status === 'pending').map(w => w._id);
        setSelected(allIds);
    };

    // Clear selection
    const clearSelection = () => {
        setSelected([]);
    };

    // Execute batch
    const handleBatchExecute = async () => {
        const selectedWithdrawals = withdrawals.filter(w => selected.includes(w._id));

        if (selectedWithdrawals.length === 0) {
            alert('Please select at least one withdrawal');
            return;
        }

        if (!confirm(`Execute ${selectedWithdrawals.length} withdrawal(s) via MetaMask?`)) {
            return;
        }

        try {
            const batchResults = await executeBatch(selectedWithdrawals as any);
            setResults(batchResults);

            // Show summary
            const successful = batchResults.filter(r => r.status === 'success').length;
            const failed = batchResults.filter(r => r.status === 'failed').length;

            alert(`Batch complete!\n✅ ${successful} successful\n❌ ${failed} failed`);

            // Clear selection and refresh
            clearSelection();
            onRefresh();
        } catch (error: any) {
            alert(`Batch execution failed: ${error.message}`);
        }
    };

    // Group withdrawals by network for smart batching
    const groupedByNetwork = withdrawals.reduce((acc, w) => {
        if (!acc[w.network]) acc[w.network] = [];
        acc[w.network].push(w);
        return acc;
    }, {} as Record<string, Withdrawal[]>);

    return (
        <div className="batch-withdrawal-panel">
            <div className="panel-header">
                <h3>Batch Withdrawal Processing</h3>
                <div className="header-actions">
                    <button onClick={selectAll} disabled={executing}>
                        Select All Pending
                    </button>
                    <button onClick={clearSelection} disabled={executing}>
                        Clear Selection
                    </button>
                </div>
            </div>

            {/* Network Summary */}
            <div className="network-summary">
                <h4>By Network:</h4>
                {Object.entries(groupedByNetwork).map(([network, items]) => (
                    <div key={network} className="network-group">
                        <span className="network-name">{network.toUpperCase()}</span>
                        <span className="network-count">{items.length} withdrawal(s)</span>
                    </div>
                ))}
            </div>

            {/* Withdrawals Table */}
            <div className="withdrawals-table">
                <table>
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    checked={selected.length === withdrawals.filter(w => w.status === 'pending').length}
                                    onChange={selectAll}
                                    disabled={executing}
                                />
                            </th>
                            <th>User</th>
                            <th>Amount</th>
                            <th>Network</th>
                            <th>Address</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {withdrawals.map(withdrawal => (
                            <tr
                                key={withdrawal._id}
                                className={selected.includes(withdrawal._id) ? 'selected' : ''}
                            >
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(withdrawal._id)}
                                        onChange={() => toggleSelect(withdrawal._id)}
                                        disabled={executing || withdrawal.status !== 'pending'}
                                    />
                                </td>
                                <td>{withdrawal.userEmail || 'Unknown'}</td>
                                <td>${withdrawal.amount.toFixed(2)}</td>
                                <td>
                                    <span className={`network-badge ${withdrawal.network}`}>
                                        {withdrawal.network.toUpperCase()}
                                    </span>
                                </td>
                                <td className="address-cell">
                                    {withdrawal.address.substring(0, 10)}...{withdrawal.address.substring(withdrawal.address.length - 8)}
                                </td>
                                <td>
                                    <span className={`status-badge ${withdrawal.status}`}>
                                        {withdrawal.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Batch Actions */}
            {selected.length > 0 && (
                <div className="batch-actions">
                    <div className="selected-info">
                        <strong>{selected.length}</strong> withdrawal(s) selected
                    </div>
                    <button
                        onClick={handleBatchExecute}
                        disabled={executing}
                        className="btn-primary btn-batch-execute"
                    >
                        {executing
                            ? `Processing ${progress.current} of ${progress.total}...`
                            : `Batch Approve & Execute (${selected.length})`
                        }
                    </button>
                </div>
            )}

            {/* Progress Indicator */}
            {executing && (
                <div className="progress-indicator">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                    <div className="progress-text">
                        Processing {progress.current} of {progress.total}...
                    </div>
                </div>
            )}

            {/* Results Summary */}
            {results.length > 0 && !executing && (
                <div className="results-summary">
                    <h4>Batch Results:</h4>
                    {results.map((result, index) => (
                        <div key={index} className={`result-item ${result.status}`}>
                            {result.status === 'success' ? (
                                <>
                                    ✅ Withdrawal {index + 1}: Success
                                    {result.txHash && (
                                        <a
                                            href={`https://polygonscan.com/tx/${result.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tx-link"
                                        >
                                            View TX
                                        </a>
                                    )}
                                </>
                            ) : (
                                <>
                                    ❌ Withdrawal {index + 1}: Failed - {result.error}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
        .batch-withdrawal-panel {
          background: white;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          gap: 10px;
        }

        .header-actions button {
          padding: 8px 16px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .header-actions button:hover:not(:disabled) {
          background: #f5f5f5;
        }

        .header-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .network-summary {
          background: #f9f9f9;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .network-summary h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #666;
        }

        .network-group {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-right: 20px;
          padding: 6px 12px;
          background: white;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
        }

        .network-name {
          font-weight: 600;
          font-size: 12px;
          color: #333;
        }

        .network-count {
          font-size: 12px;
          color: #666;
        }

        .withdrawals-table {
          overflow-x: auto;
          margin-bottom: 20px;
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
          font-size: 14px;
          color: #333;
          border-bottom: 2px solid #e0e0e0;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
        }

        tr.selected {
          background: #e3f2fd;
        }

        tr:hover {
          background: #fafafa;
        }

        .network-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .network-badge.polygon {
          background: #8247e5;
          color: white;
        }

        .network-badge.bsc {
          background: #f3ba2f;
          color: #000;
        }

        .network-badge.arbitrum {
          background: #28a0f0;
          color: white;
        }

        .address-cell {
          font-family: monospace;
          font-size: 12px;
          color: #666;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-badge.pending {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.executing {
          background: #cfe2ff;
          color: #084298;
        }

        .status-badge.completed {
          background: #d1e7dd;
          color: #0f5132;
        }

        .status-badge.failed {
          background: #f8d7da;
          color: #842029;
        }

        .batch-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f9f9f9;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .selected-info {
          font-size: 14px;
          color: #666;
        }

        .btn-batch-execute {
          padding: 12px 24px;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-batch-execute:hover:not(:disabled) {
          background: #45a049;
        }

        .btn-batch-execute:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .progress-indicator {
          margin-bottom: 20px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4caf50, #8bc34a);
          transition: width 0.3s ease;
        }

        .progress-text {
          text-align: center;
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }

        .results-summary {
          background: #f9f9f9;
          padding: 16px;
          border-radius: 6px;
        }

        .results-summary h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .result-item {
          padding: 8px 12px;
          margin-bottom: 8px;
          border-radius: 4px;
          font-size: 13px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .result-item.success {
          background: #d1e7dd;
          color: #0f5132;
        }

        .result-item.failed {
          background: #f8d7da;
          color: #842029;
        }

        .tx-link {
          color: #0066cc;
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
        }

        .tx-link:hover {
          text-decoration: underline;
        }
      `}</style>
        </div>
    );
}
