import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RoomUpdateConfirmationProps {
  roomNumber: string;
  field: string;
  currentValue: string | null;
  newValue: string | null;
  onConfirm: () => void;
  onDecline: () => void;
}

export function RoomUpdateConfirmation({
  roomNumber,
  field,
  currentValue,
  newValue,
  onConfirm,
  onDecline,
}: RoomUpdateConfirmationProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Confirm Room Update</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Room Number</p>
              <p className="text-lg">{roomNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Field</p>
              <p className="text-lg">{field}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Current Value</p>
              <p className="text-lg">{currentValue || 'None'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">New Value</p>
              <p className="text-lg">{newValue || 'None'}</p>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={onDecline}>
              Decline
            </Button>
            <Button onClick={onConfirm}>
              Accept
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 