import { memo } from 'react';

interface RoomInfoProps {
  roomNumber: string;
  capacity?: number;
  equipment?: string[];
  features?: string[];
  status?: string;
  lastMaintenance?: string;
  nextScheduledMaintenance?: string;
  notes?: string;
}

function PureRoomInfo({
  roomNumber,
  capacity = 30,
  equipment = [],
  features = [],
  status = 'Available',
  lastMaintenance = '2024-03-15',
  nextScheduledMaintenance = '2024-06-15',
  notes = '',
}: RoomInfoProps) {
  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold text-gray-700 mb-4">Room {roomNumber} Information</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Capacity</p>
          <p className="font-medium">{capacity}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Equipment</p>
          <p className="font-medium">{equipment.join(', ') || 'None'}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Features</p>
          <p className="font-medium">{features.join(', ') || 'None'}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Status</p>
          <p className="font-medium">{status}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Last Maintenance</p>
          <p className="font-medium">{lastMaintenance}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Next Maintenance</p>
          <p className="font-medium">{nextScheduledMaintenance}</p>
        </div>
        
        <div className="col-span-2">
          <p className="text-sm text-gray-500">Notes</p>
          <p className="font-medium">{notes || 'No notes'}</p>
        </div>
      </div>
    </div>
  );
}

export const RoomInfo = memo(PureRoomInfo); 