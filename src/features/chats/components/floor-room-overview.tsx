import { memo } from 'react';
import { type FloorRoomOverviewOutput, type FloorSummary, type RoomTaskSummary } from '../schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, DoorClosed, Hammer, CheckCircle, CircleDashed } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import FloorTasksModal from './floor-tasks-modal';

interface FloorRoomOverviewProps {
  data: FloorRoomOverviewOutput;
}

function FloorCard({ floor }: { floor: FloorSummary }) {
  // Calculate progress percentage
  const completedTasksCount = floor.rooms.reduce(
    (sum, room) => sum + (room.completedTaskCount || 0), 
    0
  );
  const progressPercentage = floor.totalTasks > 0 
    ? Math.round((completedTasksCount / floor.totalTasks) * 100) 
    : 100;

  return (
    <Card className="w-full overflow-hidden border rounded-lg shadow-sm mb-6">
      <CardHeader className="flex flex-row items-center justify-between p-4 bg-slate-50 border-b">
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-slate-700" />
          <CardTitle className="text-lg font-bold text-slate-800">
            Floor {floor.floor}
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
            {floor.totalRooms} Rooms
          </Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
            {floor.totalTasks} Tasks
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Progress value={progressPercentage} className="h-2 flex-1" />
          <span className="text-sm font-medium text-slate-600">
            {progressPercentage}%
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {floor.rooms.map((room) => (
            <RoomCard key={room.roomNumber} room={room} />
          ))}
        </div>

        {floor.totalTasks > 0 && (
          <div className="mt-4 flex justify-center">
            <FloorTasksModal floor={floor} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoomCard({ room }: { room: RoomTaskSummary }) {
  const activeCount = room.activeTaskCount || 0;
  const completedCount = room.completedTaskCount || 0;
  
  return (
    <Card className="border rounded-md shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <DoorClosed className="h-4 w-4 text-slate-600" />
            <span className="font-medium">Room {room.roomNumber}</span>
          </div>
          <Badge 
            variant="outline" 
            className={room.taskCount > 0 
              ? "bg-amber-50 text-amber-700" 
              : "bg-slate-50 text-slate-700"
            }
          >
            {room.taskCount} Tasks
          </Badge>
        </div>
        
        {room.taskCount > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <CircleDashed className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-slate-600">{activeCount} Active</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-slate-600">{completedCount} Done</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PureFloorRoomOverview({ data }: FloorRoomOverviewProps) {
  if (!data.overview || data.overview.length === 0) {
    return (
      <Card className="w-full overflow-hidden border rounded-lg shadow-sm">
        <CardContent className="p-6 text-center">
          <p className="text-slate-500">No floor or room data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center gap-2 mb-2">
        <Hammer className="h-5 w-5 text-amber-600" />
        <h2 className="text-xl font-bold text-slate-800">Floor & Room Overview</h2>
      </div>
      
      {data.overview.map((floor) => (
        <FloorCard key={`floor-${floor.floor}`} floor={floor} />
      ))}
    </div>
  );
}

// Use React.memo to prevent unnecessary re-renders
const FloorRoomOverview = memo(PureFloorRoomOverview);

export default FloorRoomOverview; 