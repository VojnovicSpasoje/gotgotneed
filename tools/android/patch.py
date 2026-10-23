# Hardens the Android project that "npx cap add android" generates. Runs on GitHub Actions after
# `cap add`; fails loudly if the generated files ever change shape, so nothing is silently skipped.
import os, re, sys

A = 'android'
def rd(p): return open(os.path.join(A, p)).read()
def wr(p, s): os.makedirs(os.path.dirname(os.path.join(A, p)), exist_ok=True); open(os.path.join(A, p), 'w').write(s)
def need(cond, what):
    if not cond: sys.exit('patch.py: could not ' + what)

# 1. Manifest: HTTPS only, own network rules, no storage/media permissions, no WebView reload on resize.
m = rd('app/src/main/AndroidManifest.xml')
if 'xmlns:tools' not in m:
    m = m.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ', 1)
need('<application' in m, 'find <application>')
m = re.sub(r'<application\b', '<application android:usesCleartextTraffic="false" android:networkSecurityConfig="@xml/network_security_config"', m, count=1)
for perm in ['READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'READ_MEDIA_AUDIO',
             'CAMERA', 'RECORD_AUDIO', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'READ_CONTACTS', 'POST_NOTIFICATIONS']:
    m = re.sub(r'\s*<uses-permission android:name="android\.permission\.' + perm + r'"[^>]*/>', '', m)
    m = m.replace('</manifest>', '    <uses-permission android:name="android.permission.' + perm + '" tools:node="remove" />\n</manifest>')
need('android.permission.INTERNET' in m, 'find INTERNET permission')
m = re.sub(r'android:configChanges="([^"]*)"', lambda x: 'android:configChanges="' + (x.group(1) if 'density' in x.group(1) else x.group(1) + '|density') + '"', m, count=1)
wr('app/src/main/AndroidManifest.xml', m)

# 2. Network: encrypted connections only, trust only the phone's built-in certificates.
wr('app/src/main/res/xml/network_security_config.xml', '''<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors><certificates src="system" /></trust-anchors>
    </base-config>
</network-security-config>
''')

# 3. Release build: shrink + optimise (R8), sign with the upload key when it is provided.
g = rd('app/build.gradle')
need(re.search(r'minifyEnabled\s*=?\s*false', g), 'find minifyEnabled in app/build.gradle')
g = re.sub(r'minifyEnabled\s*=?\s*false', 'minifyEnabled = true\n            shrinkResources = true', g, count=1)
g = g.replace("getDefaultProguardFile('proguard-android.txt')", "getDefaultProguardFile('proguard-android-optimize.txt')")
need(re.search(r'\n\s*buildTypes\s*\{', g), 'find buildTypes')
g = re.sub(r'(\n\s*)buildTypes\s*\{', r'''\1signingConfigs {
        upload {
            if (System.getenv("GGN_KEYSTORE")) {
                storeFile = file(System.getenv("GGN_KEYSTORE"))
                storePassword = System.getenv("GGN_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("GGN_KEY_ALIAS")
                keyPassword = System.getenv("GGN_KEY_PASSWORD")
            }
        }
    }\1buildTypes {''', g, count=1)
g = re.sub(r'(release\s*\{)', r'\1\n            signingConfig = System.getenv("GGN_KEYSTORE") ? signingConfigs.upload : signingConfigs.debug\n            debuggable = false', g, count=1)
vc, vn = os.environ.get('GGN_VERSION_CODE'), os.environ.get('GGN_VERSION_NAME')
if vc: g = re.sub(r'versionCode\s*=?\s*\d+', 'versionCode = ' + vc, g, count=1)
if vn: g = re.sub(r'versionName\s*=?\s*"[^"]*"', 'versionName = "' + vn + '"', g, count=1)
wr('app/build.gradle', g)

# Keep rules so R8 doesn't strip what the app's bridge finds by name.
pr = rd('app/proguard-rules.pro') if os.path.exists(os.path.join(A, 'app/proguard-rules.pro')) else ''
pr += '''
# GotGotNeed: Capacitor bridge and plugins are looked up at runtime.
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.plugins.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
'''
wr('app/proguard-rules.pro', pr)

# 4. Our small native helper (bar colour) replaces the generated MainActivity.
import glob, shutil
acts = glob.glob(os.path.join(A, 'app/src/main/java/**/MainActivity.java'), recursive=True)
need(len(acts) == 1 and acts[0].replace(os.sep, '/').endswith('app/gotgotneed/MainActivity.java'), 'find MainActivity in app/gotgotneed (found ' + str(acts) + ')')
for f in ('MainActivity.java', 'BarColorPlugin.java'):
    shutil.copy(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'java', f), os.path.dirname(acts[0]))

v = rd('variables.gradle')
t = re.search(r'targetSdkVersion\s*=\s*(\d+)', v)
need(t and int(t.group(1)) >= 36, 'confirm targetSdkVersion >= 36 (found ' + (t.group(1) if t else '?') + ')')
print('patch.py: manifest, network, release build hardened; targetSdk', t.group(1))
