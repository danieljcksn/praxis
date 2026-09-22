"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Two-step confirmation for a destructive button.
 *
 *  The first press arms the action and relabels the control; the second press
 *  performs it. Critically, the armed state **expires** — a button that stays
 *  armed indefinitely is a trap, because a user who thought better of it and
 *  came back a minute later would delete on what feels like a first click.
 *
 *  `resetKey` is how the surrounding dialog says "this is a different thing
 *  now, forget any arming" — pass the open flag, or the id of the record on
 *  screen. It exists because callers used to do that themselves, in an effect
 *  that depended on this hook's return value. That object changes identity
 *  whenever `armed` flips, so the effect re-ran the instant the button was
 *  armed and disarmed it again: the label never changed, the second press was
 *  always treated as a first press, and nothing could ever be deleted. Owning
 *  the reset here removes the trap rather than documenting it.
 *
 *  Returns the armed flag so the caller can swap the label, and a trigger to
 *  wire straight to onClick. */
export function useArmedConfirm(
  onConfirm: () => void,
  resetKey?: unknown,
  disarmAfterMs = 3000,
) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const reset = useCallback(() => {
    clear();
    setArmed(false);
  }, [clear]);

  // Disarm whenever the subject changes. Deliberately keyed on a plain value
  // rather than on anything this hook returns.
  useEffect(() => {
    reset();
  }, [resetKey, reset]);

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
  }, [armed, clear, disarmAfterMs, onConfirm]);

  // Memoized, because callers still put this object in dependency arrays. A
  // fresh literal every render makes such an effect run every render, and one
  // that calls setState with a fresh object never settles — "Maximum update
  // depth exceeded" the moment the dialog opens.
  return useMemo(() => ({ armed, trigger, reset }), [armed, trigger, reset]);
}
