// How long the pointer must rest in a row's middle band before it nests, so
// a drag that only passes over rows reorders exactly as before.
export const NEST_DWELL_MS = 300;

/**
 * Tracks which nest band the pointer is in and arms it after
 * `NEST_DWELL_MS`. `onArm` fires once per arming so the caller can re-run
 * collision detection, which dnd-kit otherwise does only on pointer moves.
 */
export function createNestDwell(onArm: () => void) {
  let candidate: string | null = null;
  let armed: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const reset = () => {
    clearTimeout(timer);
    timer = undefined;
    candidate = null;
    armed = null;
  };

  return {
    /** Records the band under the pointer; returns it once armed. */
    track(bandId: string | null): string | null {
      if (bandId !== candidate) {
        reset();
        candidate = bandId;
        if (bandId) {
          timer = setTimeout(() => {
            armed = bandId;
            onArm();
          }, NEST_DWELL_MS);
        }
      }
      return armed;
    },
    reset,
  };
}
