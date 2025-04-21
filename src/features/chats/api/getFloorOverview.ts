import { NextRequest, NextResponse } from 'next/server';
import { getFloorOverview } from '../libs/ai/tools/get-floor-overview';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const floor = searchParams.get('floor');
    
    // Parse floor to number or undefined if not provided
    const floorNumber = floor ? parseInt(floor, 10) : undefined;
    
    // Call the tool function
    const result = await getFloorOverview.execute({
      floor: floorNumber
    }, {
      toolCallId: `get-floor-overview-${Date.now()}`,
      messages: []
    });
    
    // Return the result
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in getFloorOverview API route:', error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 