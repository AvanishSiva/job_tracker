export type JobStage = 'Applied' | 'Assessment' | 'Interviewing' | 'Offer' | 'Rejected' | 'Accepted';

export interface Job {
    id: string; // Mapped from jobId
    role: string; // Was title
    company: string;
    location: string;
    stage: string; // The backend seems to accept any string, but we can type strict it if we want
    appliedDate: string;
    createdAt: string;
    updatedAt: string;
}

export interface JobEvent {
    id: string; // Mapped from eventId
    jobId: string;
    type: string;
    note: string;
    createdAt: string;
    stage?: string; // Optional in response?
}

// Raw DTOs from Backend
interface JobDTO {
    jobId: string;
    role: string;
    company: string;
    location: string;
    stage: string;
    appliedDate?: string;
    createdAt: string;
    updatedAt: string;
    PK: string;
    SK: string;
}

interface EventDTO {
    eventId: string;
    jobId: string;
    note: string;
    type: string;
    createdAt: string;
    source?: string;
    PK: string;
    SK: string;
}

// Ensure no trailing slash
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

async function fetchInternal<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // console.log(`Fetching: ${API_BASE_URL}${endpoint}`);
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!res.ok) {
        throw new Error(`API call failed: ${res.status} ${res.statusText}`);
    }

    if (res.status === 204) {
        return {} as T;
    }

    return res.json();
}

export const api = {
    getJobs: async (): Promise<Job[]> => {
        const dtos = await fetchInternal<JobDTO[]>('/jobs');
        return dtos.map(dto => ({
            id: dto.jobId,
            role: dto.role,
            company: dto.company,
            location: dto.location,
            stage: dto.stage,
            appliedDate: dto.appliedDate || dto.createdAt,
            createdAt: dto.createdAt,
            updatedAt: dto.updatedAt
        }));
    },

    createJob: async (data: { company: string; role: string; location: string; stage: string }) => {
        return fetchInternal('/jobs', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Since GET /jobs/{id} wasn't explicitly listed as a working curl in the refrain request,
    // we'll implement a fallback: try to fetch list and find. 
    // Optimization: If the user confirms /jobs/{id} exists later, we can switch.
    getJob: async (id: string): Promise<Job> => {
        const jobs = await api.getJobs();
        const job = jobs.find(j => j.id === id);
        if (!job) throw new Error('Job not found');
        return job;
    },

    getJobEvents: async (jobId: string): Promise<JobEvent[]> => {
        const dtos = await fetchInternal<EventDTO[]>(`/jobs/${jobId}/events`);
        return dtos.map(dto => ({
            id: dto.eventId,
            jobId: dto.jobId,
            type: dto.type,
            note: dto.note,
            createdAt: dto.createdAt
        }));
    },

    createJobEvent: async (jobId: string, data: { type: string; note: string; stage: string }) => {
        return fetchInternal(`/jobs/${jobId}/events`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
};
