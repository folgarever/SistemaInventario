import type { Request, Response } from 'express';

// Doble sencillo de Express para probar middlewares sin levantar un servidor.
export function crearRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (codigo: number) => {
    res.statusCode = codigo;
    return res;
  };
  res.json = (cuerpo: unknown) => {
    res.body = cuerpo;
    return res;
  };
  return res as Response & { statusCode: number; body: any };
}

export function crearReq(extra: Record<string, unknown> = {}): Request {
  return {
    headers: {},
    query: {},
    ip: '127.0.0.1',
    method: 'GET',
    baseUrl: '',
    path: '/',
    ...extra,
  } as unknown as Request;
}
