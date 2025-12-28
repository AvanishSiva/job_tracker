"use client";

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api, JobStage } from '@/lib/api';

interface AddJobModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AddJobModal({ open, onOpenChange, onSuccess }: AddJobModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        role: '',
        company: '',
        location: '',
        stage: 'Applied'
    });

    if (!open) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await api.createJob(formData);
            onSuccess();
            onOpenChange(false);
            setFormData({ role: '', company: '', location: '', stage: 'Applied' });
        } catch (error) {
            console.error(error);
            alert('Failed to create job');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:bg-gray-950 border dark:border-gray-800 m-4">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                    <h2 className="text-lg font-semibold">Add New Job</h2>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-900"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="col-span-2">
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Job Role <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900"
                                placeholder="Graduate Software Developer"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Company <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900"
                                placeholder="Microsoft, etc."
                                value={formData.company}
                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Location
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900"
                                placeholder="Remote / Dublin"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Stage
                            </label>
                            <select
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900"
                                value={formData.stage}
                                onChange={e => setFormData({ ...formData, stage: e.target.value })}
                            >
                                {['Applied', 'Assessment', 'Interviewing', 'Offer', 'Rejected', 'Accepted'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-2 flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-70"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Job
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
