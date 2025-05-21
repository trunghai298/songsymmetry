import React from 'react';
import { Playlist } from "@spotify/web-api-ts-sdk";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { DialogClose } from "@radix-ui/react-dialog";

interface PlaylistDialogProps {
  isOpen: boolean;
  playlist?: Playlist;
  onClose: () => void;
}

function PlaylistDialog({
  isOpen,
  playlist,
  onClose
}: PlaylistDialogProps) {
  const router = useRouter();
  
  return (
    <Dialog open={isOpen}>
      <DialogClose onClick={onClose}>
        <DialogContent className="rounded-3xl border-none p-8 bg-gray-900 flex flex-col justify-center text-center items-center">
          <DialogHeader className="text-center">
            <span className="text-6xl">&#127881;</span>
            <h1 className="text-2xl w-full sm:text-3xl md:text-4xl font-bold text-white">
              Saved to your account
            </h1>
            <h2 className="text-md sm:text-lg font-light text-gray-300 w-100 sm:w-90">
              The playlist is now available in your Spotify library. Also you
              can find it anytime in Song Symmetry.
            </h2>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                router.push(
                  `/tracks?type=playlist&id=${playlist?.id}`
                );
              }}
              className="w-auto min-w-[150px] font-bold"
              variant="secondary"
            >
              Open Playlist
            </Button>
            <Button
              className="w-auto min-w-[150px] px-1 sm:px-3 py-1 sm:py-2 font-extrabold"
              onClick={onClose}
            >
              <i className="bi bi-spotify text-white text-md sm:text-2lg mr-2"></i>
              Open Spotify
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogClose>
    </Dialog>
  );
}

export default PlaylistDialog;