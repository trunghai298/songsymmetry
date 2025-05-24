"use client";

import React from "react";
import { signIn } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Logo from "../../../assets/logo2.webp";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  feature?: string;
}

const LoginModal: React.FC<LoginModalProps> = ({ 
  isOpen, 
  onClose, 
  message = "Sign in with Spotify to access this feature",
  feature = "this feature"
}) => {
  const handleSpotifyLogin = () => {
    signIn("spotify");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={Logo.src} alt="Song Symmetry" width={60} height={60} />
          </div>
          <DialogTitle className="text-2xl font-bold text-white">
            Sign in Required
          </DialogTitle>
          <DialogDescription className="text-gray-300 mt-2">
            {message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 mt-6">
          <Button
            onClick={handleSpotifyLogin}
            className="w-full h-12 text-white text-lg font-semibold px-6 py-3 rounded-full bg-spotify-green hover:bg-spotify-green/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spotify-green focus-visible:ring-offset-2"
          >
            <i className="bi bi-spotify text-xl mr-3"></i>
            Sign in with Spotify
          </Button>
          
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full h-12 text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white"
          >
            Continue Browsing
          </Button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            We use Spotify to provide personalized music experiences and playback features.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;