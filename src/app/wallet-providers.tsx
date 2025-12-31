"use client";

import { useMemo, ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";

function getRpcConfig() {
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
    const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

    return {
        network,
        endpoint
    };
}

export default function Providers({ children }: { children: ReactNode }) {
    const { endpoint } = getRpcConfig();

    // Configure wallets - Solflare first for partnership
    const wallets = useMemo(
        () => [
            new SolflareWalletAdapter(), // Priority partner wallet
            new PhantomWalletAdapter(),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}
