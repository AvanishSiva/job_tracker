import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { Job } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface JobCardProps {
    job: Job;
}

const statusColors: Record<string, string> = {
    'Applied': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    'Assessment': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    'Interviewing': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    'Offer': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    'Rejected': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    'Accepted': 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
};

export function JobCard({ job }: JobCardProps) {
    const statusColor = statusColors[job.stage] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300';

    return (
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-950 dark:hover:border-indigo-900">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="mb-1 flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-50">{job.role}</h3>
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", statusColor)}>
                            {job.stage}
                        </span>
                    </div>
                    <p className="font-medium text-gray-600 dark:text-gray-400">{job.company}</p>
                </div>
                <Link
                    href={`/jobs/${job.id}`}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-indigo-600 dark:hover:bg-gray-900 dark:hover:text-indigo-400"
                >
                    <ArrowRight className="h-5 w-5" />
                </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-500">
                {job.location && (
                    <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(job.updatedAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
}
