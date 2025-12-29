import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-50 transition-opacity hover:opacity-80">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                        <Briefcase className="h-4 w-4" />
                    </div>
                    <span className="text-lg tracking-tight">JobTracker</span>
                </Link>
                <nav className="flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <Link href="/" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
                        Board
                    </Link>
                    <span className="h-4 w-px bg-gray-200 dark:bg-gray-800" />
                    <NotificationCenter />
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 ring-2 ring-white dark:ring-gray-950" />
                </nav>
            </div>
        </header>
    );
}
