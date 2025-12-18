import { useEffect, useState, RefObject } from 'react';

interface UseDropdownPositionOptions {
  /**
   * Ref to the input element
   */
  inputRef: RefObject<HTMLInputElement>;
  /**
   * Whether the dropdown is currently visible
   */
  isVisible: boolean;
  /**
   * Height of the dropdown in pixels (default: 240)
   */
  dropdownHeight?: number;
  /**
   * Dependencies that should trigger position recalculation
   */
  dependencies?: any[];
}

/**
 * Hook to calculate optimal dropdown position (above or below input).
 * Handles scroll and resize events to keep position updated.
 * 
 * @returns boolean indicating whether to show dropdown above input
 */
export function useDropdownPosition({
  inputRef,
  isVisible,
  dropdownHeight = 240,
  dependencies = [],
}: UseDropdownPositionOptions): boolean {
  const [showAbove, setShowAbove] = useState(false);

  useEffect(() => {
    if (!isVisible || !inputRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!inputRef.current) return;

      const inputRect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - inputRect.bottom;
      const spaceAbove = inputRect.top;

      // Show above if:
      // 1. Not enough space below (< dropdownHeight) AND more space above than below, OR
      // 2. Space above is significantly more than space below (even if both are adequate)
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setShowAbove(true);
      } else if (spaceAbove > spaceBelow + 100) {
        // If there's significantly more space above, prefer showing above
        setShowAbove(true);
      } else {
        setShowAbove(false);
      }
    };

    updatePosition();
    // Update on scroll and resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, inputRef, dropdownHeight, ...dependencies]);

  return showAbove;
}

