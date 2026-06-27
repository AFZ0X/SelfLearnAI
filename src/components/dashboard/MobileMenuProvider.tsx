"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface MobileMenuContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

const MobileMenuContext = createContext<MobileMenuContextValue>({
  open: false,
  toggle: () => {},
  close: () => {},
});

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <MobileMenuContext.Provider value={{ open, toggle, close }}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  return useContext(MobileMenuContext);
}
