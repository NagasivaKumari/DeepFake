import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const saveToLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to local storage', error);
  }
};

const loadFromLocalStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load from local storage', error);
    return null;
  }
};

const LayoutEditor = () => {
  const [widgets, setWidgets] = useState(() => {
    const savedWidgets = loadFromLocalStorage('dashboard-widgets');
    return savedWidgets || [
      { id: '1', content: 'Widget 1' },
      { id: '2', content: 'Widget 2' },
      { id: '3', content: 'Widget 3' },
    ];
  });

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const reorderedWidgets = Array.from(widgets);
    const [removed] = reorderedWidgets.splice(result.source.index, 1);
    reorderedWidgets.splice(result.destination.index, 0, removed);

    setWidgets(reorderedWidgets);
    saveToLocalStorage('dashboard-widgets', reorderedWidgets);
  };

  useEffect(() => {
    saveToLocalStorage('dashboard-widgets', widgets);
  }, [widgets]);

  return (
    <div className="layout-editor">
      <h2>Layout Editor</h2>
      <p>Drag and drop widgets to customize your dashboard layout.</p>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="widgets">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={{ border: '1px dashed #ccc', padding: '20px' }}
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
                        margin: '10px 0',
                        background: '#f9f9f9',
                        border: '1px solid #ddd',
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

export default LayoutEditor;