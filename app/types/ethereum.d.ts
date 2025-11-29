// TypeScript declarations for Web3 wallet providers

interface EthereumProvider {
    isMetaMask?: boolean;
    isTrust?: boolean;
    isCoinbaseWallet?: boolean;
    isBraveWallet?: boolean;
    isRainbow?: boolean;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeListener?: (event: string, callback: (...args: any[]) => void) => void;
}

declare global {
    interface Window {
        ethereum?: EthereumProvider;
    }
}

export { };
