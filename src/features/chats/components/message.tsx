/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import type { UIMessage } from 'ai';
import cx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState } from 'react';
import { DocumentToolCall, DocumentToolResult } from './document';
import { PencilEditIcon, SparklesIcon } from './icons';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from './preview-attachment';
import { Weather } from './weather';
import equal from 'fast-deep-equal';
import { cn, generateID } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageEditor } from './message-editor';
import { DocumentPreview } from './document-preview';
import { MessageReasoning } from './message-reasoning';
import { UseChatHelpers } from '@ai-sdk/react';
import RoomInfo from './room-info';
import { RoomUpdatePreview } from './room-update-preview';
import FloorRoomOverview from './floor-room-overview';

interface ToolCallPart {
  type: 'tool-call';
  toolName: string;
  args: Record<string, any>;
  toolCallId: string;
}

interface ToolInvocationPart {
  type: 'tool-invocation';
  toolInvocation: {
    toolName: string;
    toolCallId: string;
    state: 'call' | 'result' | 'partial-call';
    args?: Record<string, any>;
    result?: any;
  };
}

interface ReasoningPart {
  type: 'reasoning';
  reasoning: string;
}

type MessagePart = 
  | { type: 'text'; text: string }
  | { type: 'source' }
  | { type: 'file' }
  | { type: 'step-start' }
  | ToolCallPart
  | ToolInvocationPart
  | ReasoningPart;

