import { useLayoutEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface FocusTrapOptions {
  inertSelector?: string;
}

export function useFocusTrap<T extends HTMLElement>(
  onEscape: () => void,
  options: FocusTrapOptions = {},
): RefObject<T | null> {
  const dialogRef = useRef<T>(null);
  const onEscapeRef = useRef(onEscape);

  useLayoutEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background = options.inertSelector
      ? Array.from(document.querySelectorAll<HTMLElement>(options.inertSelector))
      : [];
    const previousBackgroundState = background.map((element) => ({
      element,
      ariaHidden: element.getAttribute('aria-hidden'),
      inert: element.inert,
    }));

    background.forEach((element) => {
      element.setAttribute('aria-hidden', 'true');
      element.inert = true;
    });

    const getFocusable = (): HTMLElement[] => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    const focusInitial = (): void => {
      const firstFocusable = getFocusable()[0];
      (firstFocusable ?? dialog).focus();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('keydown', onKeyDown);
    focusInitial();
    return () => {
      dialog.removeEventListener('keydown', onKeyDown);
      previousBackgroundState.forEach(({ element, ariaHidden, inert }) => {
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
        element.inert = inert;
      });
      if (opener?.isConnected && !dialog.contains(opener)) opener.focus();
    };
  }, [options.inertSelector]);

  return dialogRef;
}
