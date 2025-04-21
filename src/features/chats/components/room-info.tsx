import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, User, Clock, Bed, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatEnumValue } from '@/lib/utils';

interface Task {
  id: string;
  name: string;
  status: string;
  priority?: string;
  description?: string;
  dueDate?: string;
  assigneeName?: string;
}

interface RoomInfoProps {
  roomNumber: string;
  roomType?: string;
  priority?: string;
  status?: string;
  roomStatus?: string;
  linen?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  tasks?: Task[];
  assigneeName?: string;
  dueDate?: string;
}

// Map status values to tailwind classes for badge styling
const statusColorMap: Record<string, string> = {
  'TO_DO': 'bg-slate-100 text-slate-800 hover:bg-slate-100',
  'TODO': 'bg-slate-100 text-slate-800 hover:bg-slate-100',
  'IN_PROGRESS': 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  'DONE': 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  'OUT_OF_SERVICE': 'bg-red-100 text-red-800 hover:bg-red-100',
  'DO_NOT_DISTURB': 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  'READY_FOR_INSPECTION': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  'default': 'bg-slate-100 text-slate-800 hover:bg-slate-100',
};

// Map priority values to tailwind classes for badge styling
const priorityColorMap: Record<string, string> = {
  'HIGH': 'bg-red-100 text-red-800 hover:bg-red-100',
  'MEDIUM': 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  'LOW': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  'default': 'bg-slate-100 text-slate-800 hover:bg-slate-100',
};

function PureRoomInfo({
  roomNumber,
  roomType = '',
  priority = '',
  status = '',
  roomStatus = '',
  linen = '',
  checkInTime = null,
  checkOutTime = null,
  tasks = [],
  assigneeName = '',
  dueDate = '',
}: RoomInfoProps) {
  // Format due date if exists
  const formattedDueDate = dueDate ? 
    formatDistanceToNow(new Date(dueDate), { addSuffix: true }) : 
    '';

  return (
    <Card className="w-full overflow-hidden border rounded-lg shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border-b gap-2">
        <CardTitle className="text-lg sm:text-xl font-bold text-slate-800 break-words">
          Room {roomNumber} {roomType && `- ${formatEnumValue(roomType)}`}
        </CardTitle>
        
        <div className="flex flex-wrap items-center gap-2">
          {priority && (
            <Badge className={priorityColorMap[priority] || priorityColorMap.default} variant="outline">
              {formatEnumValue(priority)}
            </Badge>
          )}
          
          {status && (
            <Badge className={statusColorMap[status] || statusColorMap.default} variant="outline">
              {formatEnumValue(status)}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Task description area */}
        {tasks.length > 0 && tasks[0].description && (
          <div className="p-4 border-b bg-white">
            <p className="text-sm text-slate-700">{tasks[0].description}</p>
          </div>
        )}
        
        {/* Room details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white">
          {roomStatus && (
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500">Room Status</p>
                <p className="text-sm font-medium">{formatEnumValue(roomStatus)}</p>
              </div>
            </div>
          )}
          
          {linen && (
            <div className="flex items-center gap-2">
              <Bed className="size-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500">Linen</p>
                <p className="text-sm font-medium">{formatEnumValue(linen)}</p>
              </div>
            </div>
          )}
          
          {assigneeName && (
            <div className="flex items-center gap-2">
              <User className="size-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500">Assignee</p>
                <p className="text-sm font-medium">{assigneeName}</p>
              </div>
            </div>
          )}
          
          {formattedDueDate && (
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500">Due</p>
                <p className="text-sm font-medium">{formattedDueDate}</p>
              </div>
            </div>
          )}
          
          {checkInTime && (
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500">Check In</p>
                <p className="text-sm font-medium">{checkInTime}</p>
              </div>
            </div>
          )}
          
          {checkOutTime && (
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500">Check Out</p>
                <p className="text-sm font-medium">{checkOutTime}</p>
              </div>
            </div>
          )}
        </div>
        
      </CardContent>
    </Card>
  );
}

// Use React.memo to prevent unnecessary re-renders
const RoomInfo = memo(PureRoomInfo);

export default RoomInfo; 