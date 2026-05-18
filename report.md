# Performance Report - Whiteboard

This document details the performance issues found in the whiteboard and suggests improvements to increase FPS.

## 1. Use of React State in the Render Loop (onMouseMove)

**File:** `components/Canvas.tsx`
**Lines:** 1003-1066 (approximately)

### Problem:

The functions `setLaserCursorPos`, `setLaserPoints`, `setLassoPoints`, `setSelectionBox`, and `setNewElement` are called directly within `handleMouseMove`. This causes React to trigger a complete re-render of the `Canvas` component (which has more than 2600 lines) on each mouse movement. Mouse events can occur more than 100 times per second, far exceeding the desired 60fps.

### Possible Improvement:

- **Mutable Refs:** Use `useRef` to store the current drawing state (laser points, checkbox, etc.) and update Konva nodes directly using Konva's imperative API (`node.setAttrs(...)` and `layer.batchDraw()`). This avoids React needing to reconcile the component tree.

- **RAF Pipeline:** Use `requestAnimationFrame` to group visual updates instead of reacting to each mouse event individually.

---

## 2. Lack of Memoization of Individual Elements

**File:** `components/Canvas.tsx`
**Line:** 1802

### Problem:

The loop `{elements.map((el) => { ... })}` processes all frame elements in each render of the `Canvas`. If there are many elements, the cost of creating React-Konva components and calculating their props (`commonProps`, `createPencilSceneFunc`, etc.) becomes prohibitive.

### Possible Improvement:

- **React.memo:** Wrap the rendering of each element type in a separate component (e.g., `RectangleElement`, `CircleElement`) and use `React.memo` on them.

- **Batching:** Ensure that elements that haven't changed are not re-processed by React.

---

## 3. Heavy Computations in the Rendering Cycle (Pencil)

**File:** `components/PencilStroke.tsx` (L75-80) and `lib/brush/strokePath.ts` (L101-131)

### Problem:

The `drawVariableWidthStroke` function is called on each render of a `PencilStroke`. Inside it, the `smoothCenterline` and `getStrokeOutline` functions are executed, creating new arrays and objects every time. This generates excessive pressure on the Garbage Collector (GC).

### Possible Improvement:

- **Caching:** Cache the result of `smoothCenterline` and `getStrokeOutline` in the element's object when the points change, instead of recalculating on render.

- **Konva Cache:** Use Konva's `node.cache()` to transform complex strokes into bitmaps after they have finished being drawn.

---

## 4. Absence of Culling (Spatial Partitioning)

**File:** `components/Canvas.tsx`

### Problem:

There is no logic to filter which elements are visible in the current viewport. All elements are passed to React-Konva, regardless of whether they are on the screen or miles away due to zoom/pan.

### Possible Improvement:

- **Culling:** Calculate the viewport boundaries and filter the list of `elements` before the `.map`.

- **Spatial Partitioning:** For canvases with thousands of elements, use an R-Tree or Grid for fast searching of visible elements.

---

## 5. Object Pooling

**File:** `lib/brush/velocityBrush.ts` and `lib/brush/strokePath.ts`

### Problem:

Constant creation of point objects (`StrokePoint`) and coordinate arrays during drawing.

### Possible Improvement:

- **Typed Arrays:** Use `Float32Array` to store point coordinates instead of normal number arrays.

- **Object Pooling:** Reuse point objects to avoid frequent allocations in the drawing loop.

--

## Recommended Next Steps:

1. **Top Priority:** Remove `newElement` and `laserPoints` from React state during mouse movement, moving them to Refs + Konva API.

2. **Medium Priority:** Memorize element components and cache pencil stroke calculations.

3. **Low Priority:** Implement basic culling to ignore elements outside the view.
