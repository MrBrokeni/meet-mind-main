// src/components/MeetingSidebar.tsx
'use client';

import * as React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSkeleton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trash2, FileAudio, Clock, CalendarDays } from 'lucide-react';
import type { RecordingMetadata } from '@/lib/db';
import { deleteRecording } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MeetingSidebarProps {
  recordings: RecordingMetadata[];
  isLoading: boolean;
  onSelectRecording: (id: number) => void;
  onRecordingsUpdate: () => void; // Callback to notify parent about deletion
  className?: string;
}

export function MeetingSidebar({
  recordings,
  isLoading,
  onSelectRecording,
  onRecordingsUpdate,
  className,
}: MeetingSidebarProps) {
  const { toast } = useToast();
  const [recordingToDelete, setRecordingToDelete] = React.useState<number | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
     e.stopPropagation(); // Prevent triggering select
     setRecordingToDelete(id);
  }

  const confirmDelete = async () => {
    if (recordingToDelete === null) return;

    try {
        await deleteRecording(recordingToDelete);
        toast({
            title: "Recording Deleted",
            description: "The meeting recording has been successfully deleted.",
            variant: "default",
        });
        onRecordingsUpdate(); // Refresh the list in the parent component
    } catch (error) {
        console.error("Failed to delete recording:", error);
        toast({
            title: "Deletion Failed",
            description: `Could not delete the recording. ${error instanceof Error ? error.message : ''}`,
            variant: "destructive",
        });
    } finally {
        setRecordingToDelete(null); // Close the dialog
    }
  };

  const formatDuration = (seconds: number): string => {
     const minutes = Math.floor(seconds / 60);
     const remainingSeconds = Math.floor(seconds % 60);
     return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return (
    <>
      <Sidebar className={className}>
        <SidebarHeader className="sticky top-0 z-20 bg-sidebar/80 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileAudio className="w-5 h-5" />
              Recordings
            </h2>
            {/* SidebarTrigger might be better placed outside this component */}
            {/* <SidebarTrigger /> */}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <ScrollArea className="h-full px-2"> {/* Add padding to ScrollArea */}
            {isLoading ? (
              <SidebarMenu>
                {[...Array(5)].map((_, i) => (
                  <SidebarMenuItem key={i}>
                     <SidebarMenuSkeleton showIcon={true} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : recordings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                  <Clock size={40} className="mb-3" />
                  <p className="text-sm">No recordings yet.</p>
                  <p className="text-xs mt-1">Start a recording to save it here.</p>
              </div>
            ) : (
              <SidebarMenu>
                {recordings.map((rec) => (
                  <SidebarMenuItem key={rec.id}>
                    <SidebarMenuButton
                      onClick={() => onSelectRecording(rec.id)}
                      className="h-auto py-2 flex flex-col items-start justify-start hover:bg-sidebar-accent/60 transition-colors"
                      tooltip={{
                          children: (
                              <div>
                                  <p>Load: {rec.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                     Recorded: {format(new Date(rec.timestamp), 'Pp')}
                                  </p>
                              </div>
                          ),
                          side: 'right',
                          align: 'center'
                      }}
                    >
                      <span className="font-medium text-sm w-full truncate">{rec.name}</span>
                      <div className="flex justify-between w-full text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                            <CalendarDays size={12} /> {formatDistanceToNow(new Date(rec.timestamp), { addSuffix: true })}
                        </span>
                         <span className="flex items-center gap-1">
                            <Clock size={12} /> {formatDuration(rec.duration)}
                         </span>
                      </div>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      onClick={(e) => handleDeleteClick(e, rec.id)}
                      aria-label={`Delete recording ${rec.name}`}
                      className="top-1/2 -translate-y-1/2"
                    >
                      <Trash2 className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter>
            <Badge variant="outline" className="mx-auto text-xs">
                {recordings.length} recording{recordings.length !== 1 ? 's' : ''} saved locally
            </Badge>
        </SidebarFooter>
      </Sidebar>

       {/* Confirmation Dialog */}
       <AlertDialog open={recordingToDelete !== null} onOpenChange={(open) => !open && setRecordingToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the selected meeting recording from your local storage.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRecordingToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
       </AlertDialog>
    </>
  );
}
