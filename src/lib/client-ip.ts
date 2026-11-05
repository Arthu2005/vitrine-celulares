/** A hospedagem grava x-real-ip. Em x-forwarded-for, só o último valor é confiável: os anteriores vêm do visitante. */
export function requestIp(headers: Headers) {
  return headers.get('x-real-ip')?.trim() || headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'local'
}
