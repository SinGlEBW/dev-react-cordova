export class CordovaConfig{
  private static isPlatform (platform: 'Android' | 'iOS') {
    return  window?.device?.platform === platform
  }
  static isAndroid () {
    return CordovaConfig.isPlatform('Android');
  }
  static isIOS () {
    return CordovaConfig.isPlatform('iOS')
  }
  static getPlatform () {
    return window?.device?.platform
  }
  static getPlugins () {
    return window?.cordova?.plugins ? window?.cordova?.plugins : {}
  }
}