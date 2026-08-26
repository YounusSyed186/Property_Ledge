'use client';

import { useState, useEffect } from 'react';
import { EntityListPage } from '@/components/dashboard/EntityListPage';
import { CompactKpiCard, HubTabs } from '@/components/workspace';
import { createEntityDrawer } from '@/components/dashboard/entities/createEntityDrawer';
import { taskFields, taskColumns } from '@/components/dashboard/entities/config';
import { usePropertyContext } from '@/components/property/PropertyContext';
import {
  fetchDashboardTasks,
  handleCreateTask,
  handleUpdateTask,
  handleDeleteTask,
} from '@/app/actions/dashboard';

const TaskDrawer = createEntityDrawer('Task', taskFields, {
  onCreate: handleCreateTask,
  onUpdate: handleUpdateTask,
  onDelete: handleDeleteTask,
}, { status: 'pending', priority: 'medium' });

const TASK_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'My Tasks' },
  { value: 'completed', label: 'Completed' },
];

export default function TasksPage() {
  const { selectedProperty } = usePropertyContext();
  const [taskTab, setTaskTab] = useState('all');
  const [rows, setRows] = useState<Array<{ id: string; status?: string }>>([]);

  useEffect(() => {
    if (!selectedProperty) return;
    fetchDashboardTasks(selectedProperty.propertyId).then(setRows);
  }, [selectedProperty?.propertyId]);

  const pendingCount = rows.filter((r) => r.status === 'pending' || r.status === 'in_progress').length;
  const completedCount = rows.filter((r) => r.status === 'completed').length;

  return (
    <EntityListPage
      title="Tasks"
      description="Track property tasks and follow-ups."
      entityLabel="task"
      entityLabelPlural="tasks"
      fetchAction={fetchDashboardTasks}
      columnDefs={taskColumns}
      DrawerComponent={TaskDrawer}
      clientFilter={(row) => {
        const status = String((row as { status?: string }).status);
        if (taskTab === 'all') return true;
        if (taskTab === 'pending') return status === 'pending' || status === 'in_progress';
        return status === 'completed';
      }}
      summary={
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <CompactKpiCard label="Total Tasks" value={rows.length} />
            <CompactKpiCard label="Open" value={pendingCount} />
            <CompactKpiCard label="Completed" value={completedCount} />
          </div>
          <HubTabs tabs={TASK_TABS} value={taskTab} onChange={setTaskTab} />
        </div>
      }
    />
  );
}
