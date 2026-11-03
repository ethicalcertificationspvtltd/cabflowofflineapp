/* global jest */

jest.mock('react-native-get-random-values', () => ({}));

jest.mock('react-native-keychain', () => {
  let store = null;
  return {
    setGenericPassword: jest.fn(async (_u, password) => {
      store = password;
      return {service: 'cabflo.auditor.tokens', storage: 'mock'};
    }),
    getGenericPassword: jest.fn(async () =>
      store
        ? {username: 'cabflo', password: store, service: 'cabflo.auditor.tokens'}
        : false,
    ),
    resetGenericPassword: jest.fn(async () => {
      store = null;
      return true;
    }),
  };
});

jest.mock('react-native-mmkv', () => {
  class MMKV {
    constructor() {
      this.map = new Map();
    }
    getString(key) {
      return this.map.get(key);
    }
    set(key, value) {
      this.map.set(key, String(value));
    }
    delete(key) {
      this.map.delete(key);
    }
    clearAll() {
      this.map.clear();
    }
    getAllKeys() {
      return [...this.map.keys()];
    }
  }
  return {MMKV};
});

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(async () => ({isConnected: true, isInternetReachable: true})),
  },
}));

jest.mock('react-native-screens', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    enableScreens: jest.fn(),
    Screen: View,
    ScreenContainer: View,
    NativeScreen: View,
    NativeScreenContainer: View,
    ScreenStack: View,
    ScreenStackHeaderConfig: View,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    SafeAreaProvider: ({children}) => React.createElement(View, null, children),
    SafeAreaView: View,
    useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
  };
});
