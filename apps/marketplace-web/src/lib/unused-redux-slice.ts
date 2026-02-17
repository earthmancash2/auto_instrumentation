/**
 * UNUSED Redux Slice
 * TODO: Remove after completing migration to Zustand
 * Left over from old state management approach
 */

// This file is not imported anywhere but still exists in the codebase
// Represents realistic tech debt

export interface UserState {
  currentUser: any | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  isLoading: false,
  error: null,
};

// Old Redux actions (no longer used)
export const userActions = {
  setUser: (user: any) => ({ type: 'user/setUser', payload: user }),
  clearUser: () => ({ type: 'user/clearUser' }),
  setLoading: (loading: boolean) => ({ type: 'user/setLoading', payload: loading }),
};

// Old reducer (no longer used)
export function userReducer(state = initialState, action: any): UserState {
  switch (action.type) {
    case 'user/setUser':
      return { ...state, currentUser: action.payload, isLoading: false };
    case 'user/clearUser':
      return { ...state, currentUser: null };
    case 'user/setLoading':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// TODO: Remove this file completely once we confirm Zustand is working everywhere
