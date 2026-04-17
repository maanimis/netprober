export interface Config {
  inputFile: string;
  outputFile: string;
  outputPing: string;
  outputPorts: string;
  resolver: string;
  concurrency: number;
  timeout: number;
  pingCount: number;
  verbose: boolean;
  ping: boolean;
  curl: boolean;
}

export interface IPResult {
  ip: string;
  pingOk: boolean;
  port443Ok: boolean;
  curlOk: boolean;
  curlHttp: string;
  curlInfo: string;
}

export interface HostResult {
  host: string;
  ips: IPResult[];
  digErr: string;
}

export interface Stats {
  totalHosts: number;
  doneHosts: number;
  totalIps: number;
  doneIps: number;
  pingUp: number;
  port443Ok: number;
  curlOk: number;
  dnsFail: number;
  startTime: number;
}
