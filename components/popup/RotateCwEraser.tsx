import { createLucideIcon } from 'lucide-react';

/** Lucide's rotate-cw with an eraser inside: reload the page after wiping its data. */
export const RotateCwEraser = createLucideIcon('rotate-cw-eraser', [
  ['path', { d: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8', key: 'arc' }],
  ['path', { d: 'M21 3v5h-5', key: 'head' }],
  // Tilted away from the arrowhead so the two don't touch.
  ['rect', { x: '9.5', y: '8', width: '5', height: '9', rx: '1', transform: 'rotate(-45 12 12.5)', key: 'eraser' }],
  ['path', { d: 'M9.5 14h5', transform: 'rotate(-45 12 12.5)', key: 'band' }],
]);
