import {RefObject, useEffect} from 'react';
import {Keyboard, Platform, ScrollView, StatusBar, TextInput} from 'react-native';

/** Space kept between the focused field and the keyboard. */
const MARGIN = 24;
/** How often focus is checked while the keyboard is open (tapping another field). */
const FOCUS_POLL_MS = 250;

/**
 * Android with edge-to-edge (Android 15+, targetSdk 35): the window no longer
 * resizes for the keyboard, so a KeyboardAvoidingView only shrinks the form and
 * a focused field low in it stays behind the keyboard. This scrolls the focused
 * input of `scrollRef` just above the keyboard when the keyboard opens and when
 * focus moves to another field while it is open. iOS is left to
 * KeyboardAvoidingView / automaticallyAdjustKeyboardInsets.
 */
export function useKeepFocusedInputVisible(scrollRef: RefObject<ScrollView | null>) {
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    let keyboardTop: number | null = null;
    let lastInput: unknown = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let pending: ReturnType<typeof setTimeout> | null = null;

    const reveal = () => {
      const input = TextInput.State.currentlyFocusedInput() as any;
      const scroll = scrollRef.current as any;
      const native = scroll?.getNativeScrollRef?.() ?? scroll;
      const inner = scroll?.getInnerViewRef?.();
      if (!input || !native?.measureInWindow || !inner || keyboardTop == null) {
        return;
      }
      lastInput = input;
      native.measureInWindow((_sx: number, scrollY: number) => {
        input.measureInWindow?.((_x: number, y: number, _w: number, h: number) => {
          const kbTop = keyboardTop;
          if (kbTop == null) {
            return;
          }
          const below = y + h + MARGIN - kbTop; // > 0: behind the keyboard
          const above = scrollY - y; // > 0: under the header
          if (below <= 0 && above <= 0) {
            return;
          }
          // Content position of the field → current scroll offset.
          input.measureLayout(inner, (_cx: number, contentTop: number) => {
            const offset = contentTop - (y - scrollY);
            const target = below > 0 ? offset + below : offset - above - MARGIN;
            scroll.scrollTo({y: Math.max(0, target), animated: true});
          });
        });
      });
    };

    const revealSoon = () => {
      if (pending) {
        clearTimeout(pending);
      }
      // After KeyboardAvoidingView applied its padding; once more when the
      // layout has settled.
      pending = setTimeout(() => {
        reveal();
        pending = setTimeout(reveal, 300);
      }, 60);
    };

    const show = Keyboard.addListener('keyboardDidShow', e => {
      // screenY counts from the top of the screen; measureInWindow on Android
      // counts from below the status bar.
      keyboardTop = e.endCoordinates.screenY - (StatusBar.currentHeight ?? 0);
      revealSoon();
      if (!poll) {
        poll = setInterval(() => {
          const current = TextInput.State.currentlyFocusedInput();
          if (current && current !== lastInput) {
            lastInput = current;
            revealSoon();
          }
        }, FOCUS_POLL_MS);
      }
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop = null;
      lastInput = null;
      if (poll) {
        clearInterval(poll);
        poll = null;
      }
    });

    return () => {
      show.remove();
      hide.remove();
      if (poll) {
        clearInterval(poll);
      }
      if (pending) {
        clearTimeout(pending);
      }
    };
  }, [scrollRef]);
}
