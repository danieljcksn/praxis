"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Two-step confirmation for a destructive button.
 *
 *  The first press arms the action and relabels the control; the second press
 *  performs it. Critically, the armed state **expires** — a button that stays
 *  armed indefinitely is a trap, because a user who thought better of it and
 *  came back a minute later would delete on what feels like a first click.
 *
 *  Returns the armed flag so the caller can swap the label, and a trigger to
 *  wire straight to onClick. */
export function useArmedConfirm(onConfirm: () => void, disarmAfterMs = 3000) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);

  const clear = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => clear, []);

  const trigger = useCallback(() => {
    if (!armed) {
      setArmed(true);
      clear();
      timer.current = window.setTimeout(() => {
        setArmed(false);
        timer.current = null;
      }, disarmAfterMs);
      return;
    }
    clear();
    setArmed(false);
    onConfirm();
  }, [armed, disarmAfterMs, onConfirm]);

  /** Call when the surrounding dialog opens or closes. */
  const reset = useCallback(() => {
    clear();
    setArmed(false);
  }, []);

  // Memoized, because callers put this object in an effect's dependency
  // array. A fresh literal every render makes that effect run every render,
  // and an effect that calls setState with a fresh object then never settles
  // — "Maximum update depth exceeded" the moment the dialog opens.
  return useMemo(() => ({ armed, trigger, reset }), [armed, trigger, reset]);
}
