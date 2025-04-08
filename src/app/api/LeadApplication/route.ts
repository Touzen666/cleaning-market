import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { headers } from 'next/headers';

const prisma = new PrismaClient();

// Allowed origins
const ALLOWED_ORIGINS = [
    'https://zlote-wynajmy.pl',
    'https://zlote-wynajmy.vercel.app',
    process.env.NEXT_PUBLIC_FRONTEND_URL ?? '',
    'http://localhost:3000',
].filter(Boolean);

interface LeadApplicationRequest {
    firstName: string;
    lastName: string;
    phone?: string;
    email: string;
    message?: string;
    apartmentId?: number;
}

function getOrigin(requestOrigin: string | null | undefined): string {
    const defaultOrigin = ALLOWED_ORIGINS[0] ?? 'https://zlote-wynajmy.pl';
    if (!requestOrigin || !ALLOWED_ORIGINS.includes(requestOrigin)) {
        return defaultOrigin;
    }
    return requestOrigin;
}

export async function OPTIONS() {
    const headersList = await headers();
    const origin = getOrigin(headersList.get('origin'));
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin',
            'Access-Control-Allow-Credentials': 'true',
        },
    });
}

export async function POST(request: Request) {
    try {
        const origin = getOrigin(request.headers.get('origin'));
        const responseHeaders = {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin',
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'application/json',
        } satisfies Record<string, string>;

        // Log the incoming request
        console.log('Received request:', {
            method: request.method,
            headers: Object.fromEntries(request.headers),
            origin: origin,
            environment: process.env.NODE_ENV
        });

        const data = await request.json() as LeadApplicationRequest;
        console.log('Received data:', data);

        // Validate required fields
        if (!data.firstName || !data.lastName || !data.email) {
            console.log('Validation failed:', { data });
            return NextResponse.json(
                {
                    error: 'Missing required fields',
                    details: {
                        firstName: !data.firstName ? 'First name is required' : null,
                        lastName: !data.lastName ? 'Last name is required' : null,
                        email: !data.email ? 'Email is required' : null,
                    }
                },
                {
                    status: 400,
                    headers: responseHeaders
                }
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

        console.log('Created lead application:', leadApplication);

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
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin',
                    'Access-Control-Allow-Credentials': 'true',
                    'Content-Type': 'application/json',
                }
            }
        );
    }
} 