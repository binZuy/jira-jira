import { memo } from 'react';

interface Task {
  id: string;
  name: string;
  status: string;
  priority?: string;
  description?: string;
  dueDate?: string;
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
  capacity?: number;
  equipment?: string[];
  features?: string[];
  lastMaintenance?: string;
  nextScheduledMaintenance?: string;
  notes?: string;
  tasks?: Task[];
}

function PureRoomInfo({
  roomNumber,
  roomType = '',
  priority = '',
  status = '',
  roomStatus = '',
  linen = '',
  checkInTime = null,
  checkOutTime = null,
  capacity = 30,
  equipment = [],
  features = [],
  lastMaintenance = '2024-03-15',
  nextScheduledMaintenance = '2024-06-15',
  notes = '',
  tasks = [],
}: RoomInfoProps) {
  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold text-gray-700 mb-4">Room {roomNumber} Information</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {roomType && (
          <div>
            <p className="text-sm text-gray-500">Room Type</p>
            <p className="font-medium">{roomType}</p>
          </div>
        )}
        
        {priority && (
          <div>
            <p className="text-sm text-gray-500">Priority</p>
            <p className="font-medium">{priority}</p>
          </div>
        )}
        
        {status && (
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium">{status}</p>
          </div>
        )}
        
        {roomStatus && (
          <div>
            <p className="text-sm text-gray-500">Room Status</p>
            <p className="font-medium">{roomStatus}</p>
          </div>
        )}
        
        {linen && (
          <div>
            <p className="text-sm text-gray-500">Linen</p>
            <p className="font-medium">{linen}</p>
          </div>
        )}
        
        {checkInTime && (
          <div>
            <p className="text-sm text-gray-500">Check In Time</p>
            <p className="font-medium">{checkInTime}</p>
          </div>
        )}
        
        {checkOutTime && (
          <div>
            <p className="text-sm text-gray-500">Check Out Time</p>
            <p className="font-medium">{checkOutTime}</p>
          </div>
        )}
        
        {capacity > 0 && (
          <div>
            <p className="text-sm text-gray-500">Capacity</p>
            <p className="font-medium">{capacity}</p>
          </div>
        )}
        
        {equipment?.length > 0 && (
          <div>
            <p className="text-sm text-gray-500">Equipment</p>
            <p className="font-medium">{equipment.join(', ')}</p>
          </div>
        )}
        
        {features?.length > 0 && (
          <div>
            <p className="text-sm text-gray-500">Features</p>
            <p className="font-medium">{features.join(', ')}</p>
          </div>
        )}
        
        {lastMaintenance && (
          <div>
            <p className="text-sm text-gray-500">Last Maintenance</p>
            <p className="font-medium">{lastMaintenance}</p>
          </div>
        )}
        
        {nextScheduledMaintenance && (
          <div>
            <p className="text-sm text-gray-500">Next Maintenance</p>
            <p className="font-medium">{nextScheduledMaintenance}</p>
          </div>
        )}
        
        {notes && (
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Notes</p>
            <p className="font-medium">{notes}</p>
          </div>
        )}
        
        {tasks.length > 0 && (
          <div className="col-span-2 mt-4">
            <p className="text-sm text-gray-500 mb-2">Associated Tasks</p>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Task</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Priority</th>
                    <th className="px-3 py-2 text-left">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id} className="border-t">
                      <td className="px-3 py-2">{task.name}</td>
                      <td className="px-3 py-2">{task.status}</td>
                      <td className="px-3 py-2">{task.priority || '-'}</td>
                      <td className="px-3 py-2">{task.dueDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const RoomInfo = memo(PureRoomInfo); 