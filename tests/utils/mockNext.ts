export function createMockReqRes(method: string, {
  url = '/',
  headers = {},
  body = undefined as any,
  query = {} as Record<string, any>,
} = {}) {
  const req: any = {
    method,
    url,
    headers,
    body,
    query,
  };
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string,string>,
    body: undefined as any,
    setHeader: (k: string, v: string) => { res.headers[k.toLowerCase()] = v; },
    status: (code: number) => { res.statusCode = code; return res; },
    json: (obj: any) => { res.body = obj; return res; },
    end: (text?: string) => { res.body = text; return res; },
  };
  return { req, res };
}
