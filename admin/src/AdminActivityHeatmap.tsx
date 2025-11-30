import React from 'react';
import { HeatMapGrid } from 'react-grid-heatmap';

const data = new Array(7) // 7 rows for days of the week
  .fill(0)
  .map(() => new Array(24).fill(0).map(() => Math.floor(Math.random() * 100))); // 24 columns for hours

const AdminActivityHeatmap = () => {
  return (
    <div className="admin-activity-heatmap" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Activity Heatmap</h2>
      <HeatMapGrid
        data={data}
        xLabels={Array.from({ length: 24 }, (_, i) => `${i}:00`)}
        yLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
        cellStyle={(x, y, value) => ({ background: `rgb(66, 135, 245, ${value / 100})` })}
        cellHeight="20px"
        cellWidth="20px"
        xLabelsStyle={() => ({ fontSize: '10px' })}
        yLabelsStyle={() => ({ fontSize: '10px' })}
      />
    </div>
  );
};

export default AdminActivityHeatmap;