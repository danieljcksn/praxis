"use client";

import { useEffect, useState } from "react";
import type { Book } from "@/lib/types";
import { bindingTint, coverSrc, type CoverSize } from "@/lib/books";
import { cn } from "@/lib/cn";

/** Jacket artwork, and the designed thing that stands in for it.
 *
 *  Four decisions carry this component.
 *
 *  The frame. Every cover sits in the same box with the same inner hairline
 *  and the same 3px spine. Real covers run anywhere from square to 1:1.6, and
 *  a shelf of true-ratio images reads as a bug rather than as fidelity — so a
 *  grid crops to fill the box and the detail view letterboxes inside it,
 *  where the artwork is the subject and cropping would be vandalism.
 *
 *  The miss. Open Library answers a cover it does not have with HTTP 200 and
 *  a 43-byte transparent 1×1 GIF, which fires `load` rather than `error` — so
 *  `coverSrc` appends `?default=false` to turn a miss into a real 404 and let
 *  the plate below actually render.
 *
 *  The plate. Not a grey box and not an icon: the title set between two
 *  letterpress rules, tinted from a hash of the book so a shelf of coverless
 *  books reads as a run of different cloth bindings rather than a run of
 *  identical errors. The tint comes from the five muted status hues that
 *  already exist, so it is correct in both palettes for free.
 *
 *  The wait. The plate is not only the fallback — it is also the loading
 *  state, drawn underneath every cover and revealed until the artwork lands
 *  on top of it. Cover requests redirect to archive.org and can take seconds
 *  on a cold fetch; a skeleton there is an empty box that asks whether the
 *  app is broken, while the plate is a book with its title on it that happens
 *  to become a photograph. */
export function Cover({
  book,
  size = "M",
  natural = false,
  quiet = true,
  priority = false,
  className,
  children,
}: {
  book: Book;
  size?: CoverSize;
  /** Letterbox the artwork inside the frame instead of cropping to fill it. */
  natural?: boolean;
  /** Pull a few percent of saturation so a wall of jackets stays calm. Off on
   *  the detail view, where a single cover is allowed to be itself. */
  quiet?: boolean;
  priority?: boolean;
  className?: string;
  /** Drawn inside the frame, so a progress hairline is clipped by the same
   *  rounding as the artwork instead of floating over its corners. */
  children?: React.ReactNode;
}) {
  const src = coverSrc(book, size);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // A cover can change under us — pasted by hand, or refreshed from the
  // catalogue — and the element is reused, so the load state resets with it.
  useEffect(() => {
    setReady(false);
    setFailed(false);
  }, [src]);

  return (
    <div
      className={cn(
        "relative aspect-[2/3] overflow-hidden rounded-md bg-inset cover-frame",
        className,
      )}
    >
      <CoverPlate book={book} />

      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element -- next/image
        // would route these through /_next/image, which middleware.ts
        // deliberately leaves outside the password gate; a plain img also
        // preserves the 404, which the plate depends on.
        <img
          src={src}
          alt=""
          aria-hidden
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "low"}
          referrerPolicy="no-referrer"
          onLoad={() => setReady(true)}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full",
            natural ? "object-contain" : "object-cover",
            quiet && "cover-art",
            "transition-opacity duration-[190ms] ease-out",
            ready ? "opacity-100" : "opacity-0",
          )}
        />
      )}

      {/* Turns a rectangle into a book, and costs one gradient. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-r from-black/18 to-transparent"
      />

      {children}
    </div>
  );
}

function CoverPlate({ book }: { book: Book }) {
  const tint = bindingTint(book);
  const credit = book.author || (book.publishedYear ? String(book.publishedYear) : "");

  return (
    // The container is the padding-free box: a container query measures the
    // content box, so padding here would shrink what the type rule sees and
    // a 160px cell would quietly stay in the small case.
    <div
      className="cover-plate absolute inset-0"
      style={{ backgroundColor: `color-mix(in srgb, ${tint} 9%, var(--color-inset))` }}
      aria-hidden
    >
      <div className="cover-plate-body h-full w-full flex-col items-center justify-center px-[10%]">
        <div className="w-full border-y border-border-strong py-[8%]">
          <p className="cover-plate-title line-clamp-4 text-balance text-center text-text/90">
            {book.title}
          </p>
        </div>
        {credit && <p className="eyebrow mt-[7%] line-clamp-1 w-full text-center text-sub">{credit}</p>}
      </div>
    </div>
  );
}
