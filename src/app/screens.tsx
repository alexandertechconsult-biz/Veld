import type { ComponentType } from 'react';
import type { RouteId } from './navigation';
import HomeScreen from '../screens/HomeScreen';
import LivestockScreen from '../screens/LivestockScreen';
import CropsScreen from '../screens/CropsScreen';
import TasksScreen from '../screens/TasksScreen';
import MoreScreen from '../screens/MoreScreen';
import FinancialsScreen from '../screens/FinancialsScreen';
import SettingsScreen from '../screens/SettingsScreen';

/** One screen component per route. Adding a route means adding an entry here. */
export const SCREENS: Record<RouteId, ComponentType> = {
  home: HomeScreen,
  livestock: LivestockScreen,
  crops: CropsScreen,
  tasks: TasksScreen,
  more: MoreScreen,
  financials: FinancialsScreen,
  settings: SettingsScreen,
};
