import { registerWebModule, NativeModule } from 'expo';

class ExpoScreenTimeModule extends NativeModule<{}> {}

export default registerWebModule(ExpoScreenTimeModule, 'ExpoScreenTimeModule');
