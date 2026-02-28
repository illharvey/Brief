import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  // Protect all routes except: API routes, Next.js internals, static assets, favicon
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
