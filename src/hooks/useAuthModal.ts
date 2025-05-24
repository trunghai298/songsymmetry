"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

interface UseAuthModalProps {
  feature?: string;
  message?: string;
}

export const useAuthModal = ({ 
  feature = "this feature", 
  message 
}: UseAuthModalProps = {}) => {
  const { data: session, status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isAuthenticated = status === "authenticated" && session;

  const requireAuth = () => {
    if (isAuthenticated) {
      return true;
    } else {
      setIsModalOpen(true);
      return false;
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const authModalProps = {
    isOpen: isModalOpen,
    onClose: closeModal,
    message: message || `Sign in with Spotify to ${feature}`,
    feature,
  };

  return {
    isAuthenticated,
    requireAuth,
    authModalProps,
    closeModal,
  };
};