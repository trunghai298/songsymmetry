import React from "react";
import "./loader.css";

interface LoaderProps {
  className?: string;
}

export const Loader = ({ className }: LoaderProps) => {
  if (className) {
    return <div className={`loader ${className}`}></div>;
  }
  
  return (
    <div className="h-full min-h-screen bg-gray-900">
      <div className="loader"></div>
    </div>
  );
};
