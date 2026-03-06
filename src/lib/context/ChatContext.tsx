'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ChatContextValue {
    // State
    isSupportChatOpen: boolean;
    isMethabotOpen: boolean;
    // Controller actions
    openSupport: () => void;
    closeSupport: () => void;
    openMethabot: () => void;
    closeMethabot: () => void;
}

const ChatContext = createContext<ChatContextValue>({
    isSupportChatOpen: false,
    isMethabotOpen: false,
    openSupport: () => {},
    closeSupport: () => {},
    openMethabot: () => {},
    closeMethabot: () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const [isSupportChatOpen, setIsSupportChatOpen] = useState(false);
    const [isMethabotOpen, setIsMethabotOpen] = useState(false);

    // Opening support chat FORCES methabot closed
    const openSupport = useCallback(() => {
        setIsMethabotOpen(false);
        setIsSupportChatOpen(true);
    }, []);

    const closeSupport = useCallback(() => {
        setIsSupportChatOpen(false);
        // Methabot stays closed — user must reopen manually
    }, []);

    // Opening methabot is only allowed when support is closed
    const openMethabot = useCallback(() => {
        setIsSupportChatOpen(prev => {
            if (!prev) setIsMethabotOpen(true);
            return prev;
        });
    }, []);

    const closeMethabot = useCallback(() => {
        setIsMethabotOpen(false);
    }, []);

    return (
        <ChatContext.Provider value={{
            isSupportChatOpen,
            isMethabotOpen,
            openSupport,
            closeSupport,
            openMethabot,
            closeMethabot,
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChatContext() {
    return useContext(ChatContext);
}
