import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerRoot } from 'brandlyframes';
import Root from './src/Root';

registerRoot(Root);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
