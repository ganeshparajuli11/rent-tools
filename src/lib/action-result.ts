/** What every server action returns to the browser. Messages are plain words. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      /** Field name -> message, for showing errors next to inputs. */
      fieldErrors?: Record<string, string>;
    };

export const GENERIC_ERROR = "Sorry, something went wrong. Please try again.";
