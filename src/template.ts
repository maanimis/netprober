import type { IPResult, TextGenerator } from "./types.js";

export const genPingText: TextGenerator = (result: IPResult) => {
  const line = `[${result.host}] ${result.ip} ${result.provider} \n`;
  return line;
};

export const genPortText: TextGenerator = (result: IPResult) => {
  const line = `[${result.host}] ${result.ip} ${result.provider} Port=${result.ports.join(",")} \n`;
  return line;
};

export const genCurlText: TextGenerator = (result: IPResult) => {
  const curlFlag = result.curlOk
    ? "HTTPS-OK"
    : result.curlHttp
      ? "HTTPS-FAIL"
      : globalThis.config.curl
        ? "HTTPS-SKIP"
        : "HTTPS-OFF";
  const line = `[${result.host}] ${result.ip} ${result.provider} ${curlFlag}  ${result.curlHttp || "curl-n/a"}\n`;
  return line;
};
