import React, { useState } from 'react';
import { Package, Download, Terminal, CheckCircle2, FileCode, Copy, Check, ShieldCheck, GitBranch, Cpu } from 'lucide-react';

export const ApkBuildViewer: React.FC = () => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const [selectedFile, setSelectedFile] = useState<string>('manifest');

  const filesContent: Record<string, { path: string; language: string; content: string }> = {
    manifest: {
      path: 'app/src/main/AndroidManifest.xml',
      language: 'xml',
      content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-feature
        android:name="android.hardware.telephony"
        android:required="false" />
    <uses-permission android:name="android.permission.BROADCAST_STICKY" />
    <uses-permission android:name="android.permission.MANAGE_OWN_CALLS" />
    <queries>
        <package android:name="me.weishu.kernelsu" />
    </queries>
    <application
        android:appComponentFactory=".MyAppComponentFactory"
        android:icon="@android:drawable/sym_def_app_icon"
        android:label="@string/app_name"
        android:theme="@android:style/Theme.DeviceDefault"
        android:supportsRtl="true">
        <activity android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        <service android:name=".MyInCallService"
            android:permission="android.permission.BIND_INCALL_SERVICE"
            android:exported="true">
            <meta-data android:name="android.telecom.CLASS_EXISTENCE_CHECK"
                android:value="true" />
            <intent-filter>
                <action android:name="android.telecom.InCallService"/>
            </intent-filter>
        </service>
        <service android:name=".MyConnectionService"
            android:permission="android.permission.BIND_TELECOM_CONNECTION_SERVICE">
            <intent-filter>
                <action android:name="android.telecom.ConnectionService" />
            </intent-filter>
        </service>
    </application>
</manifest>`,
    },
    buildGradleApp: {
      path: 'app/build.gradle',
      language: 'groovy',
      content: `plugins {
    id 'com.android.application'
}

def compileSdkVersion = project.findProperty('compileSdk')?.toInteger() ?: 35
def targetSdkVersion = project.findProperty('targetSdk')?.toInteger() ?: 35
def minSdkVersion = project.findProperty('minSdk')?.toInteger() ?: 31

android {
    namespace 'org.lsposed.lspromise'
    compileSdk compileSdkVersion

    defaultConfig {
        applicationId "org.lsposed.lspromise"
        minSdk minSdkVersion
        targetSdk targetSdkVersion
        versionCode 1
        versionName "1.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        ndk {
            abiFilters 'arm64-v8a'
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.debug
        }
        debug {
            debuggable true
            jniDebuggable true
        }
    }

    externalNativeBuild {
        cmake {
            path("src/main/jni/CMakeLists.txt")
            version "3.22.1"
        }
    }

    packaging {
        jniLibs {
            useLegacyPackaging = true
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig true
    }
}`,
    },
    workflow: {
      path: '.github/workflows/build.yml',
      language: 'yaml',
      content: `name: Build and Compile

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build-apk:
    name: Build Android APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Java JDK
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
          cache: 'gradle'

      - name: Setup Android SDK & NDK
        uses: android-actions/setup-android@v3

      - name: Install Android Build Tools & NDK
        run: |
          yes | sdkmanager --licenses || true
          sdkmanager "platforms;android-35" "build-tools;35.0.0" "cmake;3.22.1" "ndk;27.0.12077973"

      - name: Set gradlew permissions
        run: chmod +x ./gradlew

      - name: Build Debug & Release APK
        run: ./gradlew assembleDebug assembleRelease --stacktrace

      - name: Upload Debug APK
        uses: actions/upload-artifact@v4
        with:
          name: LSPromise-Debug-APK
          path: app/build/outputs/apk/debug/*.apk
          retention-days: 30`,
    },
    cmake: {
      path: 'app/src/main/jni/CMakeLists.txt',
      language: 'cmake',
      content: `cmake_minimum_required(VERSION 3.22)
project(exp)

enable_language(ASM)

set(CMAKE_ASM_FLAGS "\${CMAKE_ASM_FLAGS} -I\${CMAKE_SOURCE_DIR}")
set(CMAKE_C_FLAGS "\${CMAKE_C_FLAGS} \${C_FLAGS} -I\${CMAKE_SOURCE_DIR} -Wall -Wextra -Wmost -fno-stack-protector -fomit-frame-pointer")

add_library(exp SHARED exp.c stage1.S elf_parser.c)
target_link_libraries(exp log)`,
    },
    mainActivity: {
      path: 'app/src/main/java/org/lsposed/lspromise/MainActivity.java',
      language: 'java',
      content: `package org.lsposed.lspromise;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Parcel;
import android.telecom.PhoneAccount;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

public class MainActivity extends Activity {
    private static final String TAG = "LSPromise";
    private IBinder controller;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.main);
        // Extracts ksud and prepares TelecomManager PhoneAccount
    }

    public void runUserspaceExploit(View view) {
        TelecomManager telecomManager = getSystemService(TelecomManager.class);
        Bundle extras = new Bundle();
        extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, phoneAccountHandle);
        telecomManager.addNewIncomingCall(phoneAccountHandle, extras);
    }
}`,
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                Full-Fledged Android APK Project
              </span>
              <span className="text-xs text-zinc-500 font-mono">Gradle 8.11 / AGP 8.8 / CMake NDK</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Compile LSPromise Native Android APK
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              The repository contains the complete, compilable Android source code tree (<code className="text-zinc-300 font-mono">app/</code>, Gradle wrapper, AndroidManifest, JNI C/Assembly files, and precompiled <code className="text-zinc-300 font-mono">dirtyfrag.ko</code>). You can compile it locally with Gradle/Android Studio or via the automated GitHub Actions CI workflow.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300">
              <span className="text-zinc-500">Package: </span>org.lsposed.lspromise
            </div>
          </div>
        </div>

        {/* Build Quick Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 font-mono">Option 1: GitHub Actions CI</span>
              <GitBranch className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Push to GitHub or trigger <code className="text-zinc-300 font-mono">workflow_dispatch</code>. The workflow automatically builds and uploads <code className="text-zinc-200 font-mono">LSPromise-Debug-APK</code> as an artifact.
            </p>
            <div className="pt-2 text-[11px] font-mono text-zinc-500">
              Workflow: .github/workflows/build.yml
            </div>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 font-mono">Option 2: Command Line (Gradle)</span>
              <Terminal className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Clone repo on machine with JDK 17/21 and Android NDK installed, then run the build command.
            </p>
            <div className="flex items-center justify-between bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800 text-[11px] font-mono text-zinc-300">
              <code>./gradlew assembleDebug</code>
              <button
                onClick={() => copyToClipboard('./gradlew assembleDebug', 'cmd1')}
                className="text-zinc-400 hover:text-white cursor-pointer ml-2"
              >
                {copiedCmd === 'cmd1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 font-mono">Option 3: Android Studio</span>
              <Cpu className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Open the repository root in Android Studio (Ladybug / Iguana or later). It will auto-sync Gradle and CMake NDK.
            </p>
            <div className="pt-2 text-[11px] font-mono text-zinc-500">
              Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Android Project Source Viewer */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-zinc-900 px-6 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Android Source Files Tree</h3>
          </div>

          {/* File selector pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'manifest', label: 'AndroidManifest.xml' },
              { id: 'buildGradleApp', label: 'app/build.gradle' },
              { id: 'cmake', label: 'CMakeLists.txt' },
              { id: 'mainActivity', label: 'MainActivity.java' },
              { id: 'workflow', label: 'build.yml (Actions)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFile(f.id)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                  selectedFile === f.id
                    ? 'bg-zinc-800 text-white border border-emerald-500/80 shadow-xs'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 bg-zinc-900 px-4 py-2 rounded-t-xl border border-zinc-800">
            <span>{filesContent[selectedFile].path}</span>
            <button
              onClick={() => copyToClipboard(filesContent[selectedFile].content, 'fileContent')}
              className="flex items-center gap-1 text-zinc-400 hover:text-white cursor-pointer"
            >
              {copiedCmd === 'fileContent' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Copy Source</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 bg-black rounded-b-xl border border-t-0 border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed max-h-[460px] scrollbar-thin select-text">
            <code>{filesContent[selectedFile].content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
