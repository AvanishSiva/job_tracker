"use client";

import { useEffect, useState } from 'react';
import { api, Job, JobStage } from '@/lib/api';
import { JobCard } from './JobCard';
import { Plus } from 'lucide-react';
import { AddJobModal } from './AddJobModal';

// Updated stages to include Assessment
const STAGES: string[] = ['Applied', 'Assessment', 'Interviewing', 'Offer', 'Rejected', 'Accepted'];

export function JobBoard() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadJobs();
    }, []);

    async function loadJobs() {
        try {
            setLoading(true);
            const data = await api.getJobs();
            setJobs(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load jobs. Is the backend running?');
            // Fallback mock data matching new schema
            setJobs([
                {
                    id: '1',
                    role: 'Senior Frontend Engineer',
                    company: 'TechCorp',
                    stage: 'Interviewing',
                    location: 'San Francisco, CA',
                    appliedDate: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    role: 'Product Designer',
                    company: 'DesignStudio',
                    stage: 'Assessment',
                    location: 'Remote',
                    appliedDate: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                }
            ]);
        } finally {
            setLoading(false);
        }
    }

    const getJobsByStage = (stage: string) => jobs.filter(job => job.stage === stage);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Jobs Board</h1>
                    <p className="text-gray-500">Manage and track your job applications.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40"
                >
                    <Plus className="h-4 w-4" />
                    Add Job
                </button>
            </div>

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                    ))}
                </div>
            ) : (
                <div className="space-y-8">
                    {STAGES.map(stage => {
                        const stageJobs = getJobsByStage(stage);
                        if (stageJobs.length === 0) return null;

                        return (
                            <div key={stage} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                                    {stage}
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                        {stageJobs.length}
                                    </span>
                                </h2>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {stageJobs.map(job => (
                                        <JobCard key={job.id} job={job} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {jobs.length === 0 && !loading && (
                        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                            <p className="text-gray-500">No jobs found. Add your first application!</p>
                        </div>
                    )}
                </div>
            )}

            <AddJobModal open={isModalOpen} onOpenChange={setIsModalOpen} onSuccess={loadJobs} />
        </div>
    );
}
