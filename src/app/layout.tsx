import type { Metadata } from "next"
import { Epilogue, Manrope, Space_Grotesk } from "next/font/google"

import { AppShell } from "@/components/app-shell"
import "./globals.css"

const fontHeadline = Epilogue({
  variable: "--font-epilogue",
  subsets: ["latin"],
  display: "swap",
})

const fontBody = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
})

const fontLabel = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "GUB",
  description: "Game hub",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${fontHeadline.variable} ${fontBody.variable} ${fontLabel.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col font-sans">
        <div className="relative z-10 flex min-h-dvh flex-1 flex-col">
          <AppShell>{children}</AppShell>
        </div>
      </body>
    </html>
  )
}
