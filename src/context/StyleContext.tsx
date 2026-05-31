import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Variation } from '../data/types';

interface StyleContextValue {
  variation: Variation;
  setVariation: (v: Variation) => void;
}

const StyleContext = createContext<StyleContextValue>({
  variation: 'a',
  setVariation: () => {},
});

export function StyleProvider({ children }: { children: ReactNode }) {
  const [variation, setVariation] = useState<Variation>('a');
  return (
    <StyleContext.Provider value={{ variation, setVariation }}>
      {children}
    </StyleContext.Provider>
  );
}

export function useStyle() {
  return useContext(StyleContext);
}
