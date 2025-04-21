import { NextResponse } from 'next/server';
import { getFloorOverview } from '@/features/chats/libs/ai/tools/get-floor-overview';

export async function GET(req: Request) {
  try {
    // Get floor from query parameters
    const url = new URL(req.url);
    const floor = url.searchParams.get('floor');
    
    console.log(`API - getFloorOverview: floor: ${floor || 'all'}`);
    
    // Parse floor parameter if provided
    const floorNumber = floor ? parseInt(floor, 10) : undefined;
    
    // Execute the tool function
    const result = await getFloorOverview.execute({
      floor: floorNumber
    }, {
      toolCallId: `get-floor-overview-${Date.now()}`,
      messages: []
    });
    
    console.log(`API - Retrieved floor overview${floor ? ` for floor ${floor}` : ''}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API - Unexpected error in getFloorOverview:', error);
    return NextResponse.json({ 
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 