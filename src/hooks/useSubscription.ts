"use client";

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { 
  openSubscribeDialog, 
  closeSubscribeDialog 
} from '@/lib/redux/slices/subscribeSlices';
import { selectSubscribeStatus } from '@/lib/redux/selectors';

export function useSubscription() {
  const dispatch = useAppDispatch();
  const isDialogOpen = useAppSelector(selectSubscribeStatus);
  
  const openDialog = useCallback(() => {
    dispatch(openSubscribeDialog());
  }, [dispatch]);
  
  const closeDialog = useCallback(() => {
    dispatch(closeSubscribeDialog());
  }, [dispatch]);
  
  return {
    isDialogOpen,
    openDialog,
    closeDialog
  };
}