"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { Book, ReadingEvent } from "@/lib/types";
import { formatPosition, learnedStep, unitOf } from "@/lib/books";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { inputBase } from "@/components/ui/Field";

/** Hold-to-repeat cadences. These are input rhythms rather than transitions,
 *  which is why they sit outside the app's four motion durations — nothing is
 *  animating at 90ms. */
const HOLD_DELAY = 400;
const HOLD_INTERVAL = 90;
const HOLD_FAST_AFTER = 1200;
const HOLD_FAST_INTERVAL = 40;
/** A two-second hold is one store write, not forty. CloudSync's own 650ms
 *  debounce then folds that into a single Supabase PUT. */
const COMMIT_DEBOUNCE = 200;
/** How long the field's border stays accent after a value past the end was
 *  clamped. A layout-length beat, so it registers without being an alarm. */
const CLAMP_FLASH_MS = 280;

/** Where you are in a book, and the one control that moves it.
 *
 *  A slider is imprecise and hostile on touch. A percent field asks for a
 *  number nobody knows. A bare text field is right but slow for the action
 *  you will perform more than any other in the app. So: a page field between
 *  steppers — and the steppers learn, taking their size from the median
 *  sitting of this particular book. Because the number is printed on the
 *  button you watch +10 become +18 after a few nights; the app has quietly
 *  worked out how you read this book and has not hidden that it did.
 *
 *  Reaching the last page never finishes anything. It promotes the Finished
 *  button and stops. Auto-finishing on a mistyped page is the cruellest bug
 *  this feature could contain, so the system simply does not contain it. */
