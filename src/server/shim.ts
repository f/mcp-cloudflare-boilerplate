import { HonoRequest } from "hono";

/**
 * Creates a Node.js-style IncomingMessage mock from a Hono request
 */
export function createNodeRequest(c: { req: HonoRequest }, requestBody?: unknown) {
  return {
    method: c.req.method,
    url: c.req.url,
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    body: requestBody,
    on: () => {},
    once: () => {},
    emit: () => {},
    removeListener: () => {},
  };
}

/**
 * Creates a Node.js-style ServerResponse mock that captures response data
 * Returns both the mock response object and a promise that resolves when the response is complete
 */
export function createNodeResponse() {
  let responseData: any = null;
  let responseStatus = 200;
  let responseHeaders: Record<string, string> = {};
  let responseEnded = false;

  let resolveResponse: (response: { data: string; status: number; headers: Record<string, string> }) => void;
  
  const responsePromise = new Promise<{ data: string; status: number; headers: Record<string, string> }>((resolve) => {
    resolveResponse = resolve;
  });

  const res = {
    writeHead: (status: number, headers?: Record<string, string>) => {
      responseStatus = status;
      if (headers) Object.assign(responseHeaders, headers);
      return res;
    },
    setHeader: (name: string, value: string) => {
      responseHeaders[name] = value;
      return res;
    },
    end: (data?: string) => {
      if (data) responseData = data;
      responseEnded = true;
      
      // Resolve the promise when response ends
      resolveResponse({
        data: responseData || '',
        status: responseStatus,
        headers: responseHeaders
      });
      
      return res;
    },
    write: (data: string) => {
      if (!responseData) responseData = '';
      responseData += data;
      return true;
    },
    flushHeaders: () => {
      return res;
    },
    on: (event: string, callback: Function) => {
      // Handle close events for cleanup
      if (event === 'close') {
        // Store the callback but don't call it immediately
      }
      return res;
    },
    removeListener: () => {},
    get headersSent() { return responseEnded; }
  };

  return {
    response: res,
    responsePromise,
    getResponseData: () => ({ data: responseData, status: responseStatus, headers: responseHeaders })
  };
}

/**
 * Waits for a response with timeout protection
 */
export async function waitForResponse(
  responsePromise: Promise<{ data: string; status: number; headers: Record<string, string> }>,
  timeoutMs: number = 10000
) {
  return Promise.race([
    responsePromise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Response timeout')), timeoutMs)
    )
  ]);
} 