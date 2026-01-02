import { useWallet as useWalletAdapter } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

/**
 * Simple wallet authentication hook
 * Replaces complex Privy useAuth (800 lines) with 27 lines
 */
export function useWalletAuth() {
    const wallet = useWalletAdapter();

    const address = useMemo(() => {
        if (!wallet.connected || !wallet.publicKey) return null;
        return wallet.publicKey.toBase58();
    }, [wallet.connected, wallet.publicKey]);

    const isAuthenticated = wallet.connected;

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
    };
}
