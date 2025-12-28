"use client";

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Building2, MapPin, Plus, Loader2 } from 'lucide-react';
import { api, Job, JobEvent } from '@/lib/api';
import { Timeline } from '@/components/Timeline';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [job, setJob] = useState<Job | null>(null);
    const [events, setEvents] = useState<JobEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [newEvent, setNewEvent] = useState({ type: 'Info', note: '', stage: '' }); // Stage optional/update?

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            setLoading(true);
            const [jobData, eventsData] = await Promise.all([
                api.getJob(id).catch(() => null),
                api.getJobEvents(id).catch(() => [])
            ]);

            if (jobData) {
                setJob(jobData);
                setEvents(eventsData);
                setNewEvent(prev => ({ ...prev, stage: jobData.stage }));
            }
        } catch (e) {
            console.error("Failed to fetch job", e);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddEvent(e: React.FormEvent) {
        e.preventDefault();
        if (!job) return;
        try {
            await api.createJobEvent(job.id, newEvent);
            await loadData(); // Reload to get new event and potentially updated job stage
            setIsAddingEvent(false);
            setNewEvent({ type: 'Info', note: '', stage: job.stage });
        } catch (e) {
            alert('Failed to add event');
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 space-y-8">
                <div className="h-8 w-32 animate-pulse bg-gray-200 rounded"></div>
                <div className="h-64 w-full animate-pulse bg-gray-100 rounded-xl"></div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="container mx-auto flex h-64 flex-col items-center justify-center px-4">
                <h2 className="text-xl font-semibold text-gray-900">Job Not Found</h2>
                <Link href="/" className="mt-4 text-indigo-600 hover:underline">Back to Board</Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
            <Link href="/" className="mb-6 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-200">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to Board
            </Link>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/50">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{job.role}</h1>
                                    <div className="mt-1 flex items-center text-gray-600 dark:text-gray-400">
                                        <Building2 className="mr-2 h-4 w-4" />
                                        <span className="font-medium">{job.company}</span>
                                    </div>
                                </div>
                                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                    {job.stage}
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-200">Location</p>
                                    <p>{job.location || 'Not specified'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                                    <Plus className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-200">Applied Date</p>
                                    <p>{new Date(job.appliedDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline Sidebar with Add Event Form */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Timeline</h3>
                        <button
                            onClick={() => setIsAddingEvent(!isAddingEvent)}
                            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>

                    {isAddingEvent && (
                        <form onSubmit={handleAddEvent} className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                            <div className="mb-3 space-y-2">
                                <input
                                    type="text"
                                    placeholder="Event Type (e.g. AssessmentInvite)"
                                    className="w-full rounded-md border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                                    required
                                    value={newEvent.type}
                                    onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}
                                />
                                <textarea
                                    placeholder="Note..."
                                    className="w-full rounded-md border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                                    rows={2}
                                    value={newEvent.note}
                                    onChange={e => setNewEvent({ ...newEvent, note: e.target.value })}
                                />
                                <select
                                    className="w-full rounded-md border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                                    value={newEvent.stage}
                                    onChange={e => setNewEvent({ ...newEvent, stage: e.target.value })}
                                >
                                    {['Applied', 'Assessment', 'Interviewing', 'Offer', 'Rejected', 'Accepted'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddingEvent(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                                >
                                    Add Event
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <Timeline events={events} />
                    </div>
                </div>
            </div>
        </div>
    );
}
