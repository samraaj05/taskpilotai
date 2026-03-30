import { useState } from "react";

export function useToast() {
  const [message, setMessage] = useState(null);

  const toast = ({ title, description }) => {
    alert(`${title}: ${description}`);
  };

  return { toast, toasts: [] };
}
