import { NextRequest, NextResponse } from 'next/server';
import { createCRMClient } from '@/lib/mcp';
import { ContactInput } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;

    const crmClient = createCRMClient();

    // Get contact details
    const contactResult = await crmClient.getContact(contactId);

    if (!contactResult.success) {
      return NextResponse.json(
        { error: 'Contact not found', details: contactResult.error },
        { status: 404 }
      );
    }

    // Get opportunities for this contact
    const opportunitiesResult = await crmClient.getContactOpportunities(contactId);

    return NextResponse.json({
      success: true,
      contact: contactResult.data,
      opportunities: opportunitiesResult.success ? opportunitiesResult.data?.items || [] : [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error fetching contact:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    const body = await request.json();

    // Validate input
    const allowedFields = [
      'firstName', 'lastName', 'name', 'email', 'phone', 
      'address1', 'city', 'state', 'postalCode', 'country',
      'website', 'timezone', 'dnd', 'tags', 'customFields', 'source'
    ];

    const updateData: Partial<ContactInput> = {};
    
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        (updateData as Record<string, unknown>)[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    const crmClient = createCRMClient();

    // First get the existing contact
    const existingContactResult = await crmClient.getContact(contactId);
    
    if (!existingContactResult.success) {
      return NextResponse.json(
        { error: 'Contact not found', details: existingContactResult.error },
        { status: 404 }
      );
    }

    // Merge with existing data
    const mergedData = {
      ...existingContactResult.data,
      ...updateData
    };

    // Update the contact
    const updateResult = await crmClient.upsertContact(mergedData);

    if (!updateResult.success) {
      return NextResponse.json(
        { error: 'Failed to update contact', details: updateResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      contact: updateResult.data,
      updated: Object.keys(updateData),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error updating contact:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

