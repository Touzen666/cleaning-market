import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { headers } from 'next/headers';

const prisma = new PrismaClient();

// Allowed origins with guaranteed default
const ALLOWED_ORIGINS = [
    'https://zlote-wynajmy.pl',
    'http://zlote-wynajmy.pl',
    'https://www.zlote-wynajmy.pl',
    'http://www.zlote-wynajmy.pl'
] as const;

const DEFAULT_ORIGIN = ALLOWED_ORIGINS[0];

interface LeadApplicationRequest {
    firstName: string;
    lastName: string;
    phone?: string;
    email: string;
    message?: string;
    apartmentId?: number;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': DEFAULT_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
} as const;

// Handle preflight requests
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders
    });
}

export async function POST(request: Request) {
    try {
        // Get and validate origin
        const requestOrigin = request.headers.get('origin');
        if (!requestOrigin || !ALLOWED_ORIGINS.includes(requestOrigin.toLowerCase() as typeof ALLOWED_ORIGINS[number])) {
            return NextResponse.json(
                { error: 'Unauthorized origin' },
                {
                    status: 403,
                    headers: {
                        'Access-Control-Allow-Origin': DEFAULT_ORIGIN,
                        'Content-Type': 'application/json',
                    }
                }
            );
        }

        // Set CORS headers
        const responseHeaders = {
            'Access-Control-Allow-Origin': requestOrigin,
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin',
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'application/json',
        } as const;

        // Parse and validate request body
        const rawData = await request.json() as unknown;
        const data = validateLeadApplication(rawData);

        // Validate required fields
        if (!data.firstName || !data.lastName || !data.email) {
            return NextResponse.json(
                {
                    error: 'Missing required fields',
                    details: {
                        firstName: !data.firstName ? 'First name is required' : null,
                        lastName: !data.lastName ? 'Last name is required' : null,
                        email: !data.email ? 'Email is required' : null,
                    }
                },
                { status: 400, headers: responseHeaders }
            );
        }

        // Create the lead application
        const leadApplication = await prisma.leadApplication.create({
            data: {
                name: data.firstName,
                surname: data.lastName,
                phone: data.phone ?? '',
                email: data.email,
                message: data.message ?? null,
            }
        });

        // Return success response
        return NextResponse.json(
            {
                success: true,
                data: leadApplication,
                message: 'Lead application created successfully'
            },
            {
                status: 201,
                headers: responseHeaders
            }
        );
    } catch (error) {
        console.error('Error creating lead application:', error);
        return NextResponse.json(
            {
                error: 'Failed to create lead application',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            {
                status: 500,
                headers: corsHeaders
            }
        );
    }
}

function validateLeadApplication(data: unknown): LeadApplicationRequest {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid request data');
    }

    const payload = data as Record<string, unknown>;

    if (typeof payload.firstName !== 'string' ||
        typeof payload.lastName !== 'string' ||
        typeof payload.email !== 'string') {
        throw new Error('Missing required fields');
    }

    return {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: typeof payload.phone === 'string' ? payload.phone : undefined,
        message: typeof payload.message === 'string' ? payload.message : undefined,
        apartmentId: typeof payload.apartmentId === 'number' ? payload.apartmentId : undefined,
    };
} 