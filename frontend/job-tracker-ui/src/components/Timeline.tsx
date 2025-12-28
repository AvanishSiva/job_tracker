import { JobEvent } from '@/lib/api';
import { Calendar, CheckCircle, XCircle, Send, MessageCircle, Star } from 'lucide-react';

interface TimelineProps {
    events: JobEvent[];
}

const getEventIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('application')) return <Send className="h-4 w-4" />;
    if (t.includes('interview')) return <Calendar className="h-4 w-4" />;
    if (t.includes('offer')) return <Star className="h-4 w-4" />;
    if (t.includes('reject')) return <XCircle className="h-4 w-4" />;
    if (t.includes('accept')) return <CheckCircle className="h-4 w-4" />;
    return <MessageCircle className="h-4 w-4" />;
};

export function Timeline({ events }: TimelineProps) {
    if (events.length === 0) {
        return <div className="text-sm text-gray-500 italic">No events recorded yet.</div>;
    }

    // Sort events by date descending (using createdAt)
    const sortedEvents = [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="relative space-y-8 pl-4 before:absolute before:inset-0 before:left-2 before:h-full before:w-px before:bg-gray-200 dark:before:bg-gray-800">
            {sortedEvents.map((event) => (
                <div key={event.id} className="relative">
                    <div className="absolute -left-2 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-indigo-50 text-indigo-600 ring-4 ring-white dark:border-gray-900 dark:bg-indigo-900/50 dark:text-indigo-400 dark:ring-gray-950">
                        {getEventIcon(event.type)}
                    </div>
                    <div className="ml-6 space-y-1">
                        <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {event.type}
                            </p>
                            <span className="text-xs text-gray-500">
                                {new Date(event.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        {event.note && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {event.note}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
