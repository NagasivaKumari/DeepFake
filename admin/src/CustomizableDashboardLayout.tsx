import React, { useState } from 'react';

const CustomizableDashboardLayout = () => {
  const [widgets, setWidgets] = useState([
    { id: 1, name: 'Widget 1' },
    { id: 2, name: 'Widget 2' },
    { id: 3, name: 'Widget 3' },
  ]);

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('widgetId', id);
  };

  const handleDrop = (e) => {
    const widgetId = e.dataTransfer.getData('widgetId');
    const widget = widgets.find((w) => w.id === parseInt(widgetId));
    if (widget) {
      setWidgets((prev) => prev.filter((w) => w.id !== widget.id).concat(widget));
    }
  };

  return (
    <div className="customizable-dashboard-layout">
      <h2>Customizable Dashboard Layout</h2>
      <div
        className="drop-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{ border: '1px dashed #ccc', padding: '20px', minHeight: '200px' }}
      >
        <p>Drag and drop widgets here</p>
        {widgets.map((widget) => (
          <div
            key={widget.id}
            draggable
            onDragStart={(e) => handleDragStart(e, widget.id)}
            style={{ margin: '10px', padding: '10px', border: '1px solid #000' }}
          >
            {widget.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomizableDashboardLayout;