"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
    date: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (title: string, message: string, type?: NotificationType) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Optional: functionality to save/load from local storage could go here

    const unreadCount = notifications.filter((n) => !n.read).length;

    const addNotification = (title: string, message: string, type: NotificationType = "info") => {
        const newNotification: Notification = {
            id: crypto.randomUUID(),
            title,
            message,
            type,
            read: false,
            date: new Date().toISOString(),
        };
        setNotifications((prev) => [newNotification, ...prev]);
    };

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    return (
        <NotificationContext.Provider
            value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotification must be used within a NotificationProvider");
    }
    return context;
}
