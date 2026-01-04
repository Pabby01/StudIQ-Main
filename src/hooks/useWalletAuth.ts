import { useWallet as useWalletAdapter } from "@solana/wallet-adapter-react";
import { useMemo, useEffect } from "react";
import { CrossAppSessionManager } from "@/lib/cross-app-session";
import { getSyncClient } from "@/lib/bidirectional-sync";

/**
 * Enhanced wallet authentication hook with cross-app sync
 * Manages sessions and syncs data between Main App and Campus Store
 */
export function useWalletAuth() {
    const wallet = useWalletAdapter();

    const address = useMemo(() => {
        if (!wallet.connected || !wallet.publicKey) return null;
        return wallet.publicKey.toBase58();
    }, [wallet.connected, wallet.publicKey]);

    const isAuthenticated = wallet.connected;

    // Handle wallet connection - create session token and sync
    useEffect(() => {
        if (wallet.connected && address) {
            // Create session token for cross-app authentication
            CrossAppSessionManager.createSessionToken(address, 'main_app');

            // Sync data with campus store
            const syncClient = getSyncClient();
            syncClient.syncOnConnect(address).catch(err => {
                console.error('Sync error on connect:', err);
            });

            console.log('✅ Wallet connected, session created, sync initiated:', address);
        }
    }, [wallet.connected, address]);

    // Handle wallet disconnection - clear session
    useEffect(() => {
        if (!wallet.connected) {
            CrossAppSessionManager.clearSession();
            console.log('✅ Session cleared on disconnect');
        }
    }, [wallet.connected]);

    // Check for existing session on mount
    useEffect(() => {
        const existingSession = CrossAppSessionManager.getCurrentSession();
        if (existingSession && !wallet.connected) {
            console.log('📱 Found existing session, attempting auto-connect...');
            // Auto-connect will be handled by WalletProvider if wallet is available
        }
    }, []);

    return {
        // Wallet object
        wallet,

        // Auth state
        address,
        isAuthenticated,
        connected: wallet.connected,
        connecting: wallet.connecting,

        // Wallet functions
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signMessage: wallet.signMessage,
        connect: wallet.connect,
        disconnect: wallet.disconnect,

        // Compatibility aliases
        login: wallet.connect,
        logout: wallet.disconnect,
        walletAddress: address,
        user: address ? { walletAddress: address, id: address } : null,

        // Session helpers
        hasActiveSession: () => CrossAppSessionManager.hasActiveSession(),
    };
}
