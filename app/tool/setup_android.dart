// One-time Android setup. Run from the app folder:
//   dart run tool/setup_android.dart --org com.yourcompany
// It creates the android/ and ios/ folders (if missing) and applies what Zajel needs:
// FlutterFragmentActivity (fingerprint unlock), minSdk 23, permissions, release signing from android/key.properties,
// and the launcher icons. Safe to run more than once.
import 'dart:io';

void main(List<String> args) async {
  final i = args.indexOf('--org');
  final org = i >= 0 && i + 1 < args.length ? args[i + 1] : 'com.example';

  if (!Directory('android').existsSync()) {
    await _run('flutter', ['create', '--org', org, '--project-name', 'zajel', '--platforms', 'android,ios', '.']);
  }

  // 1. local_auth needs FlutterFragmentActivity.
  final main = Directory('android/app/src/main').listSync(recursive: true).whereType<File>().where((f) => f.path.endsWith('MainActivity.kt')).toList();
  for (final f in main) {
    var s = f.readAsStringSync();
    s = s.replaceAll('import io.flutter.embedding.android.FlutterActivity\n', 'import io.flutter.embedding.android.FlutterFragmentActivity\n');
    s = s.replaceAll(': FlutterActivity()', ': FlutterFragmentActivity()');
    if (!s.contains('FlutterFragmentActivity')) {
      s = s.replaceFirst(RegExp(r'class MainActivity\s*:\s*\w+\(\)'), 'class MainActivity : io.flutter.embedding.android.FlutterFragmentActivity()');
    }
    f.writeAsStringSync(s);
    _ok('MainActivity uses FlutterFragmentActivity');
  }

  // 2. minSdk 23 and release signing.
  final kts = File('android/app/build.gradle.kts');
  final groovy = File('android/app/build.gradle');
  if (kts.existsSync()) {
    var s = kts.readAsStringSync();
    s = s.replaceAll(RegExp(r'minSdk\s*=\s*flutter\.minSdkVersion'), 'minSdk = 23');
    s = s.replaceAll('ndkVersion = flutter.ndkVersion', 'ndkVersion = "27.0.12077973"');
    if (!s.contains('keystoreProperties')) {
      s = 'import java.io.FileInputStream\nimport java.util.Properties\n\n$s';
      final pluginsEnd = s.indexOf('}', s.indexOf('plugins')) + 1;
      s = '${s.substring(0, pluginsEnd)}\n\nval keystoreProperties = Properties().apply {\n    val f = rootProject.file("key.properties")\n    if (f.exists()) load(FileInputStream(f))\n}\n${s.substring(pluginsEnd)}';
      s = s.replaceFirst('    buildTypes {', '''    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String?
            keyPassword = keystoreProperties["keyPassword"] as String?
            storeFile = (keystoreProperties["storeFile"] as String?)?.let { file(it) }
            storePassword = keystoreProperties["storePassword"] as String?
        }
    }

    buildTypes {''');
      s = s.replaceAll('signingConfig = signingConfigs.getByName("debug")',
          'signingConfig = if (keystoreProperties.isEmpty) signingConfigs.getByName("debug") else signingConfigs.getByName("release")');
    }
    kts.writeAsStringSync(s);
    _ok('build.gradle.kts: minSdk 23 and release signing');
  } else if (groovy.existsSync()) {
    var s = groovy.readAsStringSync();
    s = s.replaceAll(RegExp(r'minSdkVersion\s+flutter\.minSdkVersion'), 'minSdkVersion 23');
    s = s.replaceAll(RegExp(r'minSdk\s*=\s*flutter\.minSdkVersion'), 'minSdk = 23');
    groovy.writeAsStringSync(s);
    _ok('build.gradle: minSdk 23 (add release signing by hand, see README)');
  }

  // 3. Google services (Firebase) Gradle plugin and config file.
  final settingsKts = File('android/settings.gradle.kts');
  if (settingsKts.existsSync()) {
    var g = settingsKts.readAsStringSync();
    if (!g.contains('com.google.gms.google-services')) {
      g = g.replaceFirstMapped(RegExp(r'\n\s*id\("com\.android\.application"\)[^\n]*'),
          (m) => '${m[0]}\n    id("com.google.gms.google-services") version "4.4.2" apply false');
      settingsKts.writeAsStringSync(g);
    }
  }
  if (kts.existsSync()) {
    var g = kts.readAsStringSync();
    if (!g.contains('com.google.gms.google-services')) {
      g = g.replaceFirst('    id("com.android.application")', '    id("com.android.application")\n    id("com.google.gms.google-services")');
      kts.writeAsStringSync(g);
    }
  }
  final gs = File('firebase/google-services.json');
  if (gs.existsSync()) gs.copySync('android/app/google-services.json');
  _ok('Firebase Gradle plugin and google-services.json');

  // 3b. Some plugins (Agora's iris_method_channel) still compile against an old Android SDK; raise it for all libraries.
  final rootKts = File('android/build.gradle.kts');
  if (rootKts.existsSync()) {
    var g = rootKts.readAsStringSync();
    if (!g.contains('zajel-compile-sdk')) {
      const fix = '''
// zajel-compile-sdk: build every Android library against a recent SDK.
subprojects {
    afterEvaluate {
        if (plugins.hasPlugin("com.android.library")) {
            extensions.configure<com.android.build.gradle.LibraryExtension>("android") { compileSdk = 36 }
        }
    }
    // Release lint of third-party plugins is not useful here and can crash on older JDKs.
    tasks.matching { it.name.startsWith("lintVital") }.configureEach { enabled = false }
}
''';
      final at = g.indexOf('subprojects {\n    project.evaluationDependsOn');
      g = at >= 0 ? g.substring(0, at) + fix + '\n' + g.substring(at) : g + fix;
      rootKts.writeAsStringSync(g);
    }
  }
  _ok('compileSdk 36 for all Android libraries');

  // 4. Permissions.
  final manifest = File('android/app/src/main/AndroidManifest.xml');
  var m = manifest.readAsStringSync();
  const perms = [
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.MODIFY_AUDIO_SETTINGS',
    'android.permission.BLUETOOTH_CONNECT',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.USE_BIOMETRIC',
  ];
  final add = perms.where((p) => !m.contains('"$p"')).map((p) => '    <uses-permission android:name="$p"/>\n').join();
  if (add.isNotEmpty) m = m.replaceFirst('    <application', '$add    <application');
  // Zajel has no screen sharing: drop the screen-capture permissions that Agora's SDK would merge in,
  // so Google Play does not ask for a foreground-service (media projection) declaration.
  if (!m.contains('xmlns:tools')) {
    m = m.replaceFirst('<manifest xmlns:android="http://schemas.android.com/apk/res/android"',
        '<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:tools="http://schemas.android.com/tools"');
  }
  const removed = [
    'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
    'android.permission.SYSTEM_ALERT_WINDOW',
  ];
  final rm = removed.where((p) => !m.contains('"$p" tools:node')).map((p) => '    <uses-permission android:name="$p" tools:node="remove"/>\n').join();
  if (rm.isNotEmpty) m = m.replaceFirst('    <application', '$rm    <application');
  manifest.writeAsStringSync(m);
  _ok('AndroidManifest permissions');

  // 4b. Leave out Agora's screen-sharing extension (its service needs the media projection permission).
  if (kts.existsSync()) {
    var s = kts.readAsStringSync();
    if (!s.contains('full-screen-sharing')) {
      s += '\nconfigurations.all {\n    exclude(group = "io.agora.rtc", module = "full-screen-sharing")\n}\n';
      kts.writeAsStringSync(s);
    }
  }
  _ok('Agora screen sharing excluded');

  // 4c. Keep Agora's classes in the shrunk release build (its native code calls them by name).
  File('android/app/proguard-rules.pro').writeAsStringSync('''-keep class io.agora.** { *; }
-dontwarn io.agora.**
-keep class com.google.firebase.** { *; }
''');
  if (kts.existsSync()) {
    var s = kts.readAsStringSync();
    if (!s.contains('proguard-rules.pro')) {
      s = s.replaceFirst(
          'signingConfig = if (keystoreProperties.isEmpty) signingConfigs.getByName("debug") else signingConfigs.getByName("release")',
          'signingConfig = if (keystoreProperties.isEmpty) signingConfigs.getByName("debug") else signingConfigs.getByName("release")\n'
              '            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")');
      kts.writeAsStringSync(s);
    }
  }
  _ok('release keeps Agora classes');

  // 5. Launcher icons.
  await _run('dart', ['run', 'flutter_launcher_icons']);
  _ok('Done. Next: flutterfire configure (see README).');
}

Future<void> _run(String cmd, List<String> args) async {
  stdout.writeln('> $cmd ${args.join(' ')}');
  final p = await Process.start(cmd, args, runInShell: true, mode: ProcessStartMode.inheritStdio);
  final code = await p.exitCode;
  if (code != 0) {
    stderr.writeln('$cmd failed ($code)');
    exit(code);
  }
}

void _ok(String s) => stdout.writeln('✓ $s');
