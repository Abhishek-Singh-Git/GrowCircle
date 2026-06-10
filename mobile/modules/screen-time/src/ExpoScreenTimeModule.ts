import { NativeModule, requireNativeModule } from 'expo';

declare class ExpoScreenTimeModule extends NativeModule<{}> {}

export default requireNativeModule<ExpoScreenTimeModule>('ExpoScreenTime');
