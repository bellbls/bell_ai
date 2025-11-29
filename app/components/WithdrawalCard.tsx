import React, { useState } from 'react';
import { useWithdrawalExecution } from '../hooks/useWithdrawalExecution';

interface Withdrawal {
    _id: string;
    userId: string;
    amount: number;
    address: string;
    network: string;
    status: string;
    userEmail?: string;
    transactionHash?: string;
    executionError?: string;
}

interface WithdrawalCardProps {
    withdrawal: Withdrawal;
    onRefresh: () => void;
}

export function WithdrawalCard({ withdrawal, onRefresh }: WithdrawalCardProps) {
    const [executing, setExecuting] = useState(false);
    const { executeWithdrawal, retryWithdrawal, getExplorerUrl } = useWithdrawalExecution();

    const handleExecute = async () => {
        if (!confirm(`Execute withdrawal of $${withdrawal.amount} to ${withdrawal.address}?`)) {
            return;
        }

        setExecuting(true);
        try {
            const txHash = await executeWithdrawal(withdrawal as any);
            alert(`✅ Withdrawal executed!\nTransaction: ${txHash.substring(0, 10)}...`);
            onRefresh();
        } catch (error: any) {
            alert(`❌ Execution failed: ${error.message}`);
        } finally {
            setExecuting(false);
        }
    };

    const handleRetry = async () => {
        if (!confirm(`Retry failed withdrawal of $${withdrawal.amount}?`)) {
            return;
        }

        setExecuting(true);
        try {
            const txHash = await retryWithdrawal(withdrawal as any);
            alert(`✅ Withdrawal executed!\nTransaction: ${txHash.substring(0, 10)}...`);
            onRefresh();
        } catch (error: any) {
            alert(`❌ Retry failed: ${error.message}`);
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="withdrawal-card">
            <div className="card-header">
                <div className="user-info">
                    <div className="user-email">{withdrawal.userEmail || 'Unknown User'}</div>
                    <div className="withdrawal-amount">${withdrawal.amount.toFixed(2)} USDT</div>
                </div>
                <span className={`status-badge ${withdrawal.status}`}>
                    {withdrawal.status}
                </span>
            </div>

            <div className="card-body">
                <div className="info-row">
                    <span className="label">Network:</span>
                    <span className={`network-badge ${withdrawal.network}`}>
                        {withdrawal.network.toUpperCase()}
                    </span>
                </div>

                <div className="info-row">
                    <span className="label">Wallet Address:</span>
                    <span className="address">
                        {withdrawal.address.substring(0, 10)}...{withdrawal.address.substring(withdrawal.address.length - 8)}
                    </span>
                </div>

                {withdrawal.transactionHash && (
                    <div className="info-row">
                        <span className="label">Transaction:</span>
                        <a
                            href={getExplorerUrl(withdrawal.network, withdrawal.transactionHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tx-link"
                        >
                            {withdrawal.transactionHash.substring(0, 10)}... ↗
                        </a>
                    </div>
                )}

                {withdrawal.executionError && (
                    <div className="error-message">
                        <strong>Error:</strong> {withdrawal.executionError}
                    </div>
                )}
            </div>

            <div className="card-actions">
                {withdrawal.status === 'pending' && (
                    <button
                        onClick={handleExecute}
                        disabled={executing}
                        className="btn-execute"
                    >
                        {executing ? 'Executing...' : 'Approve & Execute'}
                    </button>
                )}

                {withdrawal.status === 'failed' && (
                    <button
                        onClick={handleRetry}
                        disabled={executing}
                        className="btn-retry"
                    >
                        {executing ? 'Retrying...' : 'Retry Execution'}
                    </button>
                )}

                {withdrawal.status === 'executing' && (
                    <div className="executing-indicator">
                        <div className="spinner"></div>
                        <span>Processing transaction...</span>
                    </div>
                )}

                {withdrawal.status === 'completed' && withdrawal.transactionHash && (
                    <a
                        href={getExplorerUrl(withdrawal.network, withdrawal.transactionHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-view-tx"
                    >
                        View on Explorer ↗
                    </a>
                )}
            </div>

            <style jsx>{`
        .withdrawal-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
          transition: box-shadow 0.2s;
        }

        .withdrawal-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f0f0f0;
        }

        .user-info {
          flex: 1;
        }

        .user-email {
          font-size: 14px;
          color: #666;
          margin-bottom: 4px;
        }

        .withdrawal-amount {
          font-size: 24px;
          font-weight: 700;
          color: #333;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
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

        .card-body {
          margin-bottom: 16px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 14px;
        }

        .label {
          color: #666;
          font-weight: 500;
        }

        .network-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
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

        .address {
          font-family: monospace;
          font-size: 13px;
          color: #333;
        }

        .tx-link {
          color: #0066cc;
          text-decoration: none;
          font-weight: 600;
          font-size: 13px;
        }

        .tx-link:hover {
          text-decoration: underline;
        }

        .error-message {
          background: #f8d7da;
          color: #842029;
          padding: 12px;
          border-radius: 4px;
          font-size: 13px;
          margin-top: 8px;
        }

        .card-actions {
          display: flex;
          gap: 12px;
        }

        .btn-execute,
        .btn-retry,
        .btn-view-tx {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          text-decoration: none;
          display: inline-block;
        }

        .btn-execute {
          background: #4caf50;
          color: white;
        }

        .btn-execute:hover:not(:disabled) {
          background: #45a049;
        }

        .btn-execute:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-retry {
          background: #ff9800;
          color: white;
        }

        .btn-retry:hover:not(:disabled) {
          background: #f57c00;
        }

        .btn-retry:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-view-tx {
          background: #2196f3;
          color: white;
        }

        .btn-view-tx:hover {
          background: #1976d2;
        }

        .executing-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px;
          background: #e3f2fd;
          border-radius: 6px;
          color: #1976d2;
          font-weight: 600;
          font-size: 14px;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid #e3f2fd;
          border-top-color: #1976d2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
        </div>
    );
}
