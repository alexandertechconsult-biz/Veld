import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TasksScreen from './TasksScreen';
import { NavigationProvider } from '../app/navigationContext';
import { db } from '../data';

// TasksScreen talks to the singleton database; start each test from empty.
beforeEach(async () => {
  await db.tasks.clear();
  await db.livestock.clear();
  await db.fields.clear();
  await db.enterprises.clear();
  await db.farms.clear();
});

function renderScreen() {
  return render(
    <NavigationProvider value={() => {}}>
      <TasksScreen />
    </NavigationProvider>,
  );
}

async function seedFarm(): Promise<void> {
  await db.farms.add({ id: 'f1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' });
}

/** Seed a farm with one field the link picker can offer. */
async function seedFarmWithField(): Promise<void> {
  await seedFarm();
  await db.enterprises.add({
    id: 'e1',
    createdAt: 1,
    updatedAt: 1,
    farmId: 'f1',
    type: 'crop',
    name: 'Maize block',
  });
  await db.fields.add({
    id: 'field1',
    createdAt: 1,
    updatedAt: 1,
    enterpriseId: 'e1',
    name: 'North field',
    cropType: 'Maize',
  });
}

describe('TasksScreen', () => {
  it('directs the farmer to Settings when no farm exists', async () => {
    renderScreen();
    expect(
      await screen.findByText('No farm yet. Set up your farm in Settings, then add your tasks.'),
    ).toBeInTheDocument();
  });

  it('creates a task from just a title and lists it', async () => {
    await seedFarm();
    renderScreen();

    const button = await screen.findByRole('button', { name: 'Add task' });
    fireEvent.change(screen.getByTestId('task-title-input'), {
      target: { value: 'Fix the north fence' },
    });
    fireEvent.click(button);

    await screen.findByText('Task added.');
    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(list).toHaveTextContent('Fix the north fence');
    // The form clears so the farmer can add another.
    await waitFor(() => expect(screen.getByTestId('task-title-input')).toHaveValue(''));
    const stored = await db.tasks.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ title: 'Fix the north fence', status: 'open' });
  });

  it('disables Add task until a title is entered', async () => {
    await seedFarm();
    renderScreen();
    expect(await screen.findByRole('button', { name: 'Add task' })).toBeDisabled();

    fireEvent.change(screen.getByTestId('task-title-input'), { target: { value: 'Order feed' } });
    expect(screen.getByRole('button', { name: 'Add task' })).toBeEnabled();
  });

  it('captures assignee and due date and shows them in the list', async () => {
    await seedFarm();
    renderScreen();

    fireEvent.change(await screen.findByTestId('task-title-input'), {
      target: { value: 'Move cattle' },
    });
    fireEvent.change(screen.getByTestId('task-assignee-input'), { target: { value: 'Themba' } });
    fireEvent.change(screen.getByTestId('task-due-input'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));

    await screen.findByText('Task added.');
    const stored = await db.tasks.toArray();
    expect(stored[0]).toMatchObject({ title: 'Move cattle', assignee: 'Themba' });
    expect(stored[0].dueDate).toBe(new Date('2026-10-01').getTime());
    const list = screen.getByRole('list', { name: 'Tasks' });
    expect(list).toHaveTextContent('Themba');
  });

  it('links a task to a field via the picker', async () => {
    await seedFarmWithField();
    renderScreen();

    fireEvent.change(await screen.findByTestId('task-title-input'), {
      target: { value: 'Spray weeds' },
    });
    fireEvent.change(screen.getByTestId('task-link-select'), { target: { value: 'field:field1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));

    await screen.findByText('Task added.');
    const stored = await db.tasks.toArray();
    expect(stored[0]).toMatchObject({ title: 'Spray weeds', fieldId: 'field1' });
    const list = screen.getByRole('list', { name: 'Tasks' });
    expect(list).toHaveTextContent('North field');
  });

  it('hides the link picker when the farm has no fields or animals', async () => {
    await seedFarm();
    renderScreen();
    await screen.findByRole('button', { name: 'Add task' });
    expect(screen.queryByTestId('task-link-select')).not.toBeInTheDocument();
  });
});
