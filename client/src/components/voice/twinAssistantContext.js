import { createContext, useContext } from 'react';

export const TwinAssistantContext = createContext(null);

export function useTwinAssistant() {
  return useContext(TwinAssistantContext);
}
