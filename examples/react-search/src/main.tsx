import '@mantine/core/styles.css';
import ReactDOM from 'react-dom/client';
import './debug'; // import before the app!
import { App } from './app';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