export function ProgressStepper({
  book,
  events,
  size = "md",
  onFinish,
  className,
}: {
  book: Book;
  events: ReadingEvent[];
  size?: "sm" | "md";
  onFinish?: () => void;
  className?: string;
}) {
  const setBookProgress = useStore((s) => s.setBookProgress);

  const [text, setText] = useState(String(book.position));
  const [focused, setFocused] = useState(false);
  const [flash, setFlash] = useState(false);
  const revertTo = useRef(book.position);
  const commitTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const pending = useRef<number | null>(null);
  const holdTimers = useRef<number[]>([]);
  /** Set by Escape. `blur()` dispatches focusout synchronously, before React
   *  has re-rendered with the reverted text, so without this the blur handler
   *  would read the pre-Escape value and commit the very number Escape is
   *  supposed to take back. */
  const reverting = useRef(false);
  /** A hold fires its own steps; the click that arrives on release must not
   *  add one more than the reader watched go by. */
  const repeated = useRef(false);

  const step = learnedStep(events);
  const unit = unitOf(book.format);
  const atEnd = book.length != null && book.position >= book.length;

  // Track the store unless the reader is mid-edit or a commit is still
  // queued — otherwise a stepper press would fight its own debounce.
  useEffect(() => {
    if (!focused && pending.current === null) setText(String(book.position));
  }, [book.position, focused]);

  const flush = useCallback(() => {
    if (commitTimer.current !== null) {
      window.clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
    if (pending.current === null) return;
    const value = pending.current;
    pending.current = null;
    setBookProgress(book.id, value);
  }, [book.id, setBookProgress]);

  const queue = useCallback(
    (value: number) => {
      const clamped =
        book.length != null ? Math.min(book.length, Math.max(0, value)) : Math.max(0, value);
      if (value > clamped) {
        // Past the end is a typo, not a fact about the book. Clamp, and say
        // so with a brief border flash rather than an error to dismiss.
        setFlash(true);
        if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlash(false), CLAMP_FLASH_MS);
      }
      pending.current = clamped;
      setText(String(clamped));
      if (commitTimer.current !== null) window.clearTimeout(commitTimer.current);
      commitTimer.current = window.setTimeout(flush, COMMIT_DEBOUNCE);
    },
    [book.length, flush],
  );

  const nudge = useCallback(
    (delta: number) => queue((pending.current ?? book.position) + delta),
    [book.position, queue],
  );

  const stopHold = useCallback(() => {
    holdTimers.current.forEach((id) => window.clearTimeout(id));
    holdTimers.current = [];
  }, []);

  // Flush rather than cancel: a continuous hold never commits until 200ms
  // after release, so cancelling on unmount would throw away the whole run.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(
    () => () => {
      stopHold();
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
      flushRef.current();
    },
    [stopHold],
  );

  /** The click that lands on release must not add a step the hold already
   *  applied — the reader watched the number go by and expects it to stop
   *  where they let go. */
  const press = useCallback(
    (delta: number) => {
      if (repeated.current) {
        repeated.current = false;
        return;
      }
      nudge(delta);
    },
    [nudge],
  );

  const startHold = useCallback(
    (delta: number) => {
      stopHold();
      repeated.current = false;
      const startedAt = Date.now();
      const tick = () => {
        repeated.current = true;
        nudge(delta);
        const elapsed = Date.now() - startedAt;
        const interval = elapsed > HOLD_FAST_AFTER ? HOLD_FAST_INTERVAL : HOLD_INTERVAL;
        holdTimers.current.push(window.setTimeout(tick, interval));
      };
      holdTimers.current.push(window.setTimeout(tick, HOLD_DELAY));
    },
    [nudge, stopHold],
  );

  const commitText = () => {
    const parsed = Number.parseInt(text.replace(/[^\d]/g, ""), 10);
    // An empty field is someone mid-edit, not page zero. Committing 0 here
    // would drop the bookmark to the start and delete the day's entry, and
    // one Backspace plus a click elsewhere is all it takes.
    if (!Number.isFinite(parsed)) {
      setText(String(book.position));
      return;
    }
    queue(parsed);
    flush();
  };

  const compact = size === "sm";
  /** The ± labels are metadata; the page number is the figure. Now that the
   *  size actually lands (it used to lose to `inputClass`'s own `text-sm`),
   *  give the number the step up it was always meant to have. */
  const control = compact ? "h-8 text-micro" : "h-10 text-mini";
  const fieldSize = compact ? "h-8 text-sm" : "h-10 text-lead";

  return (
    // Every part of this control holds its own width. The row may wrap on a
    // narrow card — Finished drops to its own line, which is fine — but the
    // page number must never be what gives way, and a shrinking flex item is
    // exactly how the most important figure on screen ends up clipped to two
    // digits on a phone.
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <StepButton
        className={control}
        label={`Back ${step} ${unit}`}
        onPress={() => press(-step)}
        onHoldStart={() => startHold(-step)}
        onHoldEnd={stopHold}
        disabled={book.position <= 0}
      >
        −{step}
      </StepButton>

      {/* The width lives on the wrapper, not on the input: `inputClass`
          already carries `w-full`, and stacking a second width utility on top
          of it leaves the winner up to stylesheet order. */}
      <div className="flex shrink-0 items-baseline gap-1.5">
        <span className={cn("block shrink-0", compact ? "w-[3.75rem]" : "w-[4.5rem]")}>
        <input
          value={text}
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={`Current ${unit === "pages" ? "page" : "minute"} in ${book.title}`}
          onFocus={(event) => {
            setFocused(true);
            revertTo.current = book.position;
            event.currentTarget.select();
          }}
          onBlur={() => {
            setFocused(false);
            if (reverting.current) {
              reverting.current = false;
              setText(String(revertTo.current));
              return;
            }
            commitText();
          }}
          onChange={(event) => setText(event.target.value.replace(/[^\d]/g, ""))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
              return;
            }
            if (event.key === "Escape") {
              // A genuine undo for a mistyped page — which matters, because
              // the state right after this one is "finished".
              event.preventDefault();
              event.stopPropagation();
              if (commitTimer.current !== null) {
                window.clearTimeout(commitTimer.current);
                commitTimer.current = null;
              }
              pending.current = null;
              reverting.current = true;
              setText(String(revertTo.current));
              event.currentTarget.blur();
              return;
            }
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              const magnitude = event.shiftKey ? 5 : step;
              nudge(event.key === "ArrowUp" ? magnitude : -magnitude);
            }
          }}
          className={cn(inputBase, fieldSize, "px-2 text-center tabnum", flash && "border-accent")}
        />
        </span>
        {/* The denominator is already stated above the control in every
            compact context, so repeating it here only costs a wrap. */}
        {!compact && (
          <span className="text-mini tabnum whitespace-nowrap text-sub">
            {book.length != null ? `/ ${book.length}` : unit === "pages" ? "pages" : "min"}
          </span>
        )}
      </div>

      <StepButton
        className={control}
        label={`Forward ${step} ${unit}`}
        onPress={() => press(step)}
        onHoldStart={() => startHold(step)}
        onHoldEnd={stopHold}
        disabled={atEnd}
      >
        +{step}
      </StepButton>

      {!compact && (
        <StepButton
          className={control}
          label={`Forward ${step * 2} ${unit}`}
          onPress={() => press(step * 2)}
          onHoldStart={() => startHold(step * 2)}
          onHoldEnd={stopHold}
          disabled={atEnd}
        >
          +{step * 2}
        </StepButton>
      )}

      {onFinish && book.status !== "finished" && (
        <Button
          size="sm"
          // Reaching the end promotes the button; it never presses it.
          variant={atEnd ? "primary" : "subtle"}
          onClick={() => {
            flush();
            onFinish();
          }}
          aria-label={`Mark ${book.title} finished`}
          className="ml-auto shrink-0"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Finished
        </Button>
      )}
    </div>
  );
}

/** A labelled step. The size is information, so it is printed rather than
 *  drawn as a chevron, and the accessible name is regenerated with it so the
 *  spoken control and the visible one can never disagree. */
function StepButton({
  label,
  onPress,
  onHoldStart,
  onHoldEnd,
  disabled,
  className,
  children,
}: {
  label: string;
  onPress: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      // Stepping must never pull the caret into the field: a keyboard user
      // holding "+" should not end up typing into it.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPress}
      onPointerDown={onHoldStart}
      onPointerUp={onHoldEnd}
      onPointerLeave={onHoldEnd}
      onPointerCancel={onHoldEnd}
      className={cn(
        "shrink-0 rounded-md border border-border bg-inset px-2.5 tabnum text-sub-strong",
        "transition-[background-color,border-color,color,transform] duration-[130ms] ease-out",
        "hover:border-border-strong hover:text-text active:scale-[0.96]",
        "disabled:pointer-events-none disabled:opacity-35",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** The one-line position readout used wherever the stepper doesn't fit. */
export function PositionLabel({ book }: { book: Book }) {
  return (
    <span className="tabnum">
      {formatPosition(book.format, book.position)}
      {book.length != null && ` / ${book.length}`}
    </span>
  );
}
