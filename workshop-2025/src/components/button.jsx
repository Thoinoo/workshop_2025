import React from "react";

export function Button({ onClick, children, className = "", ...props }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded font-semibold transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
