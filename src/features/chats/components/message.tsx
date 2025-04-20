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
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageEditor } from './message-editor';
import { DocumentPreview } from './document-preview';
import { MessageReasoning } from './message-reasoning';
import { UseChatHelpers } from '@ai-sdk/react';
import { RoomInfo } from './room-info';
import { RoomUpdatePreview } from './room-update-preview';

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
                        roomNumber={args.roomNumber || '101'}
                        roomType={args.roomType || ''}
                        priority={args.priority || ''}
                        status={args.status || ''}
                        roomStatus={args.roomStatus || ''}
                        linen={args.linen || ''}
                        checkInTime={args.checkInTime}
                        checkOutTime={args.checkOutTime}
                        capacity={args.capacity || 0}
                        equipment={args.equipment || []}
                        features={args.features || []}
                        lastMaintenance={args.lastMaintenance || ''}
                        nextScheduledMaintenance={args.nextScheduledMaintenance || ''}
                        notes={args.notes || ''}
                        tasks={args.tasks || []}
                      />
                    ) : toolName === 'updateRoomData' ? (
                      <RoomUpdatePreview
                        roomNumber={args.roomNumber}
                        field={args.field}
                        currentValue={args.currentValue}
                        newValue={args.newValue}
                      />
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
                          roomNumber={args?.roomNumber || '101'}
                          capacity={args?.capacity || 30}
                          equipment={args?.equipment || []}
                          features={args?.features || []}
                          status={args?.status || 'Available'}
                          lastMaintenance={args?.lastMaintenance || '2024-03-15'}
                          nextScheduledMaintenance={args?.nextScheduledMaintenance || '2024-06-15'}
                          notes={args?.notes || ''}
                          tasks={args?.tasks || []}
                        />
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
                          roomNumber={result?.roomNumber || '101'}
                          roomType={result?.roomType || ''}
                          priority={result?.priority || ''}
                          status={result?.status || ''}
                          roomStatus={result?.roomStatus || ''}
                          linen={result?.linen || ''}
                          checkInTime={result?.checkInTime}
                          checkOutTime={result?.checkOutTime}
                          capacity={result?.capacity || 0}
                          equipment={result?.equipment || []}
                          features={result?.features || []}
                          lastMaintenance={result?.lastMaintenance || ''}
                          nextScheduledMaintenance={result?.nextScheduledMaintenance || ''}
                          notes={result?.notes || ''}
                          tasks={result?.tasks || []}
                        />
                      ) : toolName === 'updateRoomData' ? (
                        <RoomUpdatePreview
                          roomNumber={result?.data?.roomNumber}
                          field={result?.data?.field}
                          currentValue={result?.data?.currentValue}
                          newValue={result?.data?.newValue}
                          onConfirm={() => {
                            // Add a message indicating the update was accepted
                            setMessages(prev => [
                              ...prev,
                              {
                                id: Date.now().toString(),
                                role: 'assistant',
                                content: `Room ${result?.data?.roomNumber} ${result?.data?.field} has been updated to "${result?.data?.newValue}"`,
                              }
                            ]);
                          }}
                          onDecline={() => {
                            // Add a message indicating the update was declined
                            setMessages(prev => [
                              ...prev,
                              {
                                id: Date.now().toString(),
                                role: 'assistant',
                                content: 'Update declined. No changes were made.',
                              }
                            ]);
                          }}
                        />
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
