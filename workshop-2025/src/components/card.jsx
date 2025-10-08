import React from "react";

export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl shadow-lg bg-gray-800 border border-gray-700 ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
