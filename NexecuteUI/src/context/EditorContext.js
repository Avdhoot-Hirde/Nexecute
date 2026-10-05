import { createContext, useContext } from 'react';

export const EditorContext = createContext(null);

export function useEditor() {
  const context = useContext(EditorContext);

  if (!context) {
    throw new Error('useEditor must be used within EditorProvider');
  }

  return context;
}
