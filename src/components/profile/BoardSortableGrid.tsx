import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardItem } from "@/hooks/useBoards";
import BoardItemTile from "./BoardItemTile";

interface Props {
  items: BoardItem[];
  sortable: boolean;
  canRemove: (item: BoardItem) => boolean;
  canPin: boolean;
  onOpen: (item: BoardItem) => void;
  onRemove: (id: number) => void;
  onPin: (item: BoardItem) => void;
  onReorder: (ids: number[]) => void;
}

const SortableTile = ({ item, children }: { item: BoardItem; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, touchAction: "manipulation" }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};

const BoardSortableGrid = ({ items, sortable, canRemove, canPin, onOpen, onRemove, onPin, onReorder }: Props) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  );

  const handleEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex).map((i) => i.id));
  };

  const tile = (item: BoardItem) => (
    <BoardItemTile item={item} canRemove={canRemove(item)} canPin={canPin} onOpen={onOpen} onRemove={onRemove} onPin={onPin} />
  );

  if (!sortable) {
    return (
      <div className="columns-2 gap-3 px-4 pb-28">
        {items.map((item) => <div key={item.id} className="mb-3 break-inside-avoid anim-card-in">{tile(item)}</div>)}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 px-4 pb-28 items-start">
          {items.map((item) => <SortableTile key={item.id} item={item}>{tile(item)}</SortableTile>)}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default BoardSortableGrid;
