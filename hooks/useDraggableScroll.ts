import { useRef, useState, MouseEvent, useEffect } from 'react';

interface DraggableOptions {
  autoScroll?: boolean;
  autoScrollInterval?: number;
}

export function useDraggableScroll<T extends HTMLElement>(options?: DraggableOptions) {
  const { autoScroll = false, autoScrollInterval = 3000 } = options || {};
  
  const ref = useRef<T>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const velocity = useRef(0);
  const lastX = useRef(0);
  const lastTimestamp = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!autoScroll) return;
    
    const node = ref.current;
    if (!node) return;

    const interval = setInterval(() => {
      if (!isDragging && !isHovered) {
        const { scrollLeft, scrollWidth, clientWidth } = node;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          node.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          const cardWidth = (node.children[0] as HTMLElement)?.clientWidth || 300;
          node.scrollBy({ left: cardWidth + 20, behavior: 'smooth' });
        }
      }
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [autoScroll, autoScrollInterval, isDragging, isHovered]);

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const applyMomentum = () => {
    if (!ref.current) return;
    
    velocity.current *= 0.95; // Friction factor

    if (Math.abs(velocity.current) > 0.1) {
      ref.current.scrollLeft -= velocity.current * 16;
      rafId.current = requestAnimationFrame(applyMomentum);
    } else {
      velocity.current = 0;
    }
  };

  const onMouseDown = (e: MouseEvent<T>) => {
    if (!ref.current) return;
    if (rafId.current) cancelAnimationFrame(rafId.current);

    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - ref.current.offsetLeft);
    setScrollLeft(ref.current.scrollLeft);
    
    lastX.current = e.pageX;
    lastTimestamp.current = performance.now();
    velocity.current = 0;
  };

  const onMouseLeave = () => {
    setIsHovered(false);
    if (isDragging) {
      setIsDragging(false);
      if (Math.abs(velocity.current) > 0.1) {
        rafId.current = requestAnimationFrame(applyMomentum);
      }
    }
  };
  
  const onMouseEnter = () => {
    setIsHovered(true);
  };

  const onMouseUp = () => {
    setIsDragging(false);
    if (Math.abs(velocity.current) > 0.1) {
      rafId.current = requestAnimationFrame(applyMomentum);
    }
  };

  const onMouseMove = (e: MouseEvent<T>) => {
    if (!isDragging || !ref.current) return;
    e.preventDefault();
    
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    
    if (Math.abs(walk) > 5) {
      setHasDragged(true);
    }
    
    ref.current.scrollLeft = scrollLeft - walk;

    const now = performance.now();
    const dt = now - lastTimestamp.current;
    if (dt > 0) {
      // Velocity = distance / time
      velocity.current = (e.pageX - lastX.current) / dt;
    }
    lastX.current = e.pageX;
    lastTimestamp.current = now;
  };
  
  const onClickCapture = (e: MouseEvent<T>) => {
    if (hasDragged) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  return {
    ref,
    onMouseDown,
    onMouseLeave,
    onMouseEnter,
    onMouseUp,
    onMouseMove,
    onClickCapture,
    style: { cursor: isDragging ? 'grabbing' : 'grab' }
  };
}
