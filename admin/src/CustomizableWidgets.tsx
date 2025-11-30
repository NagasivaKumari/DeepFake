import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const CustomizableWidgets = () => {
  const [widgets, setWidgets] = useState([
    { id: '1', content: 'Widget 1' },
    { id: '2', content: 'Widget 2' },
    { id: '3', content: 'Widget 3' },
  ]);

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const reorderedWidgets = Array.from(widgets);
    const [removed] = reorderedWidgets.splice(result.source.index, 1);
    reorderedWidgets.splice(result.destination.index, 0, removed);

    setWidgets(reorderedWidgets);
  };

  return (
    <div>
      <h2>Customizable Widgets</h2>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="widgets">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={{
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#f9f9f9',
              }}
            >
              {widgets.map((widget, index) => (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        padding: '10px',
                        marginBottom: '10px',
                        backgroundColor: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        ...provided.draggableProps.style,
                      }}
                    >
                      {widget.content}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default CustomizableWidgets;