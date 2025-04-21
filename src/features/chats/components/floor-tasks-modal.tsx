import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClipboardList, Loader2 } from 'lucide-react';
import { type FloorSummary } from '../schemas';
import RoomInfo from './room-info';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Utility function to get color based on status
const getStatusColor = (status: string) => {
  if (!status) return 'bg-slate-100';
  
  const statusMap: Record<string, string> = {
    'TODO': 'bg-slate-100',
    'TO_DO': 'bg-slate-100',
    'IN_PROGRESS': 'bg-amber-100',
    'DONE': 'bg-emerald-100',
    'OUT_OF_SERVICE': 'bg-red-100',
  };
  
  return statusMap[status] || 'bg-slate-100';
};

interface FloorTasksModalProps {
  floor: FloorSummary;
}

interface RoomDetails {
  roomNumber: string;
  roomType?: string;
  priority?: string;
  status?: string;
  roomStatus?: string;
  linen?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  tasks?: Array<{
    id: string;
    name: string;
    status: string;
    priority?: string;
    description?: string;
    dueDate?: string;
    assigneeName?: string;
  }>;
  assigneeName?: string;
  dueDate?: string;
  error?: string;
}

const FloorTasksModal = ({ floor }: FloorTasksModalProps) => {
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string | null>(null);
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch room details when a room is selected
  useEffect(() => {
    if (!selectedRoomNumber) {
      setRoomDetails(null);
      return;
    }
    
    const fetchRoomDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/chat/getRoomInfo?roomNumber=${selectedRoomNumber}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          setRoomDetails(null);
        } else {
          setRoomDetails(data);
        }
      } catch (err) {
        setError('Failed to fetch room details. Please try again.');
        console.error('Error fetching room details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoomDetails();
  }, [selectedRoomNumber]);

  // Extract all tasks from rooms for the "All Tasks" tab
  const allTasks = floor.rooms.flatMap(room => {
    const baseTasks = Array(room.taskCount).fill(0).map((_, i) => ({
      id: `task-${room.roomNumber}-${i}`,
      roomNumber: room.roomNumber,
      name: `Task ${i+1} for Room ${room.roomNumber}`,
      status: i % 3 === 0 ? 'DONE' : i % 2 === 0 ? 'IN_PROGRESS' : 'TODO'
    }));
    
    // If we have actual task data for this room, use it
    if (roomDetails && roomDetails.roomNumber === room.roomNumber && roomDetails.tasks) {
      return roomDetails.tasks.map(task => ({
        ...task,
        roomNumber: room.roomNumber
      }));
    }
    
    return baseTasks;
  });
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 mt-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
        >
          <ClipboardList className="h-4 w-4" />
          <span>View Floor {floor.floor} Tasks</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Floor {floor.floor} Tasks ({floor.totalTasks})
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="rooms" className="mt-4">
          <TabsList className="mb-4">
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="tasks">All Tasks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="rooms" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {floor.rooms.map(room => (
                <Card 
                  key={room.roomNumber}
                  className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${
                    selectedRoomNumber === room.roomNumber ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedRoomNumber(room.roomNumber)}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-medium">Room {room.roomNumber}</span>
                    <Badge variant="outline">
                      {room.taskCount} Tasks
                    </Badge>
                    {room.activeTaskCount !== undefined && room.activeTaskCount > 0 && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700">
                        {room.activeTaskCount} Active
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            
            {selectedRoomNumber && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Room {selectedRoomNumber} Details</h3>
                
                {loading && (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                )}
                
                {error && (
                  <div className="p-4 border rounded-lg bg-red-50 text-red-700">
                    <p>{error}</p>
                  </div>
                )}
                
                {!loading && !error && roomDetails && (
                  <RoomInfo
                    roomNumber={roomDetails.roomNumber}
                    roomType={roomDetails.roomType}
                    priority={roomDetails.priority}
                    status={roomDetails.status}
                    roomStatus={roomDetails.roomStatus}
                    linen={roomDetails.linen}
                    checkInTime={roomDetails.checkInTime}
                    checkOutTime={roomDetails.checkOutTime}
                    tasks={roomDetails.tasks}
                    assigneeName={roomDetails.assigneeName}
                    dueDate={roomDetails.dueDate}
                  />
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="tasks" className="space-y-4">
            <div className="border rounded-lg divide-y">
              {allTasks.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  No tasks found for this floor.
                </div>
              ) : (
                allTasks.map(task => (
                  <div 
                    key={task.id}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedRoomNumber(task.roomNumber)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`} />
                      <span className="font-medium">{task.name}</span>
                    </div>
                    <Badge variant="outline">Room {task.roomNumber}</Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-4 flex justify-end">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FloorTasksModal; 