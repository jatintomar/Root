export type PrivilegeLevel = 'untrusted_app' | 'system_server' | 'network_stack' | 'init' | 'root';

export type ExploitPhase = 
  | 'idle'
  | 'preparing_ksud'
  | 'userspace_telecom'
  | 'system_server_injection'
  | 'network_stack_binder'
  | 'patching_vendor_mod'
  | 'patching_libc'
  | 'patching_cxx'
  | 'triggering_orphan'
  | 'loading_kernel_module'
  | 'selinux_permissive'
  | 'kernelsu_active';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'exploit';
  tag: string;
  message: string;
}

export interface DeviceProfile {
  id: string;
  name: string;
  model: string;
  androidVersion: string;
  kernelVersion: string;
  buildId: string;
  securityPatch: string;
  isVulnerable: boolean;
  notes: string;
}

export interface ExploitStepInfo {
  id: string;
  title: string;
  subtitle: string;
  targetProcess: string;
  targetUid: string;
  selinuxDomain: string;
  cve?: string;
  description: string;
  vulnerabilityDetail: string;
  codeSnippet: string;
  language: string;
}
