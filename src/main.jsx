import '@tylertech/forge/dist/forge.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, RadialLinearScale,
  BarElement, PointElement, LineElement, ArcElement,
  Filler, Tooltip, Legend, Title,
  BarController, LineController, ScatterController,
  PolarAreaController,
  DoughnutController,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { defineForgeComponents } from './forge';
import App from './App';

defineForgeComponents();

// Register all Chart.js components used across the application
ChartJS.register(
  CategoryScale, LinearScale, RadialLinearScale,
  BarElement, PointElement, LineElement, ArcElement,
  Filler, Tooltip, Legend, Title,
  BarController, LineController, ScatterController,
  PolarAreaController,
  DoughnutController,
  annotationPlugin,
);

// Global Chart.js defaults aligned with Forge tokens
ChartJS.defaults.font.family = 'Roboto, sans-serif';
ChartJS.defaults.font.size   = 11;
ChartJS.defaults.color       = 'rgba(0,0,0,0.6)'; // --forge-theme-text-medium

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
);
