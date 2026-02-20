'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Line, Transformer, RegularPolygon, Arrow, Image as KonvaImage } from 'react-konva';
import { nanoid } from 'nanoid';
import { WhiteboardElement, db } from '@/lib/db';
import { Tool } from './Toolbar';
import Konva from 'konva';
import useImage from 'use-image';

interface CanvasProps {
  activeTool: Tool;
  elements: WhiteboardElement[];
  setElements: React.Dispatch<React.SetStateAction<WhiteboardElement[]>>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  defaultProps: Partial<WhiteboardElement>;
}

const ImageElement = ({ el, activeTool, onDragEnd, onTransformEnd, onClick }: any) => {
  const [img] = useImage(el.src);
  return (
    <KonvaImage
      id={el.id}
      image={img}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation}
      opacity={el.opacity ?? 1}
      cornerRadius={el.edges === 'round' ? 10 : 0}
      draggable={activeTool === 'select'}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      onClick={onClick}
    />
  );
};

export const Canvas: React.FC<CanvasProps> = ({
  activeTool,
  elements,
  setElements,
  selectedIds,
  setSelectedIds,
  defaultProps
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState({ x: 0, y: 0, width: 0, height: 0, visible: false });
  const [newElement, setNewElement] = useState<WhiteboardElement | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const saveElement = async (element: WhiteboardElement) => {
    await db.elements.put(element);
  };

  useEffect(() => {
    const handleAddImage = async (e: any) => {
      const { src } = e.detail;
      const id = nanoid();
      const element: WhiteboardElement = {
        id,
        type: 'image',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        src,
        stroke: 'transparent',
        fill: 'transparent',
        strokeWidth: 0,
        rotation: 0,
        strokeStyle: 'solid',
        sloppiness: 0,
        edges: 'sharp',
        opacity: 1,
        arrowType: 'simple',
        arrowheads: true,
        fontFamily: 'Sans-serif',
        fontSize: 20,
        textAlign: 'left',
        ...defaultProps
      };
      setElements(prev => [...prev, element]);
      await saveElement(element);
      setSelectedIds([id]);
    };
    window.addEventListener('add-image', handleAddImage);
    return () => window.removeEventListener('add-image', handleAddImage);
  }, [setElements, setSelectedIds]);

  const getRelativePointerPosition = (stage: Konva.Stage) => {
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = stage.getPointerPosition();
    return pos ? transform.point(pos) : { x: 0, y: 0 };
  };

  const handleMouseDown = (e: any) => {
    if (activeTool === 'hand') return;

    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);
    console.log('Mouse Down - Tool:', activeTool, 'Pos:', pos);

    if (activeTool === 'select') {
      const isClickedOnTransformer = e.target.getParent()?.className === 'Transformer';
      if (isClickedOnTransformer) return;

      const isClickedOnEmpty = e.target === stage;
      if (isClickedOnEmpty) {
        setSelectedIds([]);
        setIsSelecting(true);
        setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0, visible: true });
      } else {
        const id = e.target.id();
        if (!id) return;

        const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
        const isSelected = selectedIds.includes(id);

        if (!metaPressed && !isSelected) setSelectedIds([id]);
        else if (metaPressed && isSelected) setSelectedIds(selectedIds.filter((sid) => sid !== id));
        else if (metaPressed && !isSelected) setSelectedIds([...selectedIds, id]);
      }
      return;
    }

    if (activeTool === 'text') {
      handleTextInput(pos.x, pos.y, nanoid());
      return;
    }

    if (activeTool === 'eraser') {
      setIsDrawing(true);
      handleEraser(pos.x, pos.y);
      return;
    }

    setIsDrawing(true);
    const id = nanoid();
    const element: WhiteboardElement = {
      id,
      type: activeTool as any,
      x: pos.x,
      y: pos.y,
      stroke: '#1e1e1e',
      fill: 'transparent',
      strokeWidth: 2,
      rotation: 0,
      strokeStyle: 'solid',
      sloppiness: 1,
      edges: 'sharp',
      opacity: 1,
      arrowType: 'simple',
      arrowheads: true,
      fontFamily: 'Sans-serif',
      fontSize: 20,
      textAlign: 'left',
      ...defaultProps,
      ...(activeTool === 'rectangle' && { width: 0, height: 0 }),
      ...(activeTool === 'diamond' && { radius: 0 }),
      ...(activeTool === 'circle' && { radius: 0 }),
      ...(activeTool === 'triangle' && { radius: 0 }),
      ...(activeTool === 'line' && { points: [0, 0, 0, 0] }),
      ...(activeTool === 'arrow' && { points: [0, 0, 0, 0] }),
      ...(activeTool === 'pencil' && { points: [0, 0] }),
    };

    setNewElement(element);
    setSelectedIds([id]);
  };

  const handleEraser = useCallback(async (x: number, y: number) => {
    const stage = stageRef.current;
    if (!stage) return;

    const shape = stage.getIntersection({ x, y });
    if (shape && shape.id()) {
      const id = shape.id();
      await db.elements.delete(id);
      setElements((prev) => prev.filter((el) => el.id !== id));
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    }
  }, [setElements, setSelectedIds]);

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);

    if (activeTool === 'eraser' && isDrawing) {
      handleEraser(pos.x, pos.y);
      return;
    }

    if (isSelecting) {
      setSelectionBox(prev => ({ ...prev, width: pos.x - prev.x, height: pos.y - prev.y }));
      return;
    }

    if (!isDrawing || !newElement) return;

    const updatedElement = { ...newElement };

    if (activeTool === 'rectangle') {
      updatedElement.width = pos.x - newElement.x;
      updatedElement.height = pos.y - newElement.y;
    } else if (activeTool === 'circle' || activeTool === 'triangle' || activeTool === 'diamond') {
      const dx = pos.x - newElement.x;
      const dy = pos.y - newElement.y;
      updatedElement.radius = Math.sqrt(dx * dx + dy * dy);
    } else if (activeTool === 'line' || activeTool === 'arrow') {
      updatedElement.points = [0, 0, pos.x - newElement.x, pos.y - newElement.y];
    } else if (activeTool === 'pencil') {
      updatedElement.points = [...(newElement.points || []), pos.x - newElement.x, pos.y - newElement.y];
    }

    setNewElement(updatedElement);
  };

  const handleMouseUp = async () => {
    if (isSelecting) {
      const box = selectionBox;
      const x1 = Math.min(box.x, box.x + box.width);
      const x2 = Math.max(box.x, box.x + box.width);
      const y1 = Math.min(box.y, box.y + box.height);
      const y2 = Math.max(box.y, box.y + box.height);

      const selected = elements.filter((el) => {
        const elX2 = el.x + (el.width || (el.radius || 0) * 2);
        const elY2 = el.y + (el.height || (el.radius || 0) * 2);
        return x1 < elX2 && x2 > el.x && y1 < elY2 && y2 > el.y;
      }).map(el => el.id);

      setSelectedIds(selected);
      setIsSelecting(false);
      setSelectionBox(prev => ({ ...prev, visible: false }));
      return;
    }

    if (!isDrawing || !newElement) return;
    setIsDrawing(false);

    const finalElement = { ...newElement };
    if (finalElement.type === 'rectangle') {
      const width = finalElement.width ?? 0;
      const height = finalElement.height ?? 0;
      if (width < 0) {
        finalElement.x = finalElement.x + width;
        finalElement.width = -width;
      }
      if (height < 0) {
        finalElement.y = finalElement.y + height;
        finalElement.height = -height;
      }
    }

    setElements(prev => [...prev, finalElement]);
    await saveElement(finalElement);

    setNewElement(null);
  };

  const handleTransformEnd = async (e: any) => {
    const nodes = transformerRef.current?.nodes();
    if (!nodes) return;
    const updatedElements = [...elements];
    for (const node of nodes) {
      const id = node.id();
      const index = updatedElements.findIndex((el) => el.id === id);
      if (index === -1) continue;
      const element = updatedElements[index];
      const updatedElement: WhiteboardElement = {
        ...element,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
      };
      if (element.type === 'rectangle' || element.type === 'text' || element.type === 'image') {
        updatedElement.width = node.width() * node.scaleX();
        updatedElement.height = node.height() * node.scaleY();
      } else if (element.type === 'circle' || element.type === 'triangle' || element.type === 'diamond') {
        updatedElement.radius = (node.width() * node.scaleX()) / 2;
      }
      node.scaleX(1); node.scaleY(1);
      updatedElements[index] = updatedElement;
      await saveElement(updatedElement);
    }
    setElements(updatedElements);
  };

  const handleDragEnd = async (e: any) => {
    const id = e.target.id();
    const element = elements.find((el) => el.id === id);
    if (element) {
      const updatedElement = { ...element, x: e.target.x(), y: e.target.y() };
      setElements(prev => prev.map((el) => el.id === id ? updatedElement : el));
      await saveElement(updatedElement);
    }
  };

  const handleTextInput = (x: number, y: number, id: string, initialText = '') => {
    console.log('handleTextInput called at:', x, y, 'ID:', id);
    const stage = stageRef.current;
    if (!stage) return;

    const existingTextarea = document.getElementById('whiteboard-textarea');
    if (existingTextarea) {
      existingTextarea.remove();
    }

    const stageBox = stage.container().getBoundingClientRect();
    const textarea = document.createElement('textarea');
    textarea.id = 'whiteboard-textarea';
    document.body.appendChild(textarea);
    
    textarea.value = initialText;
    textarea.style.position = 'absolute';

    // Use Konva's transform to get exact screen coordinates
    const absPos = stage.getAbsoluteTransform().point({ x, y });
    const top = stageBox.top + absPos.y;
    const left = stageBox.left + absPos.x;
    const scale = stage.scaleX();

    console.log('Textarea position:', { top, left, stageBoxTop: stageBox.top, stageBoxLeft: stageBox.left, absPosX: absPos.x, absPosY: absPos.y });

    textarea.style.top = top + 'px';
    textarea.style.left = left + 'px';
    textarea.style.fontSize = `${(defaultProps.fontSize || 20) * scale}px`;
    textarea.style.fontFamily = defaultProps.fontFamily || 'Sans-serif';
    textarea.style.fontWeight = '500';
    textarea.style.color = defaultProps.stroke || '#1e1e1e';
    textarea.style.border = '2px solid #3b82f6';
    textarea.style.outline = 'none';
    textarea.style.zIndex = '9999'; // High z-index
    textarea.style.background = 'white';
    textarea.style.minWidth = '100px';
    textarea.style.minHeight = '1.2em';
    textarea.style.padding = '4px';
    textarea.style.margin = '0';
    textarea.style.display = 'block';
    textarea.style.visibility = 'visible';
    textarea.style.opacity = '1';
    textarea.style.overflow = 'hidden';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = '1.2';
    textarea.style.whiteSpace = 'pre';
    textarea.style.transformOrigin = 'top left';
    textarea.style.transform = `scale(${scale})`;

    setTimeout(() => {
      textarea.focus();
      console.log('Textarea focused');
    }, 0);

    let isFinished = false;
    const finishText = async () => {
      if (isFinished) return;
      isFinished = true;
      
      console.log('finishText triggered');
      const val = textarea.value;
      const finalWidth = Math.max(textarea.offsetWidth / scale, 100);
      const finalHeight = Math.max(textarea.offsetHeight / scale, 24);

      if (document.body.contains(textarea)) {
        console.log('Removing textarea from DOM');
        document.body.removeChild(textarea);
      }

      if (val.trim()) {
        const element: WhiteboardElement = {
          id,
          type: 'text',
          x,
          y,
          text: val,
          width: finalWidth,
          height: finalHeight,
          stroke: defaultProps.stroke || '#1e1e1e',
          fill: 'transparent',
          strokeWidth: 2,
          rotation: 0,
          strokeStyle: 'solid',
          sloppiness: 1,
          edges: 'sharp',
          opacity: 1,
          fontFamily: defaultProps.fontFamily || 'Sans-serif',
          fontSize: defaultProps.fontSize || 20,
          textAlign: defaultProps.textAlign || 'left',
          ...defaultProps
        } as WhiteboardElement;

        console.log('Saving text element:', element);
        setElements(prev => {
          const existingIndex = prev.findIndex(el => el.id === id);
          if (existingIndex !== -1) {
            const newArr = [...prev];
            newArr[existingIndex] = element;
            return newArr;
          }
          return [...prev, element];
        });
        await saveElement(element);
        setSelectedIds([id]);
      }
    };

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        finishText();
      }
    });
    textarea.addEventListener('blur', finishText);
  };

  const [stageSize, setStageSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1000,
    height: typeof window !== 'undefined' ? window.innerHeight : 1000,
  });

  useEffect(() => {
    const handleResize = () => setStageSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (transformerRef.current) {
      const nodes = selectedIds.map(id => stageRef.current?.findOne('#' + id)).filter(Boolean);
      transformerRef.current.nodes(nodes as Konva.Node[]);
    }
  }, [selectedIds, elements]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        if (document.activeElement?.tagName === 'TEXTAREA') return;
        for (const id of selectedIds) await db.elements.delete(id);
        setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
        setSelectedIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, setElements, setSelectedIds]);

  const getDash = (style: string) => {
    if (style === 'dashed') return [10, 5];
    if (style === 'dotted') return [2, 5];
    return [];
  };

  return (
    <div className="w-full h-screen bg-gray-50 overflow-hidden">
      <Stage
        width={stageSize.width} height={stageSize.height}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        ref={stageRef} draggable={(activeTool as string) === 'hand'}
        style={{ cursor: activeTool === 'hand' ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair' }}
      >
        <Layer>
          {elements.map((el) => {
            const commonProps: any = {
              id: el.id, x: el.x, y: el.y, stroke: el.stroke, strokeWidth: el.strokeWidth,
              fill: el.fill, rotation: el.rotation, opacity: el.opacity ?? 1,
              dash: getDash(el.strokeStyle),
              lineJoin: el.edges === 'round' ? 'round' : 'miter',
              lineCap: el.edges === 'round' ? 'round' : 'butt',
              draggable: (activeTool as string) === 'select',
              onDragEnd: handleDragEnd, onTransformEnd: handleTransformEnd,
              onClick: (e: any) => {
                if ((activeTool as string) === 'select') {
                  const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
                  if (!metaPressed && !selectedIds.includes(el.id)) setSelectedIds([el.id]);
                  else if (metaPressed && selectedIds.includes(el.id)) setSelectedIds(selectedIds.filter(sid => sid !== el.id));
                  else if (metaPressed) setSelectedIds([...selectedIds, el.id]);
                }
              }
            };

            if (el.type === 'rectangle') return <Rect key={el.id} {...commonProps} width={el.width ?? 0} height={el.height ?? 0} cornerRadius={el.edges === 'round' ? 10 : 0} />;
            if (el.type === 'circle') return <Circle key={el.id} {...commonProps} radius={el.radius ?? 0} />;
            if (el.type === 'diamond') return <RegularPolygon key={el.id} {...commonProps} sides={4} radius={el.radius ?? 0} />;
            if (el.type === 'triangle') return <RegularPolygon key={el.id} {...commonProps} sides={3} radius={el.radius ?? 0} />;
            if (el.type === 'line' || el.type === 'pencil') return <Line key={el.id} {...commonProps} points={el.points || []} tension={el.type === 'pencil' ? 0.5 : 0} />;
            if (el.type === 'arrow') return <Arrow key={el.id} {...commonProps} points={el.points || []} fill={el.stroke} pointerAtEnding={el.arrowheads} />;
            if (el.type === 'text') return <Text key={el.id} {...commonProps} fill={el.stroke} text={el.text ?? ''} fontSize={el.fontSize ?? 20} fontFamily={el.fontFamily ?? 'Sans-serif'} fontStyle="500" align={el.textAlign ?? 'left'} width={el.width ?? 0} height={el.height ?? 0} onDblClick={(e) => handleTextInput(el.x, el.y, el.id, el.text ?? '')} />;
            if (el.type === 'image') return <ImageElement key={el.id} el={el} activeTool={activeTool} {...commonProps} />;
            return null;
          })}

          {newElement && (
            <>
              {newElement.type === 'rectangle' && (
                <Rect
                  x={newElement.x} y={newElement.y} width={newElement.width ?? 0} height={newElement.height ?? 0}
                  stroke={newElement.stroke} strokeWidth={newElement.strokeWidth}
                  fill={newElement.fill} opacity={newElement.opacity ?? 0.5}
                  dash={getDash(newElement.strokeStyle)}
                  cornerRadius={newElement.edges === 'round' ? 10 : 0}
                />
              )}
              {newElement.type === 'circle' && (
                <Circle
                  x={newElement.x} y={newElement.y} radius={newElement.radius ?? 0}
                  stroke={newElement.stroke} strokeWidth={newElement.strokeWidth}
                  fill={newElement.fill} opacity={newElement.opacity ?? 0.5}
                  dash={getDash(newElement.strokeStyle)}
                />
              )}
              {newElement.type === 'triangle' && (
                <RegularPolygon
                  x={newElement.x} y={newElement.y} sides={3} radius={newElement.radius ?? 0}
                  stroke={newElement.stroke} strokeWidth={newElement.strokeWidth}
                  fill={newElement.fill} opacity={newElement.opacity ?? 0.5}
                  dash={getDash(newElement.strokeStyle)}
                />
              )}
              {newElement.type === 'diamond' && (
                <RegularPolygon
                  x={newElement.x} y={newElement.y} sides={4} radius={newElement.radius ?? 0}
                  stroke={newElement.stroke} strokeWidth={newElement.strokeWidth}
                  fill={newElement.fill} opacity={newElement.opacity ?? 0.5}
                  dash={getDash(newElement.strokeStyle)}
                />
              )}
              {(newElement.type === 'line' || newElement.type === 'pencil' || newElement.type === 'arrow') && (
                <Line
                  x={newElement.x} y={newElement.y} points={newElement.points || []}
                  stroke={newElement.stroke} strokeWidth={newElement.strokeWidth}
                  opacity={newElement.opacity ?? 0.5}
                  dash={getDash(newElement.strokeStyle)}
                  tension={newElement.type === 'pencil' ? 0.5 : 0}
                />
              )}
            </>
          )}

          {selectionBox.visible && <Rect x={selectionBox.x} y={selectionBox.y} width={selectionBox.width} height={selectionBox.height} fill="rgba(0, 161, 255, 0.3)" stroke="#00a1ff" strokeWidth={1} />}
          {selectedIds.length > 0 && activeTool === 'select' && <Transformer ref={transformerRef} />}
        </Layer>
      </Stage>
    </div>
  );
};

