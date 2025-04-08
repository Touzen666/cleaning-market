import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { headers } from 'next/headers';

const prisma = new PrismaClient();

const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://zlote-wynajmy.pl',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders
    });
}

export async function POST(request: Request) {
    try {
        const responseHeaders = {
            ...corsHeaders,
            'Content-Type': 'application/json'
        };

        // Parse and validate request body
        const rawData = await request.json() as unknown;
        const data = validateLeadApplication(rawData);

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

interface LeadApplicationRequest {
    firstName: string;
    lastName: string;
    phone?: string;
    email: string;
    message?: string;
    apartmentId?: number;
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