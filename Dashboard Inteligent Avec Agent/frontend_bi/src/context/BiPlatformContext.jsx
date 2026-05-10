import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';

const LS_HEALTH = 'bi_data_health';
const LS_GLOBAL = 'bi_global_dashboard';
const LS_CHAT = 'bi_chat_dashboard';

function readLs(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function initialFromStorage() {
  if (typeof window === 'undefined') {
    return {
      dataHealth: null,
      globalDashboard: null,
      chatDashboard: null,
    };
  }
  return {
    dataHealth: readLs(LS_HEALTH, null),
    globalDashboard: readLs(LS_GLOBAL, null),
    chatDashboard: readLs(LS_CHAT, null),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'setUploadResult': {
      const { dataHealth, dashboard } = action.payload;
      localStorage.setItem(LS_HEALTH, JSON.stringify(dataHealth ?? null));
      localStorage.setItem(LS_GLOBAL, JSON.stringify(dashboard ?? []));
      return {
        ...state,
        dataHealth: dataHealth ?? null,
        globalDashboard: dashboard ?? [],
      };
    }
    case 'setChatDashboard': {
      const dash = action.payload ?? [];
      localStorage.setItem(LS_CHAT, JSON.stringify(dash));
      return { ...state, chatDashboard: dash };
    }
    default:
      return state;
  }
}

const BiPlatformContext = createContext(null);

export function BiPlatformProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialFromStorage);

  const setUploadResult = useCallback((payload) => {
    dispatch({ type: 'setUploadResult', payload });
  }, []);

  const setChatDashboard = useCallback((dashboard) => {
    dispatch({ type: 'setChatDashboard', payload: dashboard });
  }, []);

  const value = useMemo(
    () => ({
      dataHealth: state.dataHealth,
      globalDashboard: state.globalDashboard,
      chatDashboard: state.chatDashboard,
      setUploadResult,
      setChatDashboard,
    }),
    [
      state.dataHealth,
      state.globalDashboard,
      state.chatDashboard,
      setUploadResult,
      setChatDashboard,
    ],
  );

  return (
    <BiPlatformContext.Provider value={value}>
      {children}
    </BiPlatformContext.Provider>
  );
}

export function useBiPlatform() {
  const ctx = useContext(BiPlatformContext);
  if (!ctx) {
    throw new Error('useBiPlatform doit être utilisé sous BiPlatformProvider');
  }
  return ctx;
}
