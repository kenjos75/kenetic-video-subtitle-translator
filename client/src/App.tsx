

import Home from './pages/home';
import NotFound from '@/pages/not-found';

import { Route, Routes } from 'react-router-dom';


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}


