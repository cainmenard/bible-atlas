// Panel Navigation — three-level drill-down: Book → Chapter → Verse

export type DrillLevel = 'book' | 'chapter' | 'verse';

export interface PanelNavigationState {
  level: DrillLevel;
  selectedBook: string | null;
  selectedChapter: number | null;
  selectedVerse: number | null;
  history: Array<{
    level: DrillLevel;
    book: string | null;
    chapter: number | null;
  }>;
  animationDirection: 'forward' | 'back';
}

export type PanelNavigationAction =
  | { type: 'INIT_BOOK'; book: string }
  | { type: 'SELECT_BOOK'; book: string }
  | { type: 'SELECT_CHAPTER'; chapter: number }
  | { type: 'CHANGE_CHAPTER'; chapter: number }
  | { type: 'SELECT_VERSE'; verse: number }
  | { type: 'GO_BACK' }
  | { type: 'GO_TO_LEVEL'; level: DrillLevel }
  | { type: 'RESET' };

export const initialPanelNavigationState: PanelNavigationState = {
  level: 'book',
  selectedBook: null,
  selectedChapter: null,
  selectedVerse: null,
  history: [],
  animationDirection: 'forward',
};

export function panelNavigationReducer(
  state: PanelNavigationState,
  action: PanelNavigationAction,
): PanelNavigationState {
  switch (action.type) {
    case 'INIT_BOOK': {
      // Initial book selection from visualization — stay at book level
      return {
        ...initialPanelNavigationState,
        level: 'book',
        selectedBook: action.book,
      };
    }

    case 'SELECT_BOOK': {
      // Navigate to a different book (e.g. connected book click) — stay at book level
      return {
        ...state,
        level: 'book',
        selectedBook: action.book,
        selectedChapter: null,
        selectedVerse: null,
        history: [
          ...state.history,
          { level: state.level, book: state.selectedBook, chapter: state.selectedChapter },
        ],
        animationDirection: 'forward',
      };
    }

    case 'SELECT_CHAPTER': {
      // Drill from book → chapter level
      return {
        ...state,
        level: 'chapter',
        selectedChapter: action.chapter,
        selectedVerse: null,
        history: [
          ...state.history,
          { level: state.level, book: state.selectedBook, chapter: state.selectedChapter },
        ],
        animationDirection: 'forward',
      };
    }

    case 'CHANGE_CHAPTER': {
      // Swap chapter in-place without pushing history — used by chevron
      // navigation and dot-click cross-reference jumps.
      return {
        ...state,
        level: 'chapter',
        selectedChapter: action.chapter,
        selectedVerse: null,
        animationDirection: 'forward',
      };
    }

    case 'SELECT_VERSE': {
      // Drill from chapter → verse level
      return {
        ...state,
        level: 'verse',
        selectedVerse: action.verse,
        history: [
          ...state.history,
          { level: state.level, book: state.selectedBook, chapter: state.selectedChapter },
        ],
        animationDirection: 'forward',
      };
    }

    case 'GO_BACK': {
      if (state.history.length === 0) {
        return { ...initialPanelNavigationState };
      }
      const history = [...state.history];
      const previous = history.pop()!;
      return {
        ...state,
        level: previous.level,
        selectedBook: previous.book,
        selectedChapter: previous.chapter,
        selectedVerse: null,
        history,
        animationDirection: 'back',
      };
    }

    case 'GO_TO_LEVEL': {
      const targetLevel = action.level;

      if (targetLevel === 'book') {
        return {
          ...state,
          level: 'book',
          selectedBook: state.selectedBook,
          selectedChapter: null,
          selectedVerse: null,
          history: [],
          animationDirection: 'back',
        };
      }

      if (targetLevel === 'chapter') {
        // Keep only history entries up to book level
        const trimmedHistory = state.history.length > 0 ? [state.history[0]] : [];
        return {
          ...state,
          level: 'chapter',
          selectedVerse: null,
          history: trimmedHistory,
          animationDirection: 'back',
        };
      }

      // targetLevel === 'verse' — already at deepest, no change needed
      return state;
    }

    case 'RESET': {
      return { ...initialPanelNavigationState };
    }
  }
}

export function getBreadcrumbItems(
  state: PanelNavigationState,
): Array<{ label: string; level: DrillLevel }> {
  const items: Array<{ label: string; level: DrillLevel }> = [];

  if (!state.selectedBook) return items;

  items.push({ label: state.selectedBook, level: 'book' });

  if (state.level === 'chapter' && state.selectedChapter !== null) {
    items.push({ label: `Chapter ${state.selectedChapter}`, level: 'chapter' });
  }

  if (state.level === 'verse') {
    if (state.selectedChapter !== null) {
      items.push({ label: `${state.selectedChapter}`, level: 'chapter' });
    }
    if (state.selectedVerse !== null) {
      items.push({ label: `${state.selectedVerse}`, level: 'verse' });
    }
  }

  return items;
}

export function getScriptureReference(state: PanelNavigationState): string {
  if (!state.selectedBook) return '';

  if (state.selectedChapter === null) {
    return state.selectedBook;
  }

  if (state.selectedVerse === null) {
    return `${state.selectedBook} ${state.selectedChapter}`;
  }

  return `${state.selectedBook} ${state.selectedChapter}:${state.selectedVerse}`;
}
