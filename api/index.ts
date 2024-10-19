import { handle } from 'hono/vercel'
// import { handle } from '@hono/node-server/vercel'
export const runtime = 'edge'
import app from "../dist/index.js"


export const GET = handle(app.app)
export const POST = handle(app.app)
export const PUT = handle(app.app)
export const DELETE = handle(app.app)
export const PATCH = handle(app.app)
