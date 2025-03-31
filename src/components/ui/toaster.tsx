"use client";

import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast
            className="bg-gray-900 text-white z-max p-4 rounded-xl shadow-lg"
            key={id}
            {...props}
          >
            <div className="flex flex-row space-x-3">
              {description?.toString().includes("successfully") ? (
                <p className="text-4xl">🙌</p>
              ) : (
                ""
              )}
              <div className="flex flex-col space-y-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description} </ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
