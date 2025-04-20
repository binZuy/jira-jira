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
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="text-sm text-gray-500">{field}</div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{currentValue || 'Not set'}</span>
            <span className="text-gray-400">→</span>
            <span className="font-medium text-blue-600">{newValue || 'Not set'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDecline}
            disabled={isDisabled}
          >
            Decline
          </Button>
          <Button 
            size="sm" 
            onClick={handleConfirm}
            disabled={isDisabled}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

export const RoomUpdatePreview = memo(PureRoomUpdatePreview); 