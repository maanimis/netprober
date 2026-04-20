export interface Config {
  inputFile: string;
  outputPing: string;
  outputPorts: string;
  resolver: string;
  concurrency: number;
  timeout: number;
  pingCount: number;
  verbose: boolean;
  ping: boolean;
  curl: boolean;
  ports: number[];
}

export interface IPResult {
  host: string;
  ip: string;
  provider: string;
  pingOk: boolean;
  ports: number[];
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
  ports: number;
  curlOk: number;
  dnsFail: number;
  startTime: number;
}

export type TextGenerator = (result: IPResult) => string;
