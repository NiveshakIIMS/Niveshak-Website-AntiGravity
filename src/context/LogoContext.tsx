"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface LogoContextType {
    isLogoInNav: boolean;
    setLogoInNav: (value: boolean) => void;
}

const LogoContext = createContext<LogoContextType | undefined>(undefined);

export function LogoProvider({ children }: { children: ReactNode }) {
    const [isLogoInNav, setLogoInNav] = useState(false);

    return (
        <LogoContext.Provider value={{ isLogoInNav, setLogoInNav }}>
            {children}
        </LogoContext.Provider>
    );
}

export function useLogo() {
    const context = useContext(LogoContext);
    if (context === undefined) {
        throw new Error("useLogo must be used within a LogoProvider");
    }
    return context;
}
