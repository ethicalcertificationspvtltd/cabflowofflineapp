import React from 'react';
import {StatusBar} from 'react-native';
import {AppProviders} from './src/app/providers/AppProviders';
import {RootNavigator} from './src/app/navigation/RootNavigator';
import {colors} from './src/shared/ui/theme';

function App(): React.JSX.Element {
  return (
    <AppProviders>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
      <RootNavigator />
    </AppProviders>
  );
}

export default App;
