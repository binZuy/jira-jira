import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';

interface RoomUpdatePreviewProps {
  roomNumber: string;
  field: string;
  currentValue: string | null;
  newValue: string | null;
  onConfirm?: () => void;
  onDecline?: () => void;
}

// Format enum values to be more user-friendly
function formatValueDisplay(value: string | null): string {
  if (!value) return 'Not set';
  
  // Handle special cases
  if (value === 'TODO') return 'To Do';
  
  // Replace underscores with spaces and convert to title case
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function PureRoomUpdatePreview({
  roomNumber,
  field,
  currentValue,
  newValue,
  onConfirm,
  onDecline,
}: RoomUpdatePreviewProps) {
  const [isDisabled, setIsDisabled] = useState(false);

  const handleConfirm = () => {
    setIsDisabled(true);
    onConfirm?.();
  };

  const handleDecline = () => {
    setIsDisabled(true);
    onDecline?.();
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-500 mb-1">
            Room {roomNumber} - {field}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{formatValueDisplay(currentValue)}</span>
            <span className="text-gray-400">→</span>
            <span className="font-medium text-blue-600">{formatValueDisplay(newValue)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDecline}
            disabled={isDisabled}
            className="flex-1 sm:flex-auto"
          >
            Decline
          </Button>
          <Button 
            size="sm" 
            onClick={handleConfirm}
            disabled={isDisabled}
            className="flex-1 sm:flex-auto"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

export const RoomUpdatePreview = memo(PureRoomUpdatePreview); 