const PurePreviewMessage = ({
  // chatId,
  message,
  // vote,
  isLoading,
  setMessages,
  reload,
  isReadonly,
}: {
  // chatId: string;
  message: UIMessage;
  // vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            'flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl',
            {
              'w-full': mode === 'edit',
              'group-data-[role=user]/message:w-fit': mode !== 'edit',
            },
          )}
        >
          {message.role === 'assistant' && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 w-full">
            {message.experimental_attachments && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row justify-end gap-2"
              >
                {message.experimental_attachments.map((attachment: { url: string }) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}

            {message.parts?.map((part: MessagePart, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === 'reasoning') {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.reasoning}
                  />
                );
              }

              if (type === 'text') {
                if (mode === 'view') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {message.role === 'user' && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                              onClick={() => {
                                setMode('edit');
                              }}
                            >
                              <PencilEditIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        data-testid="message-content"
                        className={cn('flex flex-col gap-4', {
                          'bg-primary text-primary-foreground px-3 py-2 rounded-xl':
                            message.role === 'user',
                        })}
                      >
                        <Markdown>{part.text}</Markdown>
                      </div>
                    </div>
                  );
                }

                if (mode === 'edit') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <div className="size-8" />

                      <MessageEditor
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        reload={reload}
                      />
                    </div>
                  );
                }
              }

              if (type === 'tool-call') {
                const { toolName, args, toolCallId } = part;

                return (
                  <div
                    key={toolCallId}
                    className={cx({
                      skeleton: ['getWeather', 'getRoomInfo', 'updateRoomData'].includes(toolName),
                    })}
                  >
                    {toolName === 'getWeather' ? (
                      <Weather />
                    ) : toolName === 'createDocument' ? (
                      <DocumentPreview isReadonly={isReadonly} args={args} />
                    ) : toolName === 'updateDocument' ? (
                      <DocumentToolCall
                        type="update"
                        args={{ title: args?.title || '' }}
                        isReadonly={isReadonly}
                      />
                    ) : toolName === 'getRoomInfo' ? (
                      <RoomInfo
                        roomNumber={(args || {}).roomNumber || '101'}
                        roomType={(args || {}).roomType || ''}
                        priority={(args || {}).priority || ''}
                        status={(args || {}).status || ''}
                        roomStatus={(args || {}).roomStatus || ''}
                        linen={(args || {}).linen || ''}
                        checkInTime={(args || {}).checkInTime}
                        checkOutTime={(args || {}).checkOutTime}
                        tasks={(args || {}).tasks || []}
                        assigneeName={(args || {}).assigneeName || ''}
                        dueDate={(args || {}).dueDate || ''}
                      />
                    ) : toolName === 'getFloorOverview' ? (
                      <div className="flex justify-center items-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                      </div>
                    ) : toolName === 'updateRoomData' ? (
                      <RoomUpdatePreview
                        roomNumber={(args || {}).roomNumber || 'undefined'}
                        field={(args || {}).field || 'undefined'}
                        currentValue={(args || {}).currentValue || 'Not set'}
                        newValue={(args || {}).newValue || 'Not set'}
                      />
                    ) : toolName === 'confirmRoomUpdate' ? (
                      <div className="p-4 border rounded-lg bg-green-50">
                        <div className="flex items-center gap-2 text-green-700">
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <p className="font-medium">
                            Confirming update: Room {(args || {}).roomNumber} {(args || {}).field} will be changed to &quot;{(args || {}).newValue}&quot;
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              }

              if (type === 'tool-invocation') {
                const { toolInvocation } = part;
                const { toolName, toolCallId, state, result } = toolInvocation;

                if (state === 'call') {
                  const { args } = toolInvocation;

                  return (
                    <div
                      key={toolCallId}
                      className={cx({
                        skeleton: ['getWeather', 'getRoomInfo'].includes(toolName),
                      })}
                    >
                      {toolName === 'getWeather' ? (
                        <Weather />
                      ) : toolName === 'createDocument' ? (
                        <DocumentPreview isReadonly={isReadonly} args={args} />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolCall
                          type="update"
                          args={{ title: args?.title || '' }}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === 'getRoomInfo' ? (
                        <RoomInfo
                          roomNumber={(args || {}).roomNumber || '101'}
                          roomType={(args || {}).roomType || ''}
                          priority={(args || {}).priority || ''}
                          status={(args || {}).status || ''}
                          roomStatus={(args || {}).roomStatus || ''}
                          linen={(args || {}).linen || ''}
                          checkInTime={(args || {}).checkInTime}
                          checkOutTime={(args || {}).checkOutTime}
                          tasks={(args || {}).tasks || []}
                          assigneeName={(args || {}).assigneeName || ''}
                          dueDate={(args || {}).dueDate || ''}
                        />
                      ) : toolName === 'getFloorOverview' ? (
                        <div className="flex justify-center items-center p-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                        </div>
                      ) : null}
                    </div>
                  );
                }

                if (state === 'result') {
                  return (
                    <div key={toolCallId}>
                      {toolName === 'getWeather' ? (
                        <Weather weatherAtLocation={result} />
                      ) : toolName === 'createDocument' ? (
                        <DocumentPreview
                          isReadonly={isReadonly}
                          result={result}
                        />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolResult
                          type="update"
                          result={result}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === 'getRoomInfo' ? (
                        <RoomInfo
                          roomNumber={(result || {}).roomNumber || '101'}
                          roomType={(result || {}).roomType || ''}
                          priority={(result || {}).priority || ''}
                          status={(result || {}).status || ''}
                          roomStatus={(result || {}).roomStatus || ''}
                          linen={(result || {}).linen || ''}
                          checkInTime={(result || {}).checkInTime}
                          checkOutTime={(result || {}).checkOutTime}
                          tasks={(result || {}).tasks || []}
                          assigneeName={(result || {}).assigneeName || ''}
                          dueDate={(result || {}).dueDate || ''}
                        />
                      ) : toolName === 'getFloorOverview' ? (
                        result?.error ? (
                          <div className="p-4 border rounded-lg bg-red-50">
                            <div className="flex items-center gap-2 text-red-700">
                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              <p className="font-medium">
                                {result.error}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <FloorRoomOverview data={result} />
                        )
                      ) : toolName === 'updateRoomData' ? (
                        <RoomUpdatePreview
                          roomNumber={(result || {}).details?.room || (result || {}).data?.roomNumber || 'undefined'}
                          field={(result || {}).details?.field || (result || {}).data?.field || 'undefined'}
                          currentValue={(result || {}).details?.currentValue || (result || {}).data?.currentValue || 'Not set'}
                          newValue={(result || {}).details?.newValue || (result || {}).data?.newValue || 'Not set'}
                          onConfirm={() => {
                            // Only proceed if we have a valid roomId to update
                            if ((result || {}).details?.roomId) {
                              const roomNumber = (result || {}).details?.room;
                              const fieldName = (result || {}).details?.field;
                              const newValue = (result || {}).details?.newValue;
                              const roomId = (result || {}).details?.roomId;

                              console.log(`Calling confirmRoomUpdate with roomId: ${roomId}, field: ${fieldName}, value: ${newValue}`);
                              
                              // Create a loading message
                              setMessages(prev => [
                                ...prev,
                                {
                                  id: Date.now().toString(),
                                  role: 'assistant',
                                  content: `Updating room ${roomNumber}...`,
                                }
                              ]);

                              // Make the actual API call to update the room
                              fetch('/api/chat/confirmRoomUpdate', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  roomNumber,
                                  field: fieldName,
                                  newValue,
                                  roomId,
                                }),
                              })
                              .then(response => response.json())
                              .then(data => {
                                console.log('Update response:', data);
                                
                                // Add success/error message
                                setMessages(prev => [
                                  ...prev,
                                  {
                                    id: generateID(),
                                    role: 'assistant',
                                    content: data.error 
                                      ? `Failed to update: ${data.error}` 
                                      : `Room ${roomNumber} ${fieldName} has been updated to "${newValue}"`,
                                  }
                                ]);

                                // If update was successful, fetch and show updated room info
                                if (!data.error) {
                                  // First, add a message saying we're getting room info
                                  setMessages(prev => [
                                    ...prev,
                                    {
                                      id: generateID(),
                                      role: 'assistant',
                                      content: `Fetching updated information for Room ${roomNumber}...`,
                                    }
                                  ]);

                                  // Call the getRoomInfo API
                                  fetch(`/api/chat/getRoomInfo?roomNumber=${roomNumber}`, {
                                    method: 'GET',
                                    headers: {
                                      'Content-Type': 'application/json'
                                    }
                                  })
                                  .then(response => response.json())
                                  .then(roomData => {
                                    // Create a message with the tool result
                                    setMessages(prev => [
                                      ...prev,
                                      {
                                        id: generateID(),
                                        role: 'assistant',
                                        content: '',
                                        parts: [
                                          {
                                            type: 'tool-invocation',
                                            toolInvocation: {
                                              toolName: 'getRoomInfo',
                                              toolCallId: `room-info-${Date.now()}`,
                                              state: 'result',
                                              args: { roomNumber },
                                              result: roomData
                                            }
                                          }
                                        ]
                                      }
                                    ]);
                                  })
                                  .catch(error => {
                                    console.error('Error fetching room info:', error);
                                    setMessages(prev => [
                                      ...prev,
                                      {
                                        id: generateID(),
                                        role: 'assistant',
                                        content: `Failed to fetch room information: ${error.message || 'Unknown error'}`
                                      }
                                    ]);
                                  });
                                }
                              })
                              .catch(error => {
                                console.error('Error updating room:', error);
                                
                                // Add error message
                                setMessages(prev => [
                                  ...prev,
                                  {
                                    id: generateID(),
                                    role: 'assistant',
                                    content: `Failed to update: ${error.message || 'Unknown error'}`,
                                  }
                                ]);
                              });
                            } else {
                              // Add an error message if roomId is missing
                              setMessages(prev => [
                                ...prev,
                                {
                                  id: generateID(),
                                  role: 'assistant',
                                  content: 'Could not process update. Room ID is missing.',
                                }
                              ]);
                            }
                          }}
                          onDecline={() => {
                            // Add a message indicating the update was declined
                            setMessages(prev => [
                              ...prev,
                              {
                                id: generateID(),
                                role: 'assistant',
                                content: 'Update declined. No changes were made.',
                              }
                            ]);
                          }}
                        />
                      ) : toolName === 'confirmRoomUpdate' ? (
                        <div className="p-4 border rounded-lg bg-green-50">
                          <div className="flex items-center gap-2 text-green-700">
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <p className="font-medium">
                              {(result || {}).error 
                                ? `Update failed: ${(result || {}).error}` 
                                : `Update successful: Room ${(result || {}).data?.roomNumber || (result || {}).details?.roomNumber} ${(result || {}).data?.field || (result || {}).details?.field} has been changed to "${(result || {}).data?.newValue || (result || {}).details?.newValue}"`
                              }
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                }
              }
            })}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                // chatId={chatId}
                message={message}
                // vote={vote}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    // if (!equal(prevProps.vote, nextProps.vote)) return false;

    return true;
  },
);

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-3xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cx(
          'flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl',
          {
            'group-data-[role=user]/message:bg-muted': true,
          },
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            Hmm...
          </div>
        </div>
      </div>
    </motion.div>
  );
};
