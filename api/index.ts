// export const runtime = 'edge'
import app from "../dist/index.js"

// import { Hono } from 'hono'
import { handle } from '@hono/node-server/vercel'



export default handle(app.app as any)