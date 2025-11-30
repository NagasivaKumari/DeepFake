import React, { useState } from 'react';

type Task = {
  id: number;
  title: string;
  completed: boolean;
};

const TaskManager = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: 'Complete project documentation', completed: false },
    { id: 2, title: 'Review pull requests', completed: true },
    { id: 3, title: 'Plan team meeting', completed: false },
  ]);

  const toggleTaskCompletion = (id: number) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  return (
    <div className="task-manager" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Task Manager</h2>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} style={{ marginBottom: '10px' }}>
            <label>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTaskCompletion(task.id)}
              />
              {task.title}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskManager;