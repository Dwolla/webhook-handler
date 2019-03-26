export type Partitions = Readonly<[Res[], Res[]]>

export type Event = Readonly<{
  id: string
  url: string
  topic: string
  body: string
  signatureSha256?: string
  timestamp: string
}>

export type Req = Readonly<{
  event: Event
  retryCnt: number
  requeueUntil: number
  requeue: boolean
}>

export type Res = Readonly<{
  req: Req
  httpReq?: IHttpReq
  httpRes?: IHttpRes
  err?: string
}>

export type Header = Readonly<{
  name: string
  value: string
}>

type Http = Readonly<{
  headers: Header[]
  body: string
  timestamp: string
}>

export interface IHttpReq extends Http {
  url: string
}

export interface IHttpRes extends Http {
  statusCode: number
}

export interface IHttp {
  statusCode?: number
}